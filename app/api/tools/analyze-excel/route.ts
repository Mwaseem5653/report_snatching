import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import JSZip from "jszip";
import { checkAndDeductTokens, checkAndDeductEyeconTokens } from "@/lib/tokenHelper";
import { deleteFileFromStorageServer } from "@/lib/storageAdmin";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

// --- Helper: Fetch SIM Info ---
async function fetchSimInfo(phoneNumber: string) {
    try {
        const apiUrl = "https://simdataupdates.com/wp-admin/admin-ajax.php";
        const params = new URLSearchParams({ action: "fetch_sim_data", term: phoneNumber });
        const res = await fetch(`${apiUrl}?${params.toString()}`, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": "https://simdataupdates.com/",
                "X-Requested-With": "XMLHttpRequest",
            }
        });
        if (!res.ok) return null;
        const text = await res.text();
        if (!text) return null;
        const data = JSON.parse(text);
        if (data.success && data.data && data.data.length > 0) return data.data[0];
        return null;
    } catch (e) { return null; }
}

// --- Helper: Fetch Eyecon Info ---
async function fetchEyeconInfo(number: string, code = "92") {
    const rapidApiKey = process.env.RAPID_API_KEY;
    if (!rapidApiKey) return null;
    
    const cleanNumber = number.replace(/^0+/, "");
    const fullUrl = `https://eyecon.p.rapidapi.com/api/v1/search?code=${code}&number=${cleanNumber}`;
    
    try {
        const res = await fetch(fullUrl, {
            method: 'GET',
            headers: { 
                "x-rapidapi-key": rapidApiKey, 
                "x-rapidapi-host": "eyecon.p.rapidapi.com",
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });
        
        if (!res.ok) return null;
        const data = await res.json();

        // 1. Extract Names (Exhaustive & Robust)
        const names = new Set<string>();
        let facebook = "";
        let photo = "";

        const processItem = (item: any) => {
            if (!item) return;
            const fname = item.fullName || item.name;
            if (fname) names.add(fname);
            if (Array.isArray(item.otherNames)) {
                item.otherNames.forEach((o: any) => {
                    const n = typeof o === 'string' ? o : o.name;
                    if (n) names.add(n);
                });
            }
            if (!photo && item.photo) photo = item.photo;
            if (!facebook && item.facebookID?.url) facebook = item.facebookID.url;
        };

        if (Array.isArray(data)) {
            data.forEach(processItem);
        } else {
            processItem(data);
            if (data.data) {
                if (Array.isArray(data.data)) data.data.forEach(processItem);
                else processItem(data.data);
            }
        }

        if (names.size === 0) return null;
        const finalName = Array.from(names).join(" | ");

        // 2. Extract Image URL (Priority Logic)
        let image_url = photo;

        const getImagesUrl = (d: any) => {
            if (d && Array.isArray(d.images)) {
                for (const imgEntry of d.images) {
                    if (imgEntry && imgEntry.pictures && typeof imgEntry.pictures === 'object') {
                        const pics = imgEntry.pictures;
                        return pics["200"] || pics["600"] || Object.values(pics)[0] || "";
                    }
                }
            }
            return "";
        };

        if (!image_url || !String(image_url).startsWith("http")) {
            image_url = getImagesUrl(data) || getImagesUrl(data.data) || image_url;
        }

        // Fallback to Base64
        if (!image_url || !String(image_url).startsWith("http")) {
            const rawB64 = data.b64 || (data.data && data.data.b64);
            if (rawB64) {
                image_url = String(rawB64).startsWith("data:image") ? rawB64 : `data:image/jpeg;base64,${rawB64}`;
            }
        }

        return {
            name: finalName,
            image: image_url,
            facebook: facebook
        };
    } catch (e: any) { 
        return null; 
    }
}

// --- Helper: Normalize Number ---
function normalizeNumber(num: any): string | null {
    if (num === null || num === undefined || num === "") return null;
    
    let s: string;
    if (typeof num === 'number') {
        s = num.toFixed(0);
    } else {
        s = String(num).trim();
        if (s.includes('E') || s.includes('e')) {
            const n = Number(s);
            if (!isNaN(n)) s = n.toFixed(0);
        }
    }

    s = s.replace(/\.0$/, ""); 
    s = s.replace(/\D/g, "");
    
    if (s.length === 12 && s.startsWith("923")) {
        s = s.substring(2);
    } else if (s.length === 11 && s.startsWith("03")) {
        s = s.substring(1);
    }
    
    if (s.length === 10 && s.startsWith("3")) {
        return s;
    }
    return null; 
}

// --- Helper: Exact Call Type Matching ---
function getCallCategory(typeStr: string) {
    const t = typeStr.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
    const IN_CALL = ["incoming", "incoming call", "incomingcall", "call incoming", "callincomig", "voice incoming", "voiceincoming", "incoming voice", "incomingvoice", "mt"];
    const OUT_CALL = ["outgoing", "outgoing call", "outgoingcall", "call outgoing", "calloutgoing", "voice outgoing", "voiceoutgoing", "outgoing voice", "outgoingvoice", "mo"];
    const IN_SMS = ["incoming sms", "incomingsms", "sms incoming", "smsincoming", "mt-sms", "sms-mt"];
    const OUT_SMS = ["outgoing sms", "outgoingsms", "sms outgoing", "smsoutgoing", "mo-sms", "sms-mo"];

    if (IN_SMS.some(k => t === k || t.includes(k))) return "inSms";
    if (OUT_SMS.some(k => t === k || t.includes(k))) return "outSms";
    if (IN_CALL.some(k => t === k || t.includes(k))) return "inCall";
    if (OUT_CALL.some(k => t === k || t.includes(k))) return "outCall";
    return null;
}

// --- Helper: Find Column ---
function findColumn(headers: string[], candidates: string[]): string | null {
    const lowerCandidates = candidates.map(c => c.toLowerCase());
    return headers.find(h => lowerCandidates.includes(h.trim().toLowerCase())) || null;
}

// --- Helper: Find Table Start ---
function findTableHeaders(rows: any[][]) {
    const keywords = ['call', 'type', 'msisdn', 'bnumber', 'a number', 'imei', 'start', 'end', 'party'];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const values = rows[i].map(v => String(v).toLowerCase());
        const matchCount = values.filter(v => keywords.some(k => v.includes(k))).length;
        if (matchCount >= 2) return { index: i, headers: rows[i].map(String) };
    }
    return { index: 0, headers: rows[0].map(String) };
}

