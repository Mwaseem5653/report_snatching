import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

// --- Helper: Process ExcelJS Row to Array ---
function processRow(row: ExcelJS.Row): any[] {
    const rowData = Array.isArray(row.values) ? row.values.slice(1) : [];
    return (rowData as any[]).map(val => {
        if (val && typeof val === 'object') {
            if (val.result !== undefined) return val.result;
            if (val instanceof Date) return val;
            if (val.text !== undefined) return val.text;
            return String(val);
        }
        return val === null || val === undefined ? "" : val;
    });
}

function parseExcelDate(val: any, formatHint: "DMY" | "MDY" | "YMD" = "DMY"): Date {
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
    const s = String(val).trim();
    const normalizeYear = (y: number) => y < 100 ? (y < 30 ? 2000 + y : 1900 + y) : y;

    // YMD: YYYY-MM-DD
    const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})([\sT]\d{1,2}:\d{1,2}(:\d{1,2})?)?/);
    if (ymdMatch) {
        const year = parseInt(ymdMatch[1]);
        const month = parseInt(ymdMatch[2]) - 1;
        const day   = parseInt(ymdMatch[3]);
        let hour = 0, min = 0, sec = 0;
        if (ymdMatch[4]) {
            const tp = ymdMatch[4].trim().split(':');
            hour = parseInt(tp[0]); min = parseInt(tp[1]); sec = tp[2] ? parseInt(tp[2]) : 0;
        }
        const d = new Date(year, month, day, hour, min, sec);
        if (!isNaN(d.getTime())) return d;
    }

    // DMY / MDY — 2 or 4 digit year
    const dmMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(\s+\d{1,2}:\d{1,2}(:\d{1,2})?)?/);
    if (dmMatch) {
        const p1   = parseInt(dmMatch[1]);
        const p2   = parseInt(dmMatch[2]);
        const year = normalizeYear(parseInt(dmMatch[3]));
        let day: number, month: number;
        if (p1 > 12)              { day = p1; month = p2 - 1; }
        else if (p2 > 12)         { day = p2; month = p1 - 1; }
        else if (formatHint === "MDY") { day = p2; month = p1 - 1; }
        else                      { day = p1; month = p2 - 1; }
        let hour = 0, min = 0, sec = 0;
        if (dmMatch[4]) {
            const tp = dmMatch[4].trim().split(':');
            hour = parseInt(tp[0]); min = parseInt(tp[1]); sec = tp[2] ? parseInt(tp[2]) : 0;
        }
        const d = new Date(year, month, day, hour, min, sec);
        if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

// --- Helper: Auto-Detect Date Format (40-row voting on worksheet cells) ---
function detectDateFormat(
    ws: ExcelJS.Worksheet,
    dateColIdx: number,
    headerRowIdx: number
): "DMY" | "MDY" | "YMD" {
    const votes = { DMY: 0, MDY: 0, YMD: 0 };
    for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
        const cell = ws.getRow(r).getCell(dateColIdx);
        if (!cell || cell.value === null || cell.value === undefined || cell.value === "") continue;
        const fmt = (cell.numFmt || "").toLowerCase();
        if (fmt) {
            if (/^yyyy[\/\-]m/.test(fmt))             { votes.YMD++; continue; }
            if (/^(mm|m)[\/\-](dd|d)/.test(fmt))     { votes.MDY++; continue; }
            if (/^(dd|d)[\/\-](mm|m)/.test(fmt))     { votes.DMY++; continue; }
        }
        const raw = (cell.text || (typeof cell.value === "string" ? cell.value : "")).trim();
        if (!raw) continue;
        if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(raw)) { votes.YMD++; continue; }
        const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (m) {
            const p1 = parseInt(m[1]);
            const p2 = parseInt(m[2]);
            if (p1 > 12) { votes.DMY++; continue; }
            if (p2 > 12) { votes.MDY++; continue; }
        }
    }
    const max = Math.max(votes.DMY, votes.MDY, votes.YMD);
    if (max === 0)          return "DMY";
    if (votes.YMD === max) return "YMD";
    if (votes.MDY === max) return "MDY";
    return "DMY";
}

function findColumn(headers: string[], candidates: string[]): string | null {
    const lowerCandidates = candidates.map(c => c.toLowerCase());
    return headers.find(h => lowerCandidates.includes(h.trim().toLowerCase())) || null;
}

function findTableHeaders(rows: any[][]) {
    const keywords = ['call', 'type', 'msisdn', 'bnumber', 'a number', 'imei', 'start', 'end', 'party'];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const values = rows[i].map(v => String(v).toLowerCase());
        const matchCount = values.filter(v => keywords.some(k => v.includes(k))).length;
        if (matchCount >= 2) return { index: i, headers: rows[i].map(String) };
    }
    return { index: 0, headers: rows[0].map(String) };
}

