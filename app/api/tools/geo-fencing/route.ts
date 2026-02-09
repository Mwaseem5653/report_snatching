import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

// --- Helper: Normalize Phone Number ---
function normalizeGeoNumber(num: any): string | null {
    if (num === null || num === undefined || num === "") return null;
    let s = String(num).trim().toLowerCase();
    
    if (s.includes('e')) {
        const n = Number(s);
        if (!isNaN(n)) s = n.toFixed(0);
    }
    s = s.replace(/\.0$/, "");
    s = s.replace(/\D/g, "");
    
    while (true) {
        if (s.startsWith("92")) s = s.substring(2);
        else if (s.startsWith("0")) s = s.substring(1);
        else break;
    }
    
    if (s.length === 10 && s.startsWith("3")) return s;
    return null;
}

// --- Helper: Standardize Datetime Output ---
function standardizeDateTime(date: Date | null): string {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strHours = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
}

// --- Helper: Parse Datetime with Timezone Correction ---
function parseDateTime(val: any): Date | null {
    if (!val || val === "None" || val === "") return null;
    
    // If it's already a JS Date from xlsx parser
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return val;
    }
    
    let s = String(val).trim();
    
    // 🚀 Handle Excel serial number (Date + Time or just Time)
    if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) {
        let num = parseFloat(s);
        
        // Date range: 1970 to 2060
        if (num > 25569 && num < 100000) {
            // Excel serial dates are "Local Time". JS Date(ms) is UTC.
            // We create the date and then subtract the timezone offset to keep the "Visual Time" same.
            const dt = new Date(Math.round((num - 25569) * 86400 * 1000));
            dt.setMinutes(dt.getMinutes() + dt.getTimezoneOffset());
            return dt;
        }
        
        // Time only (fraction of a day)
        if (num >= 0 && num < 1) {
            const dt = new Date(2000, 0, 1);
            dt.setMilliseconds(Math.round(num * 86400 * 1000));
            dt.setMinutes(dt.getMinutes() + dt.getTimezoneOffset());
            return dt;
        }
    }

    // Standard string parsing
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // Fallback for custom formats (DD-MM-YYYY etc)
    const cleanStr = s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const parts = cleanStr.split(/\s+/).filter(p => p !== "");
    
    if (parts.length >= 3) {
        const numParts = parts.filter(p => /^\d+$/.test(p)).map(p => parseInt(p));
        if (numParts.length >= 3) {
            let day = numParts[0] > 31 ? numParts[2] : numParts[0];
            let month = (numParts[0] > 31 ? numParts[1] : numParts[1]) - 1;
            let year = numParts[0] > 1000 ? numParts[0] : (numParts[2] > 1000 ? numParts[2] : 2000 + numParts[2]);
            
            let hour = 0, min = 0, sec = 0;
            if (numParts.length >= 5) {
                hour = numParts[numParts.length - (numParts.length === 5 ? 2 : 3)];
                min = numParts[numParts.length - (numParts.length === 5 ? 1 : 2)];
                if (numParts.length >= 6) sec = numParts[numParts.length - 1];
                
                if (s.toUpperCase().includes("PM") && hour < 12) hour += 12;
                if (s.toUpperCase().includes("AM") && hour === 12) hour = 0;
            }
            
            const finalDate = new Date(year, month, day, hour, min, sec);
            if (!isNaN(finalDate.getTime())) return finalDate;
        }
    }
    
    return null;
}