// --- Helper: Parse Date ---
function parseExcelDate(val: any, formatHint: "DMY" | "MDY" = "DMY"): Date {
    if (val instanceof Date) return val;
    if (!val) return new Date(0);
    if (typeof val === 'number') {
        const utc_days  = Math.floor(val - 25569);
        const utc_value = utc_days * 86400;                                        
        const date_info = new Date(utc_value * 1000);
        const fractional_day = val - Math.floor(val) + 0.0000001;
        const total_seconds = Math.floor(86400 * fractional_day);
        const seconds = total_seconds % 60;
        const minutes = Math.floor(total_seconds / 60) % 60;
        const hours   = Math.floor(total_seconds / 3600);
        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    }
    
    // Robust String Parsing for DD/MM/YYYY HH:mm:ss
    let s = String(val).trim();
    const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(\s+\d{1,2}:\d{1,2}(:\d{1,2})?)?/);
    if (match) {
        const p1 = parseInt(match[1]);
        const p2 = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        let day, month;
        if (p1 > 12) {
            day = p1; month = p2 - 1;
        } else if (p2 > 12) {
            day = p2; month = p1 - 1;
        } else {
            if (formatHint === "MDY") {
                day = p2; month = p1 - 1;
            } else {
                day = p1; month = p2 - 1;
            }
        }

        let hour = 0, min = 0, sec = 0;
        if (match[4]) {
            const timeParts = match[4].trim().split(':');
            hour = parseInt(timeParts[0]);
            min = parseInt(timeParts[1]);
            sec = timeParts[2] ? parseInt(timeParts[2]) : 0;
        }
        const d = new Date(year, month, day, hour, min, sec);
        if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

// --- Helper: Clean Illegal Characters (Prevent Excel Corruption) ---
function cleanString(val: any): any {
    if (typeof val !== "string") return val;
    // Replace control characters (0x00-0x1F) except for newline (0x0A) and carriage return (0x0D)
    // Also limit length if needed, but the primary cause of corruption is invalid XML characters
    return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

// --- Helper: Make Header Keys Unique (ExcelJS Requirement) ---
function makeUniqueKeys(headers: string[]) {
    const seen = new Map<string, number>();
    return headers.map(h => {
        const cleanH = String(h || "Col").trim();
        const count = seen.get(cleanH) || 0;
        seen.set(cleanH, count + 1);
        return count === 0 ? cleanH : `${cleanH}_${count}`;
    });
}

async function processSingleFile(buffer: ArrayBuffer, options: any) {
    const { topN, eyeconTopN, enableLookup, enableEyecon, enableIntel, includeImages } = options;
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (rawRows.length === 0) return null;

    const { index: headerIndex, headers } = findTableHeaders(rawRows);
    const dataRows = rawRows.slice(headerIndex + 1);
    
    const bCol = findColumn(headers, [
        "B Number", "BNUMBER", "b number", "b party", "b_party", "BParty", 
        "CALL_DIALED_NUM", "DIALED_NUMBER", "Dialled Number", "CONNECTED_NUMBER",
        "Other Party", "OTHER_MSISDN", "Destination Number", "Called Number"
    ]);
    if (!bCol) return null;

    const aCol = findColumn(headers, ["MSISDN", "A Number", "ANUMBER", "a party", "a_party", "AParty", "Subscriber Number", "ORIGINATING_NUMBER", "OWNER_NUMBER"]);
    const dateCol = findColumn(headers, ["CALL_START_DT_TM", "Start Date", "Datetime", "Date", "STRT_TM", "Start Time", "Time"]);
    
    // 🚀 Detect Date Format Hint
    let formatHint: "DMY" | "MDY" = (dateCol?.toLowerCase().trim() === "strt_tm") ? "MDY" : "DMY";
    if (dateCol) {
        const dateIdx = headers.indexOf(dateCol);
        for (const row of dataRows.slice(0, 100)) {
            const val = row[dateIdx];
            if (!val || val instanceof Date) continue;
            const m = String(val).match(/^(\d{1,2})[\/\-](\d{1,2})/);
            if (m) {
                const p1 = parseInt(m[1]);
                const p2 = parseInt(m[2]);
                if (p1 > 12) { formatHint = "DMY"; break; }
                if (p2 > 12) { formatHint = "MDY"; break; }
            }
        }
    }

    const typeCol = findColumn(headers, ["CallType", "CALL_TYPE", "Type", "Usage Type", "Service Type"]);
    const directionCol = findColumn(headers, ["INBOUND_OUTBOUND_IND", "Direction", "Call Direction", "Direct"]);
    const addressCol = findColumn(headers, ["Address", "Location", "Addr", "SITE_ADDRESS", "SiteLocation", "Cell ID Address", "CellAddress", "Cell Name", "Tower", "Site Name"]);
    const imeiCol = findColumn(headers, ["IMEI", "imei", "Imei number", "Device IMEI"]);
    const latCol = findColumn(headers, ["Latitude", "Lat", "LATITUDE", "CELL_LAT", "SITE_LAT", "X_COORD", "GPS_LAT", "LATITUTDE", "LATITUD", "LATITIDE"]);
    const lonCol = findColumn(headers, ["Longitude", "Lon", "Long", "LNG", "LONGITUDE", "CELL_LON", "SITE_LON", "CELL_LONG", "SITE_LONG", "Y_COORD", "GPS_LON", "LONGITUTDE", "LONGITUD", "LONGITIDE", "LANGUTIDE", "LANGITUDE"]);
    const lacCol = findColumn(headers, ["LAC_ID", "LAC", "Lac_Id", "lac"]);
    const cellCol = findColumn(headers, ["Cell_Id", "CELL_ID", "Cell id", "Cell_SITE_ID"]);
    const cellidSpecialCol = findColumn(headers, ["cellid", "cell_id_special", "cellidspecial"]);

    const orgNumCol = findColumn(headers, ["call_org_num", "ORG_NUM", "Originating Number"]);
    const dialedNumCol = findColumn(headers, ["CALL_DIALED_NUM", "DIALED_NUM", "Dialled Number"]);

    // Sort rows chronologically for movement tracking
    const jsonData = dataRows.map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        const rawDate = dateCol ? obj[dateCol] : null;
        obj._rawDateValue = rawDate; // Preserve original value for the formatted sheet
        obj._dateObj = rawDate ? parseExcelDate(rawDate, formatHint) : new Date(0);
        
        // 🚀 Pre-extract LAC/CELL from special hex column if it exists
        if (cellidSpecialCol) {
            let hexVal = String(obj[cellidSpecialCol] || "").trim();
            if (hexVal.toLowerCase().startsWith("0x")) hexVal = hexVal.substring(2);
            
            if (hexVal && hexVal.length >= 4) {
                try {
                    // Jazz/Huawei Hex Format: Full character reversal (Little Endian nibbles)
                    // Excel logic: MID(4,3,2,1) for LAC, MID(8,7,6,5) for CELL
                    
                    // Extract LAC (First 4 chars)
                    const lacPart = hexVal.substring(0, 4);
                    const lacHex = lacPart.split('').reverse().join('');
                    const lacDec = parseInt(lacHex, 16);
                    if (!isNaN(lacDec)) obj._extractedLac = lacDec;
                    
                    // Extract Cell ID (Remaining chars, usually next 4)
                    if (hexVal.length >= 8) {
                        const cellPart = hexVal.substring(4, 8);
                        const cellHex = cellPart.split('').reverse().join('');
                        const cellDec = parseInt(cellHex, 16);
                        if (!isNaN(cellDec)) obj._extractedCell = cellDec;
                    } else if (hexVal.length > 4) {
                        // Fallback for non-standard lengths
                        const cellPart = hexVal.substring(4);
                        const cellHex = cellPart.split('').reverse().join('');
                        const cellDec = parseInt(cellHex, 16);
                        if (!isNaN(cellDec)) obj._extractedCell = cellDec;
                    }
                } catch (e) {}
            }
        }
        return obj;
    }).sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime());

    const mobileSummaryMap = new Map<string, any>();
    const addressSummaryMap = new Map<string, any>();
    const onlyAddressSummaryMap = new Map<string, any>();
    const imeiSummaryMap = new Map<string, any>();
    const callLogMap = new Map<string, any>();
    
    // --- Intelligence Tracking ---
    const nightActivity: any[] = [];
    const mainImeiHistory = new Set<string>();
    const disposableCheck = new Map<string, number>();
    const aPartyNumber = new Set<string>();
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0); // 0=Sun, 1=Mon...
    const locationTimeFreq = new Map<string, number>(); // Key: "Day-Hour-Location"
    const uniqueDates = new Set<string>();
    const dailyMovementMap = new Map<string, any[]>(); // Key: "Date", Value: Array of sequential unique points

    jsonData.forEach((row) => {
        const rawA = aCol ? row[aCol] : null;
        const cleanA = normalizeNumber(rawA);
        
        let finalB: string | null = null;
        if (orgNumCol && dialedNumCol) {
            const cleanOrg = normalizeNumber(row[orgNumCol]);
            const cleanDialed = normalizeNumber(row[dialedNumCol]);
            if (cleanOrg && cleanOrg !== cleanA) finalB = cleanOrg;
            else if (cleanDialed && cleanDialed !== cleanA) finalB = cleanDialed;
        } else if (bCol) {
            finalB = normalizeNumber(row[bCol]);
        }

        let rawAddr = addressCol ? String(row[addressCol] || "").trim() : "";
        let rawLat: any = latCol ? row[latCol] : null;
        let rawLon: any = lonCol ? row[lonCol] : null;
        const rawImei = imeiCol ? String(row[imeiCol] || "").trim() : null;
        const dateObj = row._dateObj;

        // 🚀 PERMANENT SOLUTION: Extract lat/lon from SiteLocation if format matches
        if (addressCol && addressCol.toLowerCase() === 'sitelocation' && rawAddr.includes('|')) {
            const parts = rawAddr.split('|');
            if (parts.length === 3) {
                const potentialLat = parseFloat(parts[1]);
                const potentialLon = parseFloat(parts[2]);
                if (!isNaN(potentialLat) && !isNaN(potentialLon)) {
                    rawAddr = parts[0].trim(); // Use cleaned address
                    rawLat = potentialLat;     // Overwrite lat/lon variables for this row
                    rawLon = potentialLon;
                }
            }
        }
        
        if (cleanA) aPartyNumber.add(cleanA);
        if (rawImei && rawImei !== "None" && rawImei !== "") mainImeiHistory.add(rawImei);

        if (dateObj && dateObj.getTime() > 0) {
            const dStr = dateObj.toISOString().split("T")[0];
            hourlyActivity[dateObj.getHours()]++;
            dailyActivity[dateObj.getDay()]++;
            uniqueDates.add(dStr);
            
            const hasCoords = (rawLat !== null && rawLat !== undefined && rawLat !== "");
            const hasAddr = rawAddr && rawAddr !== "None" && rawAddr !== "";
            
            if (hasAddr || hasCoords) {
                const locationKey = rawAddr || `${rawLat},${rawLon}`;
                const key = `${dateObj.getDay()}-${dateObj.getHours()}-${locationKey}`;
                locationTimeFreq.set(key, (locationTimeFreq.get(key) || 0) + 1);

                const currentMovements = dailyMovementMap.get(dStr) || [];
                const lastMove = currentMovements[currentMovements.length - 1];
                
                if (!lastMove || lastMove.addr !== rawAddr || lastMove.lat !== rawLat || lastMove.lon !== rawLon) {
                    currentMovements.push({
                        time: dateObj.toISOString().substring(11, 19),
                        addr: rawAddr || `Coords: ${rawLat}, ${rawLon}`,
                        lat: rawLat,
                        lon: rawLon
                    });
                    dailyMovementMap.set(dStr, currentMovements);
                }
            }
        }

        if (finalB) {
            disposableCheck.set(finalB, (disposableCheck.get(finalB) || 0) + 1);
            const hour = dateObj.getHours();
            if (dateObj.getTime() > 0 && (hour >= 0 && hour <= 5)) {
                nightActivity.push({ number: finalB, time: dateObj.toISOString().replace("T", " ").substring(0, 19), type: directionCol ? (row[directionCol] || "N/A") : "N/A", location: rawAddr || "N/A" });
            }
            const stats = mobileSummaryMap.get(finalB) || { count: 0, start: dateObj, end: dateObj };
            stats.count++;
            if (dateObj.getTime() > 0) {
                if (stats.start.getTime() === 0 || dateObj < stats.start) stats.start = dateObj;
                if (dateObj > stats.end) stats.end = dateObj;
            }
            mobileSummaryMap.set(finalB, stats);

            const log = callLogMap.get(finalB) || { inSms: 0, outSms: 0, inCall: 0, outCall: 0 };
            const typeStr = `${directionCol ? row[directionCol] : ""} ${typeCol ? row[typeCol] : ""}`;
            const category = getCallCategory(typeStr);
            if (category) log[category]++;
            callLogMap.set(finalB, log);
        }

        // --- Improved Address/Location Summary Logic ---
        const lacVal = row._extractedLac !== undefined ? row._extractedLac : (lacCol ? row[lacCol] : null);
        const cellVal = row._extractedCell !== undefined ? row._extractedCell : (cellCol ? row[cellCol] : null);
        
        // Grouping key: Strictly Cell ID if available, otherwise fallback to Address
        const groupKey = cellVal ? `CELL-${cellVal}` : (rawAddr || null);

        if (groupKey && groupKey !== "None" && groupKey !== "") {
            const stats = addressSummaryMap.get(groupKey) || { count: 0, start: dateObj, end: dateObj, lat: null, lon: null, lac: lacVal, cell: cellVal, addr: rawAddr };
            stats.count++;
            
            if (dateObj.getTime() > 0) {
                if (stats.start.getTime() === 0 || dateObj < stats.start) stats.start = dateObj;
                if (dateObj > stats.end) stats.end = dateObj;
            }
            
            // For a single Cell ID, preserve the first valid LAC, Lat, Lon, and Address encountered
            if (stats.lat === null && rawLat !== null && rawLat !== '') stats.lat = rawLat;
            if (stats.lon === null && rawLon !== null && rawLon !== '') stats.lon = rawLon;
            if (!stats.addr && rawAddr && rawAddr !== "None") stats.addr = rawAddr;
            if (!stats.lac && lacVal) stats.lac = lacVal;
            if (!stats.cell && cellVal) stats.cell = cellVal;

            addressSummaryMap.set(groupKey, stats);
        }

        // --- Strictly Address-Based Summary (For OnlyAddresses Sheet) ---
        if (rawAddr && rawAddr !== "None" && rawAddr !== "") {
            const stats = onlyAddressSummaryMap.get(rawAddr) || { count: 0, start: dateObj, end: dateObj, lat: null, lon: null, lac: lacVal, cell: cellVal };
            stats.count++;
            if (dateObj.getTime() > 0) {
                if (stats.start.getTime() === 0 || dateObj < stats.start) stats.start = dateObj;
                if (dateObj > stats.end) stats.end = dateObj;
            }
            if (rawLat !== null && rawLat !== '' && stats.lat === null) stats.lat = rawLat;
            if (rawLon !== null && rawLon !== '' && stats.lon === null) stats.lon = rawLon;
            if (!stats.lac && lacVal) stats.lac = lacVal;
            if (!stats.cell && cellVal) stats.cell = cellVal;
            onlyAddressSummaryMap.set(rawAddr, stats);
        }

        if (rawImei && rawImei !== "None" && rawImei !== "") {
            const stats = imeiSummaryMap.get(rawImei) || { count: 0, start: dateObj, end: dateObj };
            stats.count++;
            if (dateObj.getTime() > 0) {
                if (stats.start.getTime() === 0 || dateObj < stats.start) stats.start = dateObj;
                if (dateObj > stats.end) stats.end = dateObj;
            }
            imeiSummaryMap.set(rawImei, stats);
        }
    });

    if (mobileSummaryMap.size === 0) return null;

    const mobileSummary = Array.from(mobileSummaryMap.entries()).map(([num, s]) => ({
        "Mobile Number": num, "Count": s.count, 
        "Starting Date": s.start.getTime() > 0 ? s.start : "N/A",
        "Ending Date": s.end.getTime() > 0 ? s.end : "N/A",
        "Eyecon Name": "", "Name": "", "CNIC": "", "Address": ""
    })).sort((a, b) => b.Count - a.Count);

    const cache = new Map<string, any>();
    if (enableLookup) {
        const topSim = mobileSummary.slice(0, topN);
        for (let i = 0; i < topSim.length; i += 2) {
            const batch = topSim.slice(i, i + 2);
            await Promise.all(batch.map(async (rec) => {
                const q = "0" + rec["Mobile Number"];
                const data = await fetchSimInfo(q);
                if (data) {
                    rec["Name"] = data.name; rec["CNIC"] = " " + data.cnic; rec["Address"] = data.address;
                    cache.set(rec["Mobile Number"], { ...cache.get(rec["Mobile Number"]), name: data.name, cnic: data.cnic, address: data.address });
                } else {
                    rec["Name"] = " "; rec["CNIC"] = " "; rec["Address"] = " ";
                    cache.set(rec["Mobile Number"], { ...cache.get(rec["Mobile Number"]), name: " ", cnic: " ", address: " " });
                }
            }));
        }
    }
    if (enableEyecon) {
        const topEye = mobileSummary.slice(0, eyeconTopN);
        const eyeconBatchSize = 5; // To avoid overwhelming the API
        for (let i = 0; i < topEye.length; i += eyeconBatchSize) {
            const batch = topEye.slice(i, i + eyeconBatchSize);
            await Promise.all(batch.map(async (rec) => {
                const eyeData = await fetchEyeconInfo(rec["Mobile Number"]);
                if (eyeData) {
                    rec["Eyecon Name"] = eyeData.name;
                    cache.set(rec["Mobile Number"], { 
                        ...cache.get(rec["Mobile Number"]), eye: eyeData.name, eyeImage: eyeData.image, eyeFb: eyeData.facebook
                    });
                } else {
                    rec["Eyecon Name"] = " ";
                }
            }));
        }
    }

    const outWb = new ExcelJS.Workbook();
    const sRaw = outWb.addWorksheet("Formatted Data");
    
    // Create formatted headers by inserting LAC/CELL after cellidSpecialCol
    const formattedHeaders = [...headers];
    if (cellidSpecialCol) {
        const cellidIdx = formattedHeaders.indexOf(cellidSpecialCol);
        if (cellidIdx !== -1) {
            // Insert after cellidSpecialCol (order: cellid, LAC_ID, CELL_ID)
            const toInsert = [];
            if (!headers.includes("LAC_ID")) toInsert.push("LAC_ID");
            if (!headers.includes("CELL_ID")) toInsert.push("CELL_ID");
            
            if (toInsert.length > 0) {
                formattedHeaders.splice(cellidIdx + 1, 0, ...toInsert);
            }
        }
    }

    // 🚀 CRITICAL FIX: DEDUPLICATE KEYS AND CLEAN STRINGS
    const uniqueKeys = makeUniqueKeys(formattedHeaders);
    sRaw.columns = formattedHeaders.map((h, i) => ({ header: String(h || `Col_${i}`), key: uniqueKeys[i], width: 15 }));

    jsonData.forEach(row => {
        const cleanRow: any = {};
        formattedHeaders.forEach((h, i) => {
            const key = uniqueKeys[i];
            let val: any = null;

            if (h === "LAC_ID" && row._extractedLac !== undefined) {
                val = row._extractedLac;
            } else if (h === "CELL_ID" && row._extractedCell !== undefined) {
                val = row._extractedCell;
            } else if (h === dateCol && row._rawDateValue !== undefined) {
                val = row._rawDateValue;
            } else {
                val = row[h];
                if (!(val instanceof Date)) {
                    val = cleanString(val);
                    const strVal = String(val);
                    if (/^\d{10,}$/.test(strVal)) val = " " + strVal;
                }
            }
            cleanRow[key] = val;
        });
        sRaw.addRow(cleanRow);
    });

    const s1 = outWb.addWorksheet("Mobile Numbers");
    const s1Cols: any[] = [{ header: "Mobile Number", key: "Mobile Number", width: 15 }];
    
    if (enableEyecon) {
        s1Cols.push({ header: "Eyecon Name", key: "Eyecon Name", width: 40 });
        if (includeImages === true) {
            s1Cols.push({ header: "Eyecon Image", key: "eyeImage", width: 15 });
            s1Cols.push({ header: "Facebook Link", key: "eyeFb", width: 15 });
        }
    }

    if (enableLookup) {
        s1Cols.push(
            { header: "Name", key: "Name", width: 25 },
            { header: "CNIC", key: "CNIC", width: 20 },
            { header: "Address", key: "Address", width: 45 }
        );
    }
    
    s1Cols.push(
        { header: "Start", key: "Starting Date", width: 20 },
        { header: "End", key: "Ending Date", width: 20 },
        { header: "Count", key: "Count", width: 10 }
    );
    s1.columns = s1Cols;
    s1.getColumn("Starting Date").numFmt = "yyyy-mm-dd hh:mm:ss";
    s1.getColumn("Ending Date").numFmt = "yyyy-mm-dd hh:mm:ss";

    const safeLink = (url: string) => {
        if (!url || typeof url !== "string") return "";
        // Excel breaks on extremely long URLs or Data URIs in hyperlinks
        if (url.startsWith("data:") || url.length > 2000) return "Image/Link Attached";
        return { text: "Open Link", hyperlink: url };
    };

    mobileSummary.forEach(rec => {
        const num = rec["Mobile Number"];
        const c = cache.get(num) || null;
        const rowData: any = {
            ...rec,
            "Eyecon Name": cleanString(c ? (c.eye || " ") : ""),
            "Name": cleanString(c ? (c.name || " ") : ""),
            "CNIC": cleanString(c ? (c.cnic ? " " + c.cnic : " ") : ""),
            "Address": cleanString(c ? (c.address || " ") : ""),
        };
        if (enableEyecon && includeImages === true) {
            rowData.eyeImage = safeLink(c?.eyeImage);
            rowData.eyeFb = safeLink(c?.eyeFb);
        }
        s1.addRow(rowData);
    });

    const s2 = outWb.addWorksheet("Call Logs");
    const logs = Array.from(callLogMap.entries()).map(([num, log]) => {
        const c = cache.get(num) || null;
        const ms = mobileSummaryMap.get(num);
        const logEntry: any = { 
            num, 
            start: ms.start.getTime() > 0 ? ms.start : "N/A", 
            end: ms.end.getTime() > 0 ? ms.end : "N/A", 
            name: cleanString(c ? (c.name || " ") : ""), 
            eye: cleanString(c ? (c.eye || " ") : ""), 
            cnic: cleanString(c ? (c.cnic ? " " + c.cnic : " ") : ""), 
            addr: cleanString(c ? (c.address || " ") : ""), 
            inS: log.inSms, outS: log.outSms, inC: log.inCall, outC: log.outCall, total: ms.count 
        };
        if (enableEyecon && includeImages === true) {
            logEntry.eyeImage = safeLink(c?.eyeImage);
            logEntry.eyeFb = safeLink(c?.eyeFb);
        }
        return logEntry;
    }).sort((a, b) => b.total - a.total);

    const s2Cols: any[] = [];
    s2Cols.push({ header: "B-Party", key: "num", width: 15 });

    if (enableEyecon) {
        s2Cols.push({ header: "Eyecon", key: "eye", width: 40 });
        if (includeImages === true) {
            s2Cols.push({ header: "Eyecon Image", key: "eyeImage", width: 15 });
            s2Cols.push({ header: "Facebook Link", key: "eyeFb", width: 15 });
        }
    }

    if (enableLookup) {
        s2Cols.push({ header: "Name", key: "name", width: 25 });
        s2Cols.push({ header: "CNIC", key: "cnic", width: 18 });
        s2Cols.push({ header: "Address", key: "addr", width: 45 });
    }

    s2Cols.push({ header: "Start Date", key: "start", width: 20 });
    s2Cols.push({ header: "End Date", key: "end", width: 20 });

    s2Cols.push(
        { header: "In-SMS", key: "inS", width: 10 },
        { header: "Out-SMS", key: "outS", width: 10 },
        { header: "In-Call", key: "inC", width: 10 },
        { header: "Out-Call", key: "outC", width: 10 },
        { header: "Total", key: "total", width: 10 }
    );
    s2.columns = s2Cols;
    s2.getColumn("start").numFmt = "yyyy-mm-dd hh:mm:ss";
    s2.getColumn("end").numFmt = "yyyy-mm-dd hh:mm:ss";
    s2.addRows(logs);

    if (addressSummaryMap.size > 0) {
        const s3 = outWb.addWorksheet("Addresses");
        s3.columns = [
            { header: "CELL_ID", key: "cell", width: 12 }, 
            { header: "LAC_ID", key: "lac", width: 12 }, 
            { header: "Count", key: "count", width: 10 }, 
            { header: "Site Address", key: "addr", width: 60 }, 
            { header: "Latitude", key: "lat", width: 15 }, 
            { header: "Longitude", key: "lon", width: 15 }, 
            { header: "Date From", key: "start", width: 20 }, 
            { header: "Date To", key: "end", width: 20 }
        ];
        s3.getColumn("start").numFmt = "yyyy-mm-dd hh:mm:ss";
        s3.getColumn("end").numFmt = "yyyy-mm-dd hh:mm:ss";
        s3.addRows(Array.from(addressSummaryMap.entries()).map(([k, s]) => ({ 
            addr: cleanString(s.addr) || "N/A", 
            count: s.count, 
            lac: s.lac,
            cell: s.cell,
            lat: s.lat, 
            lon: s.lon, 
            start: s.start.getTime() > 0 ? s.start : "N/A", 
            end: s.end.getTime() > 0 ? s.end : "N/A" 
        })).sort((a, b) => b.count - a.count));
    }

    if (onlyAddressSummaryMap.size > 0) {
        const s3b = outWb.addWorksheet("OnlyAddresses");
        s3b.columns = [
            { header: "Site Address", key: "addr", width: 60 }, 
            { header: "Count", key: "count", width: 10 }, 
            { header: "LAC_ID", key: "lac", width: 12 }, 
            { header: "CELL_ID", key: "cell", width: 12 }, 
            { header: "Latitude", key: "lat", width: 15 }, 
            { header: "Longitude", key: "lon", width: 15 }, 
            { header: "Start", key: "start", width: 20 }, 
            { header: "End", key: "end", width: 20 }
        ];
        s3b.getColumn("start").numFmt = "yyyy-mm-dd hh:mm:ss";
        s3b.getColumn("end").numFmt = "yyyy-mm-dd hh:mm:ss";
        s3b.addRows(Array.from(onlyAddressSummaryMap.entries()).map(([addr, s]) => ({ 
            addr: cleanString(addr), 
            count: s.count, 
            lac: s.lac,
            cell: s.cell,
            lat: s.lat, 
            lon: s.lon, 
            start: s.start.getTime() > 0 ? s.start : "N/A", 
            end: s.end.getTime() > 0 ? s.end : "N/A" 
        })).sort((a, b) => b.count - a.count));
    }
    if (imeiSummaryMap.size > 0) {
        const s4 = outWb.addWorksheet("IMEI Numbers");
        s4.columns = [{ header: "IMEI Number", key: "imei", width: 25 }, { header: "Count", key: "count", width: 10 }, { header: "Start", key: "start", width: 20 }, { header: "End", key: "end", width: 20 }];
        s4.getColumn("start").numFmt = "yyyy-mm-dd hh:mm:ss";
        s4.getColumn("end").numFmt = "yyyy-mm-dd hh:mm:ss";
        s4.addRows(Array.from(imeiSummaryMap.entries()).map(([i, s]) => ({ 
            imei: " " + i, 
            count: s.count, 
            start: s.start.getTime() > 0 ? s.start : "N/A", 
            end: s.end.getTime() > 0 ? s.end : "N/A" 
        })).sort((a, b) => b.count - a.count));
    }

    if (enableIntel) {
        const sIntel = outWb.addWorksheet("Intelligence Report");
        sIntel.columns = [ { key: "label", width: 35 }, { key: "v1", width: 40 }, { key: "v2", width: 25 }, { key: "v3", width: 50 } ];
        const addHeader = (text: string, color: string = "FF1E3A8A") => {
            const row = sIntel.addRow([cleanString(text).toUpperCase()]);
            row.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
            row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
            sIntel.addRow([]);
        };
        const addSubHeader = (text: string) => {
            const row = sIntel.addRow([cleanString(text)]);
            row.font = { bold: true, size: 10, color: { argb: "FF1E3A8A" } };
            row.border = { bottom: { style: "thin" } };
        };
        addHeader("CDR INVESTIGATION INTELLIGENCE SUMMARY", "FF1E3A8A");
        addSubHeader("SUSPECT PROFILE & DEVICE HISTORY");
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const maxDayIndex = dailyActivity.indexOf(Math.max(...dailyActivity));
        sIntel.addRow(["Primary MSISDN(s)", Array.from(aPartyNumber).join(", ") || "N/A"]);
        sIntel.addRow(["Handset IMEI History", Array.from(mainImeiHistory).join(", ") || "N/A"]);
        sIntel.addRow(["Total Days in CDR", uniqueDates.size]);
        sIntel.addRow(["Most Active Day", daysOfWeek[maxDayIndex]]);
        sIntel.addRow(["Total Unique Contacts", mobileSummaryMap.size]);
        sIntel.addRow(["Total Locations Visited", addressSummaryMap.size]);
        sIntel.addRow([]);
        addSubHeader("PATTERN OF LIFE (HOURLY ACTIVITY BREAKDOWN)");
        sIntel.addRow(["Hour", "Activity Count", "Percentage", "Visualization"]);
        const totalCalls = hourlyActivity.reduce((a, b) => a + b, 0);
        const maxActivity = Math.max(...hourlyActivity);
        hourlyActivity.forEach((count, hour) => {
            const pct = totalCalls > 0 ? ((count / totalCalls) * 100).toFixed(1) : "0";
            const bar = "█".repeat(Math.round(count / (totalCalls || 1) * 50));
            const hStr = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
            const row = sIntel.addRow([hStr, count, pct + "%", bar]);
            if (count > 0 && count === maxActivity) {
                row.font = { color: { argb: "FFFF0000" }, bold: true };
            }
        });
        sIntel.addRow([]);
        addHeader("LOCATION-TIME CORRELATION (PREDICTIVE ANALYSIS)", "FF1E3A8A");
        sIntel.addRow(["Where is the suspect most likely to be at a specific time?"]);
        sIntel.addRow(["Day", "Time Window", "Most Frequent Location", "Confidence (Total Hits)"]);
        const groupMap = new Map<string, { loc: string, count: number }>();
        locationTimeFreq.forEach((count, key) => {
            const [day, hour, ...locArr] = key.split("-");
            const loc = locArr.join("-");
            const groupKey = `${day}-${hour}`;
            if (!groupMap.has(groupKey) || count > groupMap.get(groupKey)!.count) {
                groupMap.set(groupKey, { loc, count });
            }
        });
        const sortedGroups = Array.from(groupMap.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 15);
        sortedGroups.forEach(([key, val]) => {
            const [dayIdx, hour] = key.split("-");
            const timeStr = `${hour.padStart(2, '0')}:00 - ${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`;
            sIntel.addRow([daysOfWeek[parseInt(dayIdx)], timeStr, cleanString(val.loc), val.count]);
        });
        sIntel.addRow([]);
        addHeader("SUSPICIOUS NIGHT ACTIVITY (12 AM - 5 AM)", "FF991B1B");
        sIntel.addRow(["Number", "Timestamp", "Type", "Location"]);
        nightActivity.slice(0, 30).forEach(n => { sIntel.addRow([n.number, n.time, n.type, cleanString(n.location)]); });
        if (nightActivity.length === 0) sIntel.addRow(["No suspicious night activity found."]);
        sIntel.addRow([]);
        addHeader("TOP 5 PRIORITY CONTACTS", "FF065F46");
        sIntel.addRow(["Rank", "Mobile Number", "Total Contact Count", "First Seen", "Last Seen"]);
        mobileSummary.slice(0, 5).forEach((m, i) => {
            sIntel.addRow([i + 1, m["Mobile Number"], m["Count"], m["Starting Date"], m["Ending Date"]]);
        });
        sIntel.addRow([]);
        addHeader("DISPOSABLE SIM ALERT (Single-Use Numbers)", "FF854D0E");
        sIntel.addRow(["Criminals often use a SIM once and discard it."]);
        sIntel.addRow(["S.No", "Number", "Contact Timestamp", "Location (if avail)"]);
        let discCount = 0;
        for (const [num, count] of disposableCheck.entries()) {
            if (count === 1 && discCount < 30) {
                const ms = mobileSummaryMap.get(num);
                sIntel.addRow([discCount + 1, num, ms?.start.toISOString().replace("T", " ").substring(0, 19) || "N/A"]);
                discCount++;
            }
        }
        if (discCount === 0) sIntel.addRow(["No single-use numbers detected."]);
        sIntel.eachRow((row) => {
            row.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        });
    }

    outWb.worksheets.forEach(ws => {
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.alignment = { horizontal: "center" };
        ws.columns?.forEach((col, colIdx) => {
            if (!col) return;
            const headerCell = headerRow.getCell(colIdx + 1);
            headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
            const isEyecon = String(headerCell.value || "").toLowerCase().includes("eyecon");
            col.eachCell?.((cell) => {
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: isEyecon };
            });
            if (isEyecon) col.width = 40;
        });
    });

    return await outWb.xlsx.writeBuffer();
}