// --- Helper: Format Date consistently ---
function formatDate(d: Date): string {
    if (!d || isNaN(d.getTime()) || d.getTime() === 0) return "N/A";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

import { Readable } from "stream";

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const formData = await req.formData();
        const fileUrl = formData.get("url") as string;
        const fileName = formData.get("fileName") as string || "file.xlsx";
        
        if (!fileUrl) return NextResponse.json({ error: "No file URL provided" }, { status: 400 });

        // 🚀 LOG USAGE
        await logToolUsage(decoded, "Movement Visualizer");

        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 15); // 15 tokens for visual analysis
        if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });

        // Fetch from Supabase URL
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error("Failed to download file from storage.");
        const buffer = await fileRes.arrayBuffer();
        
        const wb = new ExcelJS.Workbook();
        const isCsv = fileName.toLowerCase().endsWith(".csv");

        if (isCsv) {
            const stream = Readable.from(Buffer.from(buffer));
            await wb.csv.read(stream);
        } else {
            await wb.xlsx.load(buffer);
        }

        const ws = wb.worksheets[0];

        const rawRows: any[][] = [];
        ws.eachRow({ includeEmpty: true }, (row) => {
            rawRows.push(processRow(row));
        });

        if (rawRows.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

        const { index: headerIndex, headers } = findTableHeaders(rawRows);
        const dateCol = findColumn(headers, ["CALL_START_DT_TM", "Start Date", "Datetime", "Date", "STRT_TM", "Start Time", "Time"]);
        const addressCol = findColumn(headers, ["Address", "Location", "Addr", "SITE_ADDRESS", "SITE_ADDR", "SiteLocation", "Cell ID Address", "CellAddress", "Cell Name", "Tower", "Site Name"]);
        const latCol = findColumn(headers, ["Latitude", "Lat", "LATITUDE", "CELL_LAT", "SITE_LAT", "X_COORD", "GPS_LAT", "LATITUTDE", "LATITUD", "LATITIDE"]);
        const lonCol = findColumn(headers, ["Longitude", "Lon", "Long", "LNG", "LONGITUDE", "CELL_LON", "SITE_LON", "CELL_LONG", "SITE_LONG", "Y_COORD", "GPS_LON", "LONGITUTDE", "LONGITUD", "LONGITIDE", "LANGUTIDE", "LANGITUDE"]);

        const dataRows = rawRows.slice(headerIndex + 1);

        // 🚀 Auto-Detect Date Format via 40-row cell voting (numFmt + text layers)
        let formatHint: "DMY" | "MDY" | "YMD" = "DMY";
        if (dateCol) {
            const dateColIdx1Based = headers.indexOf(dateCol) + 1;
            const headerRowIdx1Based = headerIndex + 1;
            formatHint = detectDateFormat(ws, dateColIdx1Based, headerRowIdx1Based);
        }

        const allMovements: any[] = [];
        dataRows.forEach((row) => {
            const rowObj: any = {};
            headers.forEach((h, i) => { rowObj[h] = row[i]; });

            const rawDate = dateCol ? rowObj[dateCol] : null;
            const dateObj = rawDate ? parseExcelDate(rawDate, formatHint) : new Date(0);
            
            let lat = (latCol && rowObj[latCol]) ? parseFloat(rowObj[latCol]) : null;
            let lon = (lonCol && rowObj[lonCol]) ? parseFloat(rowObj[lonCol]) : null;
            let addr = addressCol ? String(rowObj[addressCol] || "").trim() : "";

            // 🚀 SMART FIX: Handle pipe-separated format (Address|Lat|Lon)
            if (addr.includes("|")) {
                const parts = addr.split("|");
                if (parts.length >= 3) {
                    addr = parts[0].trim();
                    if (lat === null || isNaN(lat)) lat = parseFloat(parts[1]);
                    if (lon === null || isNaN(lon)) lon = parseFloat(parts[2]);
                }
            }

            const hasLoc = (lat !== null && !isNaN(lat) && lon !== null && !isNaN(lon)) || (addr && addr !== "None" && addr !== "");

            if (dateObj.getTime() > 0 && hasLoc) {
                allMovements.push({
                    timestamp: dateObj.getTime(),
                    displayTime: dateObj.toISOString().replace("T", " ").substring(0, 19),
                    lat: lat,
                    lon: lon,
                    address: addr || `Coords: ${lat}, ${lon}`
                });
            }
        });

        // 1. Sort by time first
        allMovements.sort((a, b) => a.timestamp - b.timestamp);

        // 2. Sequential Deduplication (Smart Sampling)
        // If suspect stays at one tower for 100 calls, only keep the first entry.
        const optimizedMovements: any[] = [];
        allMovements.forEach((m) => {
            const last = optimizedMovements[optimizedMovements.length - 1];
            if (!last) {
                optimizedMovements.push(m);
            } else {
                const isSameAddr = last.address === m.address;
                const isSameCoords = last.lat === m.lat && last.lon === m.lon;
                
                // Only push if location changed
                if (!isSameAddr || !isSameCoords) {
                    optimizedMovements.push(m);
                }
            }
        });

        return NextResponse.json({
            success: true,
            movements: optimizedMovements,
            summary: {
                totalOriginal: allMovements.length,
                totalOptimized: optimizedMovements.length,
                startDate: optimizedMovements.length > 0 ? optimizedMovements[0].displayTime : null,
                endDate: optimizedMovements.length > 0 ? optimizedMovements[optimizedMovements.length - 1].displayTime : null
            }
        });

    } catch (error: any) {
        console.error("Movement Analysis Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