// --- Helper: Get Time Minutes from Input ---
function getTimeMinutes(timeStr: string, period: string) {
    let parts = timeStr.split(':');
    let hours = parseInt(parts[0]) || 0;
    let minutes = parseInt(parts[1]) || 0;
    
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

function findColumn(headers: string[], candidates: string[]): string | null {
    const upperHeaders = headers.map(h => String(h).trim().toUpperCase());
    for (const cand of candidates) {
        const candUpper = cand.toUpperCase();
        const foundIdx = upperHeaders.indexOf(candUpper);
        if (foundIdx !== -1) return headers[foundIdx];
    }
    return null;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = jwt.verify(token, SECRET);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fromTime = formData.get("fromTime") as string;
    const fromPeriod = formData.get("fromPeriod") as string;
    const toTime = formData.get("toTime") as string;
    const toPeriod = formData.get("toPeriod") as string;
            const includeB = formData.get("includeB") === "true";
    
            if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    
            // 🚀 Deduct 10 General Tokens
            const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 10);
            if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    
            const buffer = await file.arrayBuffer();    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (rawRows.length < 2) return NextResponse.json({ error: "Insufficient data in file" }, { status: 400 });

    const headers = rawRows[0].map(String);
    const dataRows = rawRows.slice(1);

    const aCol = findColumn(headers, ['DLD_NO', 'MSISDN', 'A-Party', 'A_NUMBER', 'A', 'DLD NO', 'PHONE', 'NUMBER', 'MSISDN_A', 'A Party', 'A.Party', 'SOURCE_ADDR']);
    const bCol = findColumn(headers, ['CALL_DIALED_NUM', 'DLG_NO', 'B-Party', 'CALL_ORIG_NUM', 'B_NUMBER', 'B', 'DLG NO', 'MSISDN_B', 'B Party', 'B.Party', 'DEST_ADDR']);
    const timeCol = findColumn(headers, ['Date And Time', 'START_TIME', 'CALL_TIME', 'DATETIME', 'STR TM', 'TIME', 'STRT_TM', 'CALL_START_DT_TM', 'DATE_TIME', 'Call Date', 'Event Time', 'USAGE_START_DATE']);

        if (!aCol || !timeCol) {
            return NextResponse.json({ error: "Required columns (A-Party and Time) not found." }, { status: 400 });
        }

        const aIdx = headers.indexOf(aCol);
        const bIdx = bCol ? headers.indexOf(bCol) : -1;
        const tIdx = headers.indexOf(timeCol);

        const startMin = getTimeMinutes(fromTime, fromPeriod);
        const endMin = getTimeMinutes(toTime, toPeriod);

        // Process data
        const processedRows = dataRows.map(row => {
            const dt = parseDateTime(row[tIdx]);
            return {
                original: row,
                dt: dt,
                aNorm: normalizeGeoNumber(row[aIdx]),
                bNorm: bIdx !== -1 ? normalizeGeoNumber(row[bIdx]) : null,
                minutes: dt ? dt.getHours() * 60 + dt.getMinutes() : -1
            };
        }).filter(r => r.dt !== null && r.aNorm !== null).sort((a, b) => a.dt!.getTime() - b.dt!.getTime());

        // Filter by window
        const windowRows = processedRows.filter(r => r.minutes >= startMin && r.minutes <= endMin);
        if (windowRows.length === 0) {
            return NextResponse.json({ error: `No valid records found between ${fromTime} ${fromPeriod} and ${toTime} ${toPeriod}. Check date format.` }, { status: 400 });
        }

        const fullMatchedOriginals = windowRows.map(r => r.original);

        const uniqueA = Array.from(new Set(windowRows.map(r => r.aNorm!)));
        const uniqueB = includeB ? Array.from(new Set(windowRows.map(r => r.bNorm).filter(b => b !== null))) : [];

        const results: any[] = [];
        const maxSummaryRows = Math.max(uniqueA.length, uniqueB.length);

        for (let i = 0; i < maxSummaryRows; i++) {
            const rowData: any = {};
            
            // Process A-Party Column (Unique)
            if (i < uniqueA.length) {
                const aNorm = uniqueA[i];
                const aHistory = processedRows.filter(r => r.aNorm === aNorm || (bIdx !== -1 && r.bNorm === aNorm));
                if (aHistory.length > 0) {
                    const first = aHistory[0];
                    const last = aHistory[aHistory.length - 1];
                    Object.assign(rowData, {
                        'A Number': aNorm,
                        'A Date': first.dt!.toLocaleDateString('en-GB'),
                        'A First Call': standardizeDateTime(first.dt),
                        'A Last Call': standardizeDateTime(last.dt),
                        'A Count': aHistory.length
                    });
                }
            }

            // Process B-Party Column (Unique)
            if (includeB && i < uniqueB.length) {
                const bNorm = uniqueB[i] as string;
                const bHistory = processedRows.filter(r => r.aNorm === bNorm || (bIdx !== -1 && r.bNorm === bNorm));
                if (bHistory.length > 0) {
                    const bFirst = bHistory[0];
                    const bLast = bHistory[bHistory.length - 1];
                    Object.assign(rowData, {
                        'B Number': bNorm,
                        'B Date': bFirst.dt!.toLocaleDateString('en-GB'),
                        'B First Call': standardizeDateTime(bFirst.dt),
                        'B Last Call': standardizeDateTime(bLast.dt),
                        'B Count': bHistory.length
                    });
                }
            }
            results.push(rowData);
        }

        const outWb = new ExcelJS.Workbook();
        const wsOut = outWb.addWorksheet("Geo_Fencing_Results");

        const summaryHeaders = [
            'A Number', 'A Date', 'A First Call', 'A Last Call', 'A Count',
            'B Number', 'B Date', 'B First Call', 'B Last Call', 'B Count'
        ];

        const fullDataCols = headers.map(h => ({ header: h, key: `RAW_${h}`, width: 25 }));
        const summaryCols = summaryHeaders.map(h => ({ header: h, key: `SUM_${h}`, width: 25 }));

        wsOut.columns = [...fullDataCols, ...summaryCols];

        const maxRows = Math.max(fullMatchedOriginals.length, results.length);
        for (let i = 0; i < maxRows; i++) {
            const rowData: any = {};
            if (i < fullMatchedOriginals.length) {
                headers.forEach((h, idx) => {
                    let val = fullMatchedOriginals[i][idx];
                    const headerUpper = h.toUpperCase();
                    const isDateOrTimeCol = headerUpper.includes('TIME') || headerUpper.includes('DATE') || headerUpper.includes('STRT_TM') || headerUpper.includes('DATETIME');

                    if (val instanceof Date) {
                        val = standardizeDateTime(val);
                    } else if (isDateOrTimeCol && (typeof val === 'string' || typeof val === 'number')) {
                        const parsed = parseDateTime(val);
                        if (parsed) val = standardizeDateTime(parsed);
                    }
                    rowData[`RAW_${h}`] = val !== null && val !== undefined ? " " + String(val) : "";
                });
            }
            if (i < results.length) {
                const resRow = results[i];
                summaryHeaders.forEach(h => {
                    let val = resRow[h];
                    rowData[`SUM_${h}`] = val !== null && val !== undefined ? " " + String(val) : "";
                });
            }
            wsOut.addRow(rowData);
        }

        const headerRow = wsOut.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        
        // Dynamic Column Width and Color Coding
        wsOut.columns.forEach((col, idx) => {
            const headerCell = headerRow.getCell(idx + 1);
            const isSummary = idx >= headers.length;
            
            // Header Color: Blue for Raw, Green for Summary
            headerCell.fill = { 
                type: "pattern", 
                pattern: "solid", 
                fgColor: { argb: isSummary ? "FF92D050" : "FF4F81BD" } 
            };
            headerCell.alignment = { horizontal: "center", vertical: "middle" };

            // Calculate Max Length for this column
            let maxLen = String(headerCell.value || "").length;
            wsOut.eachRow({ includeEmpty: false }, (row) => {
                const cell = row.getCell(idx + 1);
                const cellValue = String(cell.value || "");
                if (cellValue.length > maxLen) maxLen = cellValue.length;
            });
            
            // Set width with some padding, capped at 50
            col.width = Math.min(Math.max(maxLen + 4, 15), 50);
        });

        // Apply alignment to all data rows
        wsOut.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell(cell => {
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }
        });

        const outBuffer = await outWb.xlsx.writeBuffer();
        return new NextResponse(outBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="Geo_Fencing_Report_${Date.now()}.xlsx"`,
            },
        });

    } catch (error: any) {
        console.error("Geo Fencing Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}