export async function POST(req: NextRequest) {
    let publicIdsToClean: string[] = [];
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const formData = await req.formData();

        const topN = parseInt(formData.get("top_n") as string || "15");
        const eyeconTopN = parseInt(formData.get("eyecon_top_n") as string || "15");
        const enableLookup = formData.get("enable_lookup") === "true";
        const enableEyecon = formData.get("enable_eyecon") === "true";
        const enableIntel = formData.get("enable_intel") === "true";
        const includeImages = formData.get("include_images") === "true";

        const cloudinaryUrls: string[] = [];
        const cloudinaryPublicIds: string[] = [];
        const fileNames: string[] = [];
        
        let idx = 0;
        while (formData.has(`cloudinaryUrls[${idx}]`)) {
            cloudinaryUrls.push(formData.get(`cloudinaryUrls[${idx}]`) as string);
            cloudinaryPublicIds.push(formData.get(`cloudinaryPublicIds[${idx}]`) as string);
            fileNames.push(formData.get(`fileNames[${idx}]`) as string);
            idx++;
        }
        
        publicIdsToClean = [...cloudinaryPublicIds];

        if (cloudinaryUrls.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

        const totalTokensNeeded = cloudinaryUrls.length * 15;
        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, totalTokensNeeded);
        if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });

        if (enableEyecon) {
            const eyeconCheck = await checkAndDeductEyeconTokens(decoded.uid, decoded.role, eyeconTopN * cloudinaryUrls.length);
            if (!eyeconCheck.success) return NextResponse.json({ error: eyeconCheck.error }, { status: 403 });
        }

        const zip = new JSZip();
        let singleFileBuffer: any = null;
        let singleFileName = "";

        for (let i = 0; i < cloudinaryUrls.length; i++) {
            const url = cloudinaryUrls[i];
            const fileName = fileNames[i];
            
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to download ${fileName} from Cloudinary`);
            const buffer = await res.arrayBuffer();
            
            const reportBuffer = await processSingleFile(buffer, { topN, eyeconTopN, enableLookup, enableEyecon, enableIntel, includeImages });
            if (reportBuffer) {
                const outFileName = fileName.split('.').slice(0, -1).join('.') + "_Analyzed.xlsx";
                zip.file(outFileName, reportBuffer);
                if (cloudinaryUrls.length === 1) {
                    singleFileBuffer = reportBuffer;
                    singleFileName = outFileName;
                }
            }
        }

        // 🚀 LOG USAGE ONLY ON SUCCESS
        await logToolUsage(decoded, "Excel Analyzer", { 
            fileCount: cloudinaryUrls.length,
            lookupCount: enableLookup ? (topN * cloudinaryUrls.length) : 0,
            eyeconCount: enableEyecon ? (eyeconTopN * cloudinaryUrls.length) : 0
        });

        if (cloudinaryUrls.length === 1 && singleFileBuffer) {
            return new NextResponse(singleFileBuffer as any, {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="${singleFileName}"`,
                },
            });
        }

        const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
        return new NextResponse(zipBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="Analysis_Package_${Date.now()}.zip"`,
            },
        });

    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
