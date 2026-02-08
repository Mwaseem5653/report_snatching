import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import JSZip from "jszip";
import { checkAndDeductTokens, checkAndDeductEyeconTokens } from "@/lib/tokenHelper";

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

        // 1. Extract Names (Exhaustive)
        const names = new Set<string>();
        const extractNames = (d: any) => {
            if (!d) return;
            const fname = d.fullName || d.name;
            if (fname) names.add(fname);
            if (Array.isArray(d.otherNames)) {
                d.otherNames.forEach((o: any) => {
                    const n = typeof o === 'string' ? o : o.name;
                    if (n) names.add(n);
                });
            }
        };
        extractNames(data);
        if (data.data) extractNames(data.data);
        const finalName = Array.from(names).join(" | ");

        // 2. Extract Image URL (Priority Logic)
        let image_url = "";
        const source = data.data || data;
        
        if (source.photo) image_url = source.photo;
        else if (data.photo) image_url = data.photo;

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
            image_url = getImagesUrl(data) || getImagesUrl(data.data);
        }

        // Fallback to Base64
        if (!image_url) {
            const rawB64 = data.b64 || (data.data && data.data.b64);
            if (rawB64) {
                image_url = String(rawB64).startsWith("data:image") ? rawB64 : `data:image/jpeg;base64,${rawB64}`;
            }
        }

        // 3. Extract Facebook URL
        const facebookID = data.facebookID || (data.data && data.data.facebookID) || {};
        const extractedFb = facebookID.url || "";

        return {
            name: finalName || "No Record Found",
            image: image_url,
            facebook: extractedFb
        };
    } catch (e: any) { 
        return null; 
    }
}
// --- Helper: Normalize Number ---
function normalizeNumber(num: any): string | null {
    if (num === null || num === undefined || num === "") return null;
    
    let s: string;
    
    // 🚀 Handle Scientific Notation (e.g., 3.03E+09)
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
    
    // Normalize formats to 3XXXXXXXXX (10 digits starting with 3)
    if (s.length === 12 && s.startsWith("923")) {
        s = s.substring(2);
    } else if (s.length === 11 && s.startsWith("03")) {
        s = s.substring(1);
    }
    
    // Final check: Must be exactly 10 digits starting with '3'
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
function parseExcelDate(val: any): Date {
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
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const formData = await req.formData();
        const files = formData.getAll("file") as File[];
        const topN = parseInt(formData.get("top_n") as string || "15");
        const eyeconTopN = parseInt(formData.get("eyecon_top_n") as string || "15");
        const enableLookup = formData.get("enable_lookup") === "true";
        const enableEyecon = formData.get("enable_eyecon") === "true";

        if (!files || files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        if (files.length > 10) return NextResponse.json({ error: "Maximum 10 files allowed" }, { status: 400 });

        // Deduct 15 tokens PER FILE
        const totalTokensNeeded = files.length * 15;
        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, totalTokensNeeded);
        if (!tokenCheck.success) {
            return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        }

        // 🚀 Eyecon Token Deduction (Based on settings, once per request or per file? Let's keep it per request limit)
        if (enableEyecon) {
            const eyeconCheck = await checkAndDeductEyeconTokens(decoded.uid, decoded.role, eyeconTopN);
            if (!eyeconCheck.success) {
                return NextResponse.json({ error: eyeconCheck.error }, { status: 403 });
            }
        }

        // --- Aggregated Data Stores ---
        const mobileSummaryMap = new Map<string, any>();
        const addressSummaryMap = new Map<string, any>();
        const imeiSummaryMap = new Map<string, any>();
        const callLogMap = new Map<string, any>();
        const allJsonData: any[] = [];
        let globalHeaders: string[] = [];

        // 1. Process All Files
        for (const file of files) {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

            if (rawRows.length === 0) continue;

            const { index: headerIndex, headers } = findTableHeaders(rawRows);
            if (globalHeaders.length === 0) globalHeaders = headers;

            const dataRows = rawRows.slice(headerIndex + 1);
            const jsonData = dataRows.map(row => {
                const obj: any = {};
                headers.forEach((h, i) => { obj[h] = row[i]; });
                return obj;
            });

            // Detect Columns for this specific file
            const bCol = findColumn(headers, [
                "B Number", "BNUMBER", "b number", "b party", "b_party", "BParty", 
                "CALL_DIALED_NUM", "DIALED_NUMBER", "Dialled Number", "CONNECTED_NUMBER",
                "Other Party", "OTHER_MSISDN", "Destination Number", "Called Number", "MSISDN"
            ]);
            if (!bCol) continue;

            const dateCol = findColumn(headers, ["CALL_START_DT_TM", "Start Date", "Datetime", "Date", "STRT_TM", "Start Time", "Time"]);
            const typeCol = findColumn(headers, ["CallType", "CALL_TYPE", "Type", "Usage Type", "Service Type"]);
            const directionCol = findColumn(headers, ["INBOUND_OUTBOUND_IND", "Direction"]);
            const addressCol = findColumn(headers, ["Address", "Location", "Addr", "SITE_ADDRESS", "SiteLocation", "Cell ID Address", "CellAddress"]);
            const imeiCol = findColumn(headers, ["IMEI", "imei", "Imei number", "Device IMEI"]);

            jsonData.forEach((row) => {
                const rawB = row[bCol];
                const cleanB = normalizeNumber(rawB);
                const rawAddr = addressCol ? String(row[addressCol] || "").trim() : null;
                const rawImei = imeiCol ? String(row[imeiCol] || "").trim() : null;
                const dateObj = dateCol ? parseExcelDate(row[dateCol]) : new Date(0);

                if (cleanB) {
                    const stats = mobileSummaryMap.get(cleanB) || { count: 0, start: dateObj, end: dateObj };
                    stats.count++;
                    if (dateObj.getTime() > 0) {
                        if (stats.start.getTime() === 0 || dateObj < stats.start) stats.start = dateObj;
                        if (dateObj > stats.end) stats.end = dateObj;
                    }
                    mobileSummaryMap.set(cleanB, stats);

                    const log = callLogMap.get(cleanB) || { inSms: 0, outSms: 0, inCall: 0, outCall: 0 };
                    const dirVal = directionCol ? row[directionCol] : "";
                    const typeVal = typeCol ? row[typeCol] : "";
                    let typeStr = `${dirVal || ""} ${typeVal || ""}`;
                    const category = getCallCategory(typeStr);
                    if (category) log[category]++;
                    callLogMap.set(cleanB, log);
                }

                if (rawAddr && rawAddr !== "None" && rawAddr !== "") {
                    const stats = addressSummaryMap.get(rawAddr) || { count: 0, start: dateObj, end: dateObj };
                    stats.count++;
                    if (dateObj.getTime() > 0) {
                        if (stats.start.getTime() === 0 || dateObj < stats.start) stats.start = dateObj;
                        if (dateObj > stats.end) stats.end = dateObj;
                    }
                    addressSummaryMap.set(rawAddr, stats);
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

                // For Raw Data Sheet
                allJsonData.push(row);
            });
        }

        if (mobileSummaryMap.size === 0) {
            return NextResponse.json({ error: "No valid data found in uploaded files" }, { status: 400 });
        }

        // 5. Build Summaries & Enrichment
        const mobileSummary = Array.from(mobileSummaryMap.entries()).map(([num, s]) => ({
            "Mobile Number": num, "Count": s.count, 
            "Starting Date": s.start.getTime() > 0 ? s.start.toISOString().replace("T", " ").substring(0, 19) : "N/A",
            "Ending Date": s.end.getTime() > 0 ? s.end.toISOString().replace("T", " ").substring(0, 19) : "N/A",
            "Eyecon Name": "", "Name": "", "CNIC": "", "Address": ""
        })).sort((a, b) => b.Count - a.Count);

        const cache = new Map<string, any>();
        if (enableLookup) {
            const topSim = mobileSummary.slice(0, topN);
            // 🚀 Batch processing: 2 numbers at a time
            for (let i = 0; i < topSim.length; i += 2) {
                const batch = topSim.slice(i, i + 2);
                await Promise.all(batch.map(async (rec) => {
                    const q = "0" + rec["Mobile Number"];
                    const data = await fetchSimInfo(q);
                    if (data) {
                        rec["Name"] = data.name; rec["CNIC"] = " " + data.cnic; rec["Address"] = data.address;
                        cache.set(rec["Mobile Number"], { ...cache.get(rec["Mobile Number"]), name: data.name, cnic: data.cnic, address: data.address });
                    } else {
                        rec["Name"] = "No Record Found";
                        rec["CNIC"] = "No Record Found";
                        rec["Address"] = "No Record Found";
                        cache.set(rec["Mobile Number"], { ...cache.get(rec["Mobile Number"]), name: "No Record Found", cnic: "No Record Found", address: "No Record Found" });
                    }
                }));
                // Stability delay between batches
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        if (enableEyecon) {
            const topEye = mobileSummary.slice(0, eyeconTopN);
            for (const rec of topEye) {
                const q = rec["Mobile Number"];
                const eyeData = await fetchEyeconInfo(q);
                if (eyeData) {
                    rec["Eyecon Name"] = eyeData.name;
                    cache.set(rec["Mobile Number"], { 
                        ...cache.get(rec["Mobile Number"]), 
                        eye: eyeData.name,
                        eyeImage: eyeData.image,
                        eyeFb: eyeData.facebook
                    });
                } else {
                    rec["Eyecon Name"] = "No Record Found";
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 6. Generate Excel
        const outWb = new ExcelJS.Workbook();
        const s1 = outWb.addWorksheet("Mobile Numbers");
        const s1Cols = [{ header: "Mobile Number", key: "Mobile Number", width: 15 }];
        if (enableEyecon) {
            s1Cols.push({ header: "Eyecon Name", key: "Eyecon Name", width: 40 });
            s1Cols.push({ header: "Eyecon Image", key: "eyeImage", width: 15 });
            s1Cols.push({ header: "Facebook Link", key: "eyeFb", width: 15 });
        }
        if (enableLookup) s1Cols.push({ header: "Name", key: "Name", width: 25 }, { header: "CNIC", key: "CNIC", width: 20 }, { header: "Address", key: "Address", width: 45 });
        s1Cols.push({ header: "Start", key: "Starting Date", width: 20 }, { header: "End", key: "Ending Date", width: 20 }, { header: "Count", key: "Count", width: 10 });
        s1.columns = s1Cols;
        
        // Helper for safe hyperlinks (Excel limit ~32k characters)
        const safeLink = (url: string) => {
            if (!url) return "";
            if (url.length > 30000) return "Link (Too Large)";
            return { text: "Link", hyperlink: url };
        };

        // Add data to s1, including image/fb from cache
        mobileSummary.forEach(rec => {
            const num = rec["Mobile Number"];
            const c = cache.get(num) || null;
            
            s1.addRow({
                ...rec,
                "Eyecon Name": c ? (c.eye || "No Record Found") : "",
                "Name": c ? (c.name || "No Record Found") : "",
                "CNIC": c ? (c.cnic ? " " + c.cnic : "No Record Found") : "",
                "Address": c ? (c.address || "No Record Found") : "",
                eyeImage: safeLink(c?.eyeImage),
                eyeFb: safeLink(c?.eyeFb)
            });
        });

        const s2 = outWb.addWorksheet("Call Logs");
        const logs = Array.from(callLogMap.entries()).map(([num, log]) => {
            const c = cache.get(num) || null;
            const ms = mobileSummaryMap.get(num);
            
            // Logic: Only show "No Record Found" if the entry exists in cache (searched) but has no data.
            const getName = () => {
                if (c) return c.name || "No Record Found";
                return "";
            };
            const getEye = () => {
                if (c) return c.eye || "No Record Found";
                return "";
            };
            const getCnic = () => {
                if (c) return c.cnic ? " " + c.cnic : "No Record Found";
                return "";
            };
            const getAddr = () => {
                if (c) return c.address || "No Record Found";
                return "";
            };

            return { 
                num, 
                start: ms.start.getTime() > 0 ? ms.start.toISOString().substring(0, 10) : "N/A", 
                end: ms.end.getTime() > 0 ? ms.end.toISOString().substring(0, 10) : "N/A", 
                name: getName(), 
                eye: getEye(), 
                eyeImage: safeLink(c?.eyeImage),
                eyeFb: safeLink(c?.eyeFb),
                cnic: getCnic(), 
                addr: getAddr(), 
                inS: log.inSms, 
                outS: log.outSms, 
                inC: log.inCall, 
                outC: log.outCall, 
                total: ms.count 
            };
        }).sort((a, b) => b.total - a.total);

        const s2Cols = [{ header: "B-Party", key: "num", width: 15 }, { header: "Start Date", key: "start", width: 15 }, { header: "End Date", key: "end", width: 15 }];
        if (enableEyecon) {
            s2Cols.push({ header: "Eyecon", key: "eye", width: 40 });
            s2Cols.push({ header: "Eyecon Image", key: "eyeImage", width: 15 });
            s2Cols.push({ header: "Facebook Link", key: "eyeFb", width: 15 });
        }
        if (enableLookup) s2Cols.push({ header: "Name", key: "name", width: 25 }, { header: "CNIC", key: "cnic", width: 18 }, { header: "Address", key: "addr", width: 45 });
        s2Cols.push({ header: "In-SMS", key: "inS", width: 10 }, { header: "Out-SMS", key: "outS", width: 10 }, { header: "In-Call", key: "inC", width: 10 }, { header: "Out-Call", key: "outC", width: 10 }, { header: "Total", key: "total", width: 10 });
        s2.columns = s2Cols;
        s2.addRows(logs);

        if (addressSummaryMap.size > 0) {
            const s3 = outWb.addWorksheet("Addresses");
            s3.columns = [{ header: "Site Address", key: "addr", width: 60 }, { header: "Count", key: "count", width: 10 }, { header: "Start", key: "start", width: 20 }, { header: "End", key: "end", width: 20 }];
            s3.addRows(Array.from(addressSummaryMap.entries()).map(([a, s]) => ({ addr: a, count: s.count, start: s.start.getTime() > 0 ? s.start.toISOString().replace("T", " ").substring(0, 19) : "N/A", end: s.end.getTime() > 0 ? s.end.toISOString().replace("T", " ").substring(0, 19) : "N/A" })).sort((a, b) => b.count - a.count));
        }
        if (imeiSummaryMap.size > 0) {
            const s4 = outWb.addWorksheet("IMEI Numbers");
            s4.columns = [{ header: "IMEI Number", key: "imei", width: 25 }, { header: "Count", key: "count", width: 10 }, { header: "Start", key: "start", width: 20 }, { header: "End", key: "end", width: 20 }];
            s4.addRows(Array.from(imeiSummaryMap.entries()).map(([i, s]) => ({ imei: " " + i, count: s.count, start: s.start.getTime() > 0 ? s.start.toISOString().replace("T", " ").substring(0, 19) : "N/A", end: s.end.getTime() > 0 ? s.end.toISOString().replace("T", " ").substring(0, 19) : "N/A" })).sort((a, b) => b.count - a.count));
        }

        const sRaw = outWb.addWorksheet("Formatted Data");
        sRaw.columns = globalHeaders.map(h => ({ header: h, key: h, width: 15 }));
        allJsonData.forEach(row => {
            const cleanRow: any = {};
            globalHeaders.forEach(h => {
                const val = row[h];
                if (val instanceof Date) cleanRow[h] = val.toISOString().replace("T", " ").substring(0, 19);
                else {
                    const strVal = String(val);
                    if (/^\d{10,}$/.test(strVal)) cleanRow[h] = " " + strVal;
                    else cleanRow[h] = val;
                }
            });
            sRaw.addRow(cleanRow);
        });

        outWb.worksheets.forEach(ws => {
            const headerRow = ws.getRow(1);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.alignment = { horizontal: "center" };
            
            // Apply header styling and column-specific alignment
            ws.columns?.forEach((col, colIndex) => {
                if (!col) return;
                const headerCell = headerRow.getCell(colIndex + 1);
                headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
                
                const headerValue = String(headerCell.value || "").toLowerCase();
                const isEyecon = headerValue.includes("eyecon name") || headerValue === "eyecon";

                col.eachCell?.((cell) => {
                    cell.alignment = { 
                        horizontal: "center", 
                        vertical: "middle", 
                        wrapText: isEyecon // Only wrap for Eyecon columns
                    };
                });

                if (isEyecon) {
                    col.width = 40;
                }
            });
        });

        const outBuffer = await outWb.xlsx.writeBuffer();
        
        // 🚀 Create ZIP Archive
        const zip = new JSZip();
        zip.file(`Bulk_Analysis_Report_${Date.now()}.xlsx`, outBuffer);
        const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

        return new NextResponse(zipBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="Analysis_Package_${Date.now()}.zip"`,
            },
        });

    } catch (error: any) {
        console.error("Full Analysis Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
