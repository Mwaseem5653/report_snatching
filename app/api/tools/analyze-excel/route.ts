import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

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
    try {
        const url = "https://eyecon.p.rapidapi.com/api/v1/search";
        const res = await fetch(`${url}?code=${code}&number=${number}`, {
            headers: { "x-rapidapi-key": rapidApiKey, "x-rapidapi-host": "eyecon.p.rapidapi.com" }
        });
        const data = await res.json();
        if (!data.status) return null;

        const names = new Set<string>();
        if (data.fullName) names.add(data.fullName);
        if (data.otherNames) {
            data.otherNames.forEach((o: any) => names.add(typeof o === 'string' ? o : o.name));
        }
        return Array.from(names).join(" | ");
    } catch (e) { return null; }
}

// --- Helper: Normalize Number ---
function normalizeNumber(num: any): string | null {
    if (!num) return null;
    let s = String(num).trim();
    s = s.replace(/\.0$/, ""); 
    s = s.replace(/\D/g, "");
    
    if (s.length === 12 && s.startsWith("923")) {
        s = s.substring(2);
    }
    else if (s.length === 11 && s.startsWith("03")) {
        s = s.substring(1);
    }
    
    if (s.length === 10 && s.startsWith("3")) return s;
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
        const file = formData.get("file") as File;
        const topN = parseInt(formData.get("top_n") as string || "15");
        const eyeconTopN = parseInt(formData.get("eyecon_top_n") as string || "15");
        const enableLookup = formData.get("enable_lookup") === "true";
        const enableEyecon = formData.get("enable_eyecon") === "true";

        if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

        // Deduct 15 tokens for Excel Analysis
        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 15);
        if (!tokenCheck.success) {
            return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        }

        // 1. Read Excel Raw
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rawRows.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

        // 2. Detect Table Start & Headers
        const { index: headerIndex, headers } = findTableHeaders(rawRows);
        const dataRows = rawRows.slice(headerIndex + 1);
        const jsonData = dataRows.map(row => {
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
        });

        // 3. Detect Key Columns
        const bCol = findColumn(headers, ["B Number", "BNUMBER", "b number", "b party", "b_party", "CALL_DIALED_NUM", "BParty", "Other Party", "MSISDN"]);
        if (!bCol) return NextResponse.json({ error: "B-Party column not found" }, { status: 400 });

        const dateCol = findColumn(headers, ["CALL_START_DT_TM", "Start Date", "Datetime", "Date", "STRT_TM", "Start Time", "Time"]);
        const typeCol = findColumn(headers, ["CallType", "CALL_TYPE", "Type", "Usage Type", "Service Type"]);
        const directionCol = findColumn(headers, ["INBOUND_OUTBOUND_IND", "Direction"]);
        const addressCol = findColumn(headers, ["Address", "Location", "Addr", "SITE_ADDRESS", "SiteLocation", "Cell ID Address", "CellAddress"]);
        const imeiCol = findColumn(headers, ["IMEI", "imei", "Imei number", "Device IMEI"]);

        // 4. Analysis Logic
        const mobileSummaryMap = new Map<string, any>();
        const addressSummaryMap = new Map<string, any>();
        const imeiSummaryMap = new Map<string, any>();
        const callLogMap = new Map<string, any>();

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
        });

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
            await Promise.all(topSim.map(async (rec) => {
                const q = "0" + rec["Mobile Number"];
                const data = await fetchSimInfo(q);
                if (data) {
                    rec["Name"] = data.name; rec["CNIC"] = "'" + data.cnic; rec["Address"] = data.address;
                    cache.set(rec["Mobile Number"], { ...cache.get(rec["Mobile Number"]), name: data.name, cnic: data.cnic, address: data.address });
                }
            }));
        }
        if (enableEyecon) {
            const topEye = mobileSummary.slice(0, eyeconTopN);
            await Promise.all(topEye.map(async (rec) => {
                const q = "0" + rec["Mobile Number"];
                const eye = await fetchEyeconInfo(q);
                if (eye) {
                    rec["Eyecon Name"] = eye;
                    cache.set(rec["Mobile Number"], { ...cache.get(rec["Mobile Number"]), eye: eye });
                }
            }));
        }

        // 6. Generate Excel
        const outWb = new ExcelJS.Workbook();
        const s1 = outWb.addWorksheet("Mobile Numbers");
        const s1Cols = [{ header: "Mobile Number", key: "Mobile Number", width: 15 }];
        if (enableEyecon) s1Cols.push({ header: "Eyecon Name", key: "Eyecon Name", width: 25 });
        if (enableLookup) s1Cols.push({ header: "Name", key: "Name", width: 20 }, { header: "CNIC", key: "CNIC", width: 20 }, { header: "Address", key: "Address", width: 30 });
        s1Cols.push({ header: "Start", key: "Starting Date", width: 20 }, { header: "End", key: "Ending Date", width: 20 }, { header: "Count", key: "Count", width: 10 });
        s1.columns = s1Cols;
        s1.addRows(mobileSummary);

        const s2 = outWb.addWorksheet("Call Logs Summary");
        const logs = Array.from(callLogMap.entries()).map(([num, log]) => {
            const c = cache.get(num) || {};
            const ms = mobileSummaryMap.get(num);
            return { num, start: ms.start.getTime() > 0 ? ms.start.toISOString().substring(0, 10) : "N/A", end: ms.end.getTime() > 0 ? ms.end.toISOString().substring(0, 10) : "N/A", name: c.name || "", eye: c.eye || "", cnic: "'" + (c.cnic || ""), addr: c.address || "", inS: log.inSms, outS: log.outSms, inC: log.inCall, outC: log.outCall, total: ms.count };
        }).sort((a, b) => b.total - a.total);
        const s2Cols = [{ header: "B-Party", key: "num", width: 15 }, { header: "Start Date", key: "start", width: 15 }, { header: "End Date", key: "end", width: 15 }];
        if (enableEyecon) s2Cols.push({ header: "Eyecon", key: "eye", width: 20 });
        if (enableLookup) s2Cols.push({ header: "Name", key: "name", width: 20 }, { header: "CNIC", key: "cnic", width: 18 }, { header: "Address", key: "addr", width: 25 });
        s2Cols.push({ header: "In-SMS", key: "inS", width: 10 }, { header: "Out-SMS", key: "outS", width: 10 }, { header: "In-Call", key: "inC", width: 10 }, { header: "Out-Call", key: "outC", width: 10 }, { header: "Total", key: "total", width: 10 });
        s2.columns = s2Cols;
        s2.addRows(logs);

        if (addressSummaryMap.size > 0) {
            const s3 = outWb.addWorksheet("Address Summary");
            s3.columns = [{ header: "Site Address", key: "addr", width: 50 }, { header: "Count", key: "count", width: 10 }, { header: "Start", key: "start", width: 20 }, { header: "End", key: "end", width: 20 }];
            s3.addRows(Array.from(addressSummaryMap.entries()).map(([a, s]) => ({ addr: a, count: s.count, start: s.start.getTime() > 0 ? s.start.toISOString().replace("T", " ").substring(0, 19) : "N/A", end: s.end.getTime() > 0 ? s.end.toISOString().replace("T", " ").substring(0, 19) : "N/A" })).sort((a, b) => b.count - a.count));
        }
        if (imeiSummaryMap.size > 0) {
            const s4 = outWb.addWorksheet("IMEI Summary");
            s4.columns = [{ header: "IMEI Number", key: "imei", width: 25 }, { header: "Count", key: "count", width: 10 }, { header: "Start", key: "start", width: 20 }, { header: "End", key: "end", width: 20 }];
            s4.addRows(Array.from(imeiSummaryMap.entries()).map(([i, s]) => ({ imei: " " + i, count: s.count, start: s.start.getTime() > 0 ? s.start.toISOString().replace("T", " ").substring(0, 19) : "N/A", end: s.end.getTime() > 0 ? s.end.toISOString().replace("T", " ").substring(0, 19) : "N/A" })).sort((a, b) => b.count - a.count));
        }

        const sRaw = outWb.addWorksheet("Cleaned Raw Data");
        sRaw.columns = headers.map(h => ({ header: h, key: h, width: 15 }));
        jsonData.forEach(row => {
            const cleanRow: any = {};
            headers.forEach(h => {
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
            ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
            ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
            ws.getRow(1).alignment = { horizontal: "center" };
            ws.eachRow(row => { row.eachCell(c => { c.alignment = { horizontal: "center" }; }); });
        });

        const outBuffer = await outWb.xlsx.writeBuffer();
        return new NextResponse(outBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="Full_Analysis_${file.name}"`,
            },
        });

    } catch (error: any) {
        console.error("Full Analysis Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
