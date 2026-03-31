import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

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
    
    let s = String(val).trim();
    const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(\s+\d{1,2}:\d{1,2}(:\d{1,2})?)?/);
    
    if (match) {
        const p1 = parseInt(match[1]);
        const p2 = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        let day, month;
        // 🚀 Smart Detection: If part 2 > 12, it MUST be MM/DD/YYYY. If part 1 > 12, it MUST be DD/MM/YYYY.
        if (p1 > 12) {
            day = p1; month = p2 - 1;
        } else if (p2 > 12) {
            day = p2; month = p1 - 1;
        } else {
            // Ambiguous (both <= 12), use hint or default
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

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const formData = await req.formData();
        const fileUrl = formData.get("url") as string;
        
        if (!fileUrl) return NextResponse.json({ error: "No file URL provided" }, { status: 400 });

        // 🚀 LOG USAGE
        await logToolUsage(decoded, "Movement Visualizer");

        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 10); // 10 tokens for visual analysis
        if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });

        // Fetch from Supabase URL
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error("Failed to download file from storage.");
        const buffer = await fileRes.arrayBuffer();
        
        const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rawRows.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

        const { index: headerIndex, headers } = findTableHeaders(rawRows);
        const dateCol = findColumn(headers, ["CALL_START_DT_TM", "Start Date", "Datetime", "Date", "STRT_TM", "Start Time", "Time"]);
        const addressCol = findColumn(headers, ["Address", "Location", "Addr", "SITE_ADDRESS", "SITE_ADDR", "SiteLocation", "Cell ID Address", "CellAddress", "Cell Name", "Tower", "Site Name"]);
        const latCol = findColumn(headers, ["Latitude", "Lat", "LATITUDE", "CELL_LAT", "SITE_LAT", "X_COORD", "GPS_LAT", "LATITUTDE", "LATITUD", "LATITIDE"]);
        const lonCol = findColumn(headers, ["Longitude", "Lon", "Long", "LNG", "LONGITUDE", "CELL_LON", "SITE_LON", "CELL_LONG", "SITE_LONG", "Y_COORD", "GPS_LON", "LONGITUTDE", "LONGITUD", "LONGITIDE", "LANGUTIDE", "LANGITUDE"]);

        const dataRows = rawRows.slice(headerIndex + 1);

        // 🚀 Specific Fix for STRT_TM column as requested
        let formatHint: "DMY" | "MDY" = "DMY";
        if (dateCol === "STRT_TM") {
            formatHint = "MDY";
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
