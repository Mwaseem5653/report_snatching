import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";
import { deleteFileFromStorageServer } from "@/lib/storageAdmin";

export const maxDuration = 300; // 5 minutes timeout for processing large CDR files
export const dynamic = "force-dynamic";

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
        // 🚀 FIX: ExcelJS parses native Excel date/time cells into UTC-anchored Date
        // objects (the correct wall-clock values live in the UTC getters). The rest of
        // this code reads dates using LOCAL getters (getHours/getDate/toLocaleDateString).
        // On a server not running in the UTC timezone, that mismatch silently shifted
        // near-midnight timestamps to the next calendar day — exactly the "date changes
        // after 12" symptom. Rebuild the Date from its UTC components so every local
        // getter used elsewhere in the code returns the correct, timezone-independent value.
        return new Date(
            val.getUTCFullYear(),
            val.getUTCMonth(),
            val.getUTCDate(),
            val.getUTCHours(),
            val.getUTCMinutes(),
            val.getUTCSeconds()
        );
    }
    
    let s = String(val).trim();
    
    // 🚀 Handle Excel serial number (Date + Time or just Time)
    if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) {
        let num = parseFloat(s);
        
        // Date range: 1970 to 2060
        if (num > 25569 && num < 100000) {
            // 🚀 FIX: build the date from its Year/Month/Day/Hour/Min/Sec components
            // directly instead of constructing via epoch-ms + a local-timezone-offset
            // "correction". The old approach depended on the server process's runtime
            // timezone (TZ) matching an unstated assumption — on hosts that don't run in
            // that timezone (e.g. Vercel/UTC), it silently rolled near-midnight timestamps
            // over to the next calendar date. This version is timezone-independent.
            const totalDays = Math.floor(num);
            const fractionalDay = num - totalDays;
            const baseUtcMs = (totalDays - 25569) * 86400 * 1000;
            const baseDate = new Date(baseUtcMs);
            const year = baseDate.getUTCFullYear();
            const month = baseDate.getUTCMonth();
            const day = baseDate.getUTCDate();

            const totalSeconds = Math.round(fractionalDay * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return new Date(year, month, day, hours, minutes, seconds);
        }
        
        // Time only (fraction of a day)
        if (num >= 0 && num < 1) {
            // 🚀 FIX: same timezone-independent approach as above.
            const totalSeconds = Math.round(num * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return new Date(2000, 0, 1, hours, minutes, seconds);
        }
    }

    // Clean up typos & dots in AM/PM (e.g. "a.m." -> "am", "2026:58 PM" -> "2026 00:58 PM", "12:02: AM" -> "12:02 AM")
    const cleaned = s.replace(/\./g, '')
                     .replace(/(\d{4}):(\d{1,2}\s*(?:AM|PM|am|pm|A|P|a|p))/i, '$1 00:$2')
                     .replace(/(\d{4}):/g, '$1 ')
                     .replace(/:\s*(AM|PM|A|P|am|pm|a|p)/i, ' $1')
                     .replace(/\s+/g, ' ');

    // 🚀 Handle M/D/YYYY (US format — Zong CDR) — must be checked BEFORE DD/MM/YYYY
    // because "8/17/2026" has second segment=17 (> 12) which proves it is M/D/YYYY,
    // not DD/MM/YYYY. The old DD/MM path would treat day=8 month=17 → overflow → wrong year.
    const matchMDYY = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|A|P|am|pm|a|p)?)?/i);
    if (matchMDYY) {
        const seg1 = parseInt(matchMDYY[1], 10);
        const seg2 = parseInt(matchMDYY[2], 10);
        // If seg2 > 12 it cannot be a month → this is definitely M/D/YYYY
        if (seg2 > 12) {
            const month = seg1 - 1;
            const day = seg2;
            const year = parseInt(matchMDYY[3], 10);
            let hour = matchMDYY[4] ? parseInt(matchMDYY[4], 10) : 0;
            const min = matchMDYY[5] ? parseInt(matchMDYY[5], 10) : 0;
            const sec = matchMDYY[6] ? parseInt(matchMDYY[6], 10) : 0;
            const ampmRaw = matchMDYY[7] ? matchMDYY[7].toUpperCase() : null;
            let ampm = ampmRaw === "A" ? "AM" : ampmRaw === "P" ? "PM" : ampmRaw;
            if (ampm === "PM" && hour < 12) hour += 12;
            if (ampm === "AM" && hour === 12) hour = 0;
            const dt = new Date(year, month, day, hour, min, sec);
            if (!isNaN(dt.getTime())) return dt;
        }
    }

    // 🚀 Explicitly handle DD/MM/YYYY or DD-MM-YYYY format (Pakistani/UK CDR standard)
    const matchDDMM = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|A|P|am|pm|a|p)?)?/i);

    if (matchDDMM) {
        const day = parseInt(matchDDMM[1], 10);
        const month = parseInt(matchDDMM[2], 10) - 1;
        const year = parseInt(matchDDMM[3], 10);
        let hour = matchDDMM[4] ? parseInt(matchDDMM[4], 10) : 0;
        const min = matchDDMM[5] ? parseInt(matchDDMM[5], 10) : 0;
        const sec = matchDDMM[6] ? parseInt(matchDDMM[6], 10) : 0;
        const ampmRaw = matchDDMM[7] ? matchDDMM[7].toUpperCase() : null;

        let ampm = ampmRaw;
        if (ampmRaw === "A") ampm = "AM";
        if (ampmRaw === "P") ampm = "PM";

        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        const dt = new Date(year, month, day, hour, min, sec);
        if (!isNaN(dt.getTime())) return dt;
    }

    // 🚀 Explicitly handle YYYY-MM-DD or YYYY/MM/DD format
    const matchYYYYMM = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|A|P|am|pm|a|p)?)?/i);
    if (matchYYYYMM) {
        const year = parseInt(matchYYYYMM[1], 10);
        const month = parseInt(matchYYYYMM[2], 10) - 1;
        const day = parseInt(matchYYYYMM[3], 10);
        let hour = matchYYYYMM[4] ? parseInt(matchYYYYMM[4], 10) : 0;
        const min = matchYYYYMM[5] ? parseInt(matchYYYYMM[5], 10) : 0;
        const sec = matchYYYYMM[6] ? parseInt(matchYYYYMM[6], 10) : 0;
        const ampmRaw = matchYYYYMM[7] ? matchYYYYMM[7].toUpperCase() : null;

        let ampm = ampmRaw;
        if (ampmRaw === "A") ampm = "AM";
        if (ampmRaw === "P") ampm = "PM";

        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        const dt = new Date(year, month, day, hour, min, sec);
        if (!isNaN(dt.getTime())) return dt;
    }

    // Standard string parsing
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;

    // Fallback for custom formats (DD-MM-YYYY etc)
    const cleanStr = cleaned.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const parts = cleanStr.split(/\s+/).filter(p => p !== "");
    
    if (parts.length >= 3) {
        const numParts = parts.filter(p => /^\d+$/.test(p)).map(p => parseInt(p, 10));
        if (numParts.length >= 3) {
            let day = numParts[0] > 31 ? numParts[2] : numParts[0];
            let month = (numParts[0] > 31 ? numParts[1] : numParts[1]) - 1;
            let year = numParts[0] > 1000 ? numParts[0] : (numParts[2] > 1000 ? numParts[2] : 2000 + numParts[2]);
            
            let hour = 0, min = 0, sec = 0;
            if (numParts.length >= 5) {
                hour = numParts[numParts.length - (numParts.length === 5 ? 2 : 3)];
                min = numParts[numParts.length - (numParts.length === 5 ? 1 : 2)];
                if (numParts.length >= 6) sec = numParts[numParts.length - 1];
                
                if (cleaned.toUpperCase().includes("PM") && hour < 12) hour += 12;
                if (cleaned.toUpperCase().includes("AM") && hour === 12) hour = 0;
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
    const upperHeaders = headers.map(h => String(h || "").trim().toUpperCase());
    
    // Pass 1: Exact match
    for (const cand of candidates) {
        const candUpper = cand.trim().toUpperCase();
        const foundIdx = upperHeaders.indexOf(candUpper);
        if (foundIdx !== -1) return headers[foundIdx];
    }

    // Pass 2: Normalized match (alphanumeric only)
    for (const cand of candidates) {
        const candNorm = cand.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!candNorm) continue;
        const foundIdx = upperHeaders.findIndex(h => h.replace(/[^A-Z0-9]/g, "") === candNorm);
        if (foundIdx !== -1) return headers[foundIdx];
    }

    // Pass 3: Substring match (candidate inside header or header inside candidate)
    for (const cand of candidates) {
        const candUpper = cand.trim().toUpperCase();
        if (candUpper.length < 2) continue; // skip single letters to avoid false positives
        const foundIdx = upperHeaders.findIndex(h => h.includes(candUpper) || (h.length >= 3 && candUpper.includes(h)));
        if (foundIdx !== -1) return headers[foundIdx];
    }

    return null;
}

function findTableHeaders(rows: any[][]) {
    const keywords = [
        'dld_no', 'msisdn', 'a-party', 'a_number', 'a_party', 'a', 'dld no', 'phone', 'number', 'msisdn_a', 
        'a party', 'a.party', 'source_addr', 'call_dialed_num', 'b-party', 'b_party', 'b_number', 'b', 'dlg no',
        'date and time', 'start_time', 'call_time', 'datetime', 'str tm', 'time', 'strt_tm', 'usage_start_date',
        'calling', 'called', 'duration', 'date', 'party', 'source', 'destination', 'dt_tm', 'timestamp'
    ];
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        if (!rows[i] || !Array.isArray(rows[i])) continue;
        const values = rows[i].map(v => String(v || "").trim().toLowerCase());
        const matchCount = values.filter(v => keywords.some(k => v.includes(k))).length;
        if (matchCount >= 2) return { index: i, headers: rows[i].map(h => String(h || "").trim()) };
    }
    return { index: 0, headers: rows[0] ? rows[0].map(h => String(h || "").trim()) : [] };
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseTextToRows(buffer: Buffer): any[][] {
    let text = buffer.toString('utf-8');
    // Check for UTF-16 encoding (contains null bytes)
    if (text.includes('\0')) {
        text = buffer.toString('utf16le');
    }
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    const lines = text.split(/\r?\n/);
    const rows: any[][] = [];

    // Scan first 3 lines to find the delimiter with highest column count
    let delimiter = ',';
    let maxDelimCount = 0;

    for (let i = 0; i < Math.min(lines.length, 3); i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;
        const tabs = (line.match(/\t/g) || []).length;
        const commas = (line.match(/,/g) || []).length;
        const pipes = (line.match(/\|/g) || []).length;
        const semicolons = (line.match(/;/g) || []).length;

        const maxInLine = Math.max(tabs, commas, pipes, semicolons);
        if (maxInLine > maxDelimCount) {
            maxDelimCount = maxInLine;
            if (tabs === maxInLine) delimiter = '\t';
            else if (pipes === maxInLine) delimiter = '|';
            else if (semicolons === maxInLine) delimiter = ';';
            else if (commas === maxInLine) delimiter = ',';
        }
    }

    // Fallback if no standard delimiter punctuation found but lines have multiple spaces
    const useMultiSpace = maxDelimCount === 0;

    for (const line of lines) {
        if (!line || !line.trim()) continue;
        
        let rowCells: string[] = [];
        if (useMultiSpace) {
            rowCells = line.trim().split(/\s{2,}/).map(cell => cell.trim().replace(/^"|"$/g, ''));
        } else if (delimiter === ',') {
            rowCells = parseCsvLine(line);
        } else {
            rowCells = line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
        }
        rows.push(rowCells);
    }

    return rows;
}

import { Readable } from "stream";

export async function POST(req: NextRequest) {
    let publicIdToClean = "";
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("sessionToken")?.value;
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const decoded: any = jwt.verify(token, SECRET);
  
      // 🚀 LOG USAGE
      await logToolUsage(decoded, "Geo Fencing");
  
      const formData = await req.formData();

      // 🚀 Cloudinary-based file handling (same as Excel Analyzer)
      const cloudinaryUrl = formData.get("cloudinaryUrl") as string;
      const cloudinaryPublicId = formData.get("cloudinaryPublicId") as string;
      const fileName = formData.get("fileName") as string;
      const fromTime = formData.get("fromTime") as string;
      const fromPeriod = formData.get("fromPeriod") as string;
      const toTime = formData.get("toTime") as string;
      const toPeriod = formData.get("toPeriod") as string;
      const includeB = formData.get("includeB") === "true";

      if (!cloudinaryUrl) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      publicIdToClean = cloudinaryPublicId || "";
      
      // 🚀 Deduct 10 General Tokens
      const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 10);
      if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });

      // 🚀 Download file from Cloudinary
      const fileRes = await fetch(cloudinaryUrl);
      if (!fileRes.ok) throw new Error("Failed to download file from Cloudinary");
      const buffer = await fileRes.arrayBuffer();

      const fileNameLower = (fileName || "").toLowerCase();
      const isTextFile = fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".csv") || fileNameLower.endsWith(".tsv");
      const rawRows: any[][] = [];

      if (isTextFile) {
          const parsed = parseTextToRows(Buffer.from(buffer));
          rawRows.push(...parsed);
      } else {
          try {
              const wb = new ExcelJS.Workbook();
              await wb.xlsx.load(buffer);
              let ws = wb.worksheets[0];
              for (const sheet of wb.worksheets) {
                  if (sheet.rowCount > 1) {
                      ws = sheet;
                      break;
                  }
              }
              if (ws) {
                  ws.eachRow({ includeEmpty: true }, (row) => {
                      const rowData = Array.isArray(row.values) ? row.values.slice(1) : [];
                      const processedRow = (rowData as any[]).map(val => {
                          if (val && typeof val === 'object') {
                              if (val.result !== undefined) return val.result;
                              if (val instanceof Date) return val;
                              if (val.text !== undefined) return val.text;
                              return String(val);
                          }
                          return val === null || val === undefined ? "" : val;
                      });
                      rawRows.push(processedRow);
                  });
              }
          } catch (excelErr) {
              const parsed = parseTextToRows(Buffer.from(buffer));
              rawRows.push(...parsed);
          }
      }

    if (rawRows.length < 2) return NextResponse.json({ error: "Insufficient data in file" }, { status: 400 });

    const { index: headerIndex, headers } = findTableHeaders(rawRows);
    const dataRows = rawRows.slice(headerIndex + 1);

    const aCol = findColumn(headers, ['DLD_NO', 'MSISDN', 'A-Party', 'A_PARTY', 'A_NUMBER', 'A-NUMBER', 'A_NUM', 'A-NUM', 'A', 'DLD NO', 'PHONE', 'NUMBER', 'MSISDN_A', 'A Party', 'A.Party', 'SOURCE_ADDR', 'SOURCE_ADDR_A', 'SOURCE_NUMBER', 'CALLING_NO', 'CALLING_NUMBER', 'CALLING_NUM', 'CALLING_PARTY', 'ORIG_NO', 'ORIGINATING_NUM', 'ORIGINATING_NUMBER', 'MOBILE_NO', 'CELL_NO', 'PARTY_A', 'CHARGED_PARTY', 'CALLER']);
    const bCol = findColumn(headers, ['CALL_DIALED_NUM', 'DLG_NO', 'B-Party', 'B_PARTY', 'CALL_ORIG_NUM', 'B_NUMBER', 'B-NUMBER', 'B_NUM', 'B-NUM', 'B', 'DLG NO', 'MSISDN_B', 'B Party', 'B.Party', 'DEST_ADDR', 'DEST_NUMBER', 'CALLED_NO', 'CALLED_NUMBER', 'CALLED_NUM', 'CALLED_PARTY', 'TERMINATING_NUM', 'RECEIVER', 'PARTY_B', 'DIALED_NUM', 'DIALED_NUMBER', 'CALLEE']);
    const timeCol = findColumn(headers, ['Date And Time', 'DATE_TIME', 'DATE AND TIME', 'START_TIME', 'START TIME', 'CALL_TIME', 'CALL TIME', 'CALL_START_TIME', 'DATETIME', 'STR TM', 'TIME', 'STRT_TM', 'CALL_START_DT_TM', 'Call Date', 'CALL_DATE', 'Event Time', 'EVENT_TIME', 'USAGE_START_DATE', 'TIMESTAMP', 'DATE/TIME', 'DATE / TIME', 'DATE', 'TIME_STAMP', 'START_DT', 'CALL_DT', 'SETUP_TIME', 'REC_DATE_TIME']);
    // 🚀 NEW: Duration column, used for the "Exclusive To Time Period" sheets
    const durCol = findColumn(headers, ['DRTN', 'Duration', 'DURATION', 'CALL_DURATION', 'Call Duration', 'DURATION_SEC', 'Duration(Sec)', 'Duration (sec)', 'DUR', 'CALL_DUR']);

    if (!aCol || !timeCol) {
        const foundStr = headers.filter(h => h && h.trim()).join(", ");
        return NextResponse.json({ 
            error: `Required columns (A-Party and Time) not found. Detected headers in your file: [${foundStr || "None"}]` 
        }, { status: 400 });
    }

        const aIdx = headers.indexOf(aCol);
        const bIdx = bCol ? headers.indexOf(bCol) : -1;
        const tIdx = headers.indexOf(timeCol);
        const durIdx = durCol ? headers.indexOf(durCol) : -1; // 🚀 NEW

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
        const isOvernight = startMin > endMin;
        const windowRows = processedRows.filter(r => {
            if (isOvernight) {
                return r.minutes >= startMin || r.minutes <= endMin;
            }
            return r.minutes >= startMin && r.minutes <= endMin;
        });

        if (windowRows.length === 0) {
            return NextResponse.json({ error: `No valid records found between ${fromTime} ${fromPeriod} and ${toTime} ${toPeriod}. Check date format.` }, { status: 400 });
        }

        const fullMatchedOriginals = windowRows.map(r => r.original);

        // 🚀 OPTIMIZATION: Pre-index full history in Map for O(1) lookups (Prevents serverless timeouts on large files)
        const numberHistoryMap = new Map<string, typeof processedRows>();
        for (let i = 0; i < processedRows.length; i++) {
            const r = processedRows[i];
            if (r.aNorm) {
                let list = numberHistoryMap.get(r.aNorm);
                if (!list) { list = []; numberHistoryMap.set(r.aNorm, list); }
                list.push(r);
            }
            if (r.bNorm && r.bNorm !== r.aNorm) {
                let list = numberHistoryMap.get(r.bNorm);
                if (!list) { list = []; numberHistoryMap.set(r.bNorm, list); }
                list.push(r);
            }
        }

        const uniqueA = Array.from(new Set(windowRows.map(r => r.aNorm!)));
        const uniqueB = includeB
            ? Array.from(new Set(windowRows.map(r => r.bNorm).filter((b): b is string => b !== null)))
            : [];

        const aResults: any[] = [];
        for (const aNorm of uniqueA) {
            const history = numberHistoryMap.get(aNorm) || [];
            if (history.length === 0) continue;
            const first = history[0];
            const last = history[history.length - 1];
            aResults.push({
                'A Number': aNorm,
                'A Date': first.dt!.toLocaleDateString('en-GB'),
                'A First Call': standardizeDateTime(first.dt),
                'A Last Call': standardizeDateTime(last.dt),
                'A Count': history.length
            });
        }

        const bResults: any[] = [];
        if (includeB) {
            for (const bNorm of uniqueB) {
                const history = numberHistoryMap.get(bNorm) || [];
                if (history.length === 0) continue;
                const first = history[0];
                const last = history[history.length - 1];
                bResults.push({
                    'B Number': bNorm,
                    'B Date': first.dt!.toLocaleDateString('en-GB'),
                    'B First Call': standardizeDateTime(first.dt),
                    'B Last Call': standardizeDateTime(last.dt),
                    'B Count': history.length
                });
            }
        }

        const isInWindow = (minutes: number) => {
            if (isOvernight) {
                return minutes >= startMin || minutes <= endMin;
            }
            return minutes >= startMin && minutes <= endMin;
        };

        const getDurations = (history: typeof processedRows) => {
            if (durIdx === -1) return "";
            return history
                .map(r => {
                    const v = r.original[durIdx];
                    return (v === null || v === undefined || v === "") ? "" : String(v);
                })
                .join(" | ");
        };

        const exclusiveAResults: any[] = [];
        for (const aNorm of uniqueA) {
            const fullHistory = numberHistoryMap.get(aNorm) || [];
            if (fullHistory.length === 0) continue;
            const allInsideWindow = fullHistory.every(r => isInWindow(r.minutes));
            if (!allInsideWindow) continue;
            const first = fullHistory[0];
            const last = fullHistory[fullHistory.length - 1];
            exclusiveAResults.push({
                'A Number': aNorm,
                'A Date': first.dt!.toLocaleDateString('en-GB'),
                'A First Call': standardizeDateTime(first.dt),
                'A Last Call': standardizeDateTime(last.dt),
                'A Count': fullHistory.length,
                'A Duration': getDurations(fullHistory),
                _firstTs: first.dt!.getTime()
            });
        }
        const exclusiveAByCount = [...exclusiveAResults].sort((a, b) => b['A Count'] - a['A Count']);
        const exclusiveAByTime = [...exclusiveAResults].sort((a, b) => a._firstTs - b._firstTs);

        const exclusiveBResults: any[] = [];
        if (includeB) {
            for (const bNorm of uniqueB) {
                const fullHistory = numberHistoryMap.get(bNorm) || [];
                if (fullHistory.length === 0) continue;
                const allInsideWindow = fullHistory.every(r => isInWindow(r.minutes));
                if (!allInsideWindow) continue;
                const first = fullHistory[0];
                const last = fullHistory[fullHistory.length - 1];
                exclusiveBResults.push({
                    'B Number': bNorm,
                    'B Date': first.dt!.toLocaleDateString('en-GB'),
                    'B First Call': standardizeDateTime(first.dt),
                    'B Last Call': standardizeDateTime(last.dt),
                    'B Count': fullHistory.length,
                    'B Duration': getDurations(fullHistory),
                    _firstTs: first.dt!.getTime()
                });
            }
        }
        const exclusiveBByCount = [...exclusiveBResults].sort((a, b) => b['B Count'] - a['B Count']);
        const exclusiveBByTime = [...exclusiveBResults].sort((a, b) => a._firstTs - b._firstTs);

        const outWb = new ExcelJS.Workbook();

        // --- Sheet 1: ProvidedSheet (Original sheet analyzed - Put FIRST as requested) ---
        const wsProvided = outWb.addWorksheet("ProvidedSheet");
        rawRows.forEach((row, rowIdx) => {
            const newRow = wsProvided.getRow(rowIdx + 1);
            row.forEach((val, colIdx) => {
                let cellVal = val;
                if (cellVal && typeof cellVal === 'object') {
                    if ((cellVal as any).result !== undefined) cellVal = (cellVal as any).result;
                    else if ((cellVal as any).text !== undefined) cellVal = (cellVal as any).text;
                }
                newRow.getCell(colIdx + 1).value = cellVal;
            });
            newRow.commit();
        });

        // Column width auto-adjust for ProvidedSheet (sampling first 200 rows for speed)
        wsProvided.columns.forEach((col, idx) => {
            let maxLen = 15;
            let count = 0;
            wsProvided.eachRow({ includeEmpty: false }, (row) => {
                if (count++ > 200) return;
                const cell = row.getCell(idx + 1);
                const cellValue = String(cell.value || "");
                if (cellValue.length > maxLen) maxLen = cellValue.length;
            });
            col.width = Math.min(Math.max(maxLen + 4, 15), 50);
        });
        
        // --- Sheet 2: Result Summary (A-Party + B-Party as separate column groups, plus Raw Data) ---
        const wsSummary = outWb.addWorksheet("Result Summary");
        const summaryHeaders = [
            'A Number', 'A Date', 'A First Call', 'A Last Call', 'A Count',
            'B Number', 'B Date', 'B First Call', 'B Last Call', 'B Count'
        ];
        const SPACER_COL = summaryHeaders.length + 1; // column right after summary block
        const RAW_START_COL = SPACER_COL + 1;

        const headerRow1 = wsSummary.getRow(1);
        headerRow1.font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Fill Summary Headers
        summaryHeaders.forEach((h, idx) => {
            const cell = headerRow1.getCell(idx + 1);
            cell.value = h;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        // Fill Raw Data Headers (spacer column in between)
        headers.forEach((h: string, idx: number) => {
            const cell = headerRow1.getCell(SPACER_COL + idx + 1);
            cell.value = h;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalARows = aResults.length;
        const totalBRows = bResults.length;
        const totalRawRows = fullMatchedOriginals.length;
        const maxRows = Math.max(totalARows, totalBRows, totalRawRows);

        for (let i = 0; i < maxRows; i++) {
            const row = wsSummary.getRow(i + 2);

            // A-Party columns (1-5) — independent of B-Party, just its own list position
            if (i < totalARows) {
                const aRow = aResults[i];
                ['A Number', 'A Date', 'A First Call', 'A Last Call', 'A Count'].forEach((h, colIdx) => {
                    let val = aRow[h];
                    const cell = row.getCell(colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        if (h === "A Count" && typeof val === "number") {
                            cell.value = val;
                        } else {
                            cell.value = String(val);
                            cell.numFmt = '@';
                        }
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }

            // B-Party columns (6-10) — independent of A-Party, just its own list position
            if (includeB && i < totalBRows) {
                const bRow = bResults[i];
                ['B Number', 'B Date', 'B First Call', 'B Last Call', 'B Count'].forEach((h, colIdx) => {
                    let val = bRow[h];
                    const cell = row.getCell(5 + colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        if (h === "B Count" && typeof val === "number") {
                            cell.value = val;
                        } else {
                            cell.value = String(val);
                            cell.numFmt = '@';
                        }
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }

            // Raw Data columns — all matched raw rows dumped alongside (independent list)
            if (i < totalRawRows) {
                const rawRow = fullMatchedOriginals[i];
                headers.forEach((h: string, colIdx: number) => {
                    let val = rawRow[colIdx];
                    const headerUpper = h.toUpperCase();
                    const isDateOrTimeCol = headerUpper.includes('TIME') || headerUpper.includes('DATE') || headerUpper.includes('STRT_TM') || headerUpper.includes('DATETIME');

                    // 🚀 FIX: route Date objects through parseDateTime too (not just
                    // strings/numbers), so the same UTC-anchored-Date correction applies
                    // here — this raw-data dump was previously calling standardizeDateTime
                    // directly on the raw Date, skipping that correction and showing times
                    // shifted by the server's timezone offset (e.g. 1 hour ahead).
                    if (val instanceof Date || (isDateOrTimeCol && (typeof val === 'string' || typeof val === 'number'))) {
                        const parsed = parseDateTime(val);
                        if (parsed) val = standardizeDateTime(parsed);
                    }

                    const cell = row.getCell(SPACER_COL + colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        cell.value = String(val);
                        cell.numFmt = '@';
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }
        }

        // Column width auto-adjust for Sheet 2 (Result Summary)
        const totalCols = summaryHeaders.length + 1 + headers.length; // = 10 + 1 + headers.length
        for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
            if (colIdx === SPACER_COL) {
                wsSummary.getColumn(SPACER_COL).width = 4;
                continue;
            }
            let maxLen = 15;
            let count = 0;
            wsSummary.eachRow({ includeEmpty: false }, (row) => {
                if (count++ > 200) return;
                const cell = row.getCell(colIdx);
                const cellValue = String(cell.value || "");
                if (cellValue.length > maxLen) maxLen = cellValue.length;
            });
            wsSummary.getColumn(colIdx).width = Math.min(Math.max(maxLen + 4, 15), 50);
        }

        // --- Sheet 3: Exclusive To Time Period ---
        const wsExclusive = outWb.addWorksheet("Exclusive To Time Period");
        const exclusiveHeaders = [
            'A Number', 'A Date', 'A First Call', 'A Last Call', 'A Count', 'A Duration',
            'B Number', 'B Date', 'B First Call', 'B Last Call', 'B Count', 'B Duration'
        ];
        const EXCL_A_COLS = ['A Number', 'A Date', 'A First Call', 'A Last Call', 'A Count', 'A Duration'];
        const EXCL_B_COLS = ['B Number', 'B Date', 'B First Call', 'B Last Call', 'B Count', 'B Duration'];
        const EXCL_B_OFFSET = EXCL_A_COLS.length; // B block starts right after A block

        const exclHeaderRow = wsExclusive.getRow(1);
        exclHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        exclusiveHeaders.forEach((h, idx) => {
            const cell = exclHeaderRow.getCell(idx + 1);
            cell.value = h;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0504D" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalExclA = exclusiveAByCount.length;
        const totalExclB = exclusiveBByCount.length;
        const maxExclRows = Math.max(totalExclA, totalExclB);

        for (let i = 0; i < maxExclRows; i++) {
            const row = wsExclusive.getRow(i + 2);

            if (i < totalExclA) {
                const aRow = exclusiveAByCount[i];
                EXCL_A_COLS.forEach((h, colIdx) => {
                    let val = aRow[h];
                    const cell = row.getCell(colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        if (h === "A Count" && typeof val === "number") {
                            cell.value = val;
                        } else {
                            cell.value = String(val);
                            cell.numFmt = '@';
                        }
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }

            if (includeB && i < totalExclB) {
                const bRow = exclusiveBByCount[i];
                EXCL_B_COLS.forEach((h, colIdx) => {
                    let val = bRow[h];
                    const cell = row.getCell(EXCL_B_OFFSET + colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        if (h === "B Count" && typeof val === "number") {
                            cell.value = val;
                        } else {
                            cell.value = String(val);
                            cell.numFmt = '@';
                        }
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }
        }

        // Column width auto-adjust for Sheet 3 (sampling first 200 rows)
        for (let colIdx = 1; colIdx <= exclusiveHeaders.length; colIdx++) {
            let maxLen = 15;
            let count = 0;
            wsExclusive.eachRow({ includeEmpty: false }, (row) => {
                if (count++ > 200) return;
                const cell = row.getCell(colIdx);
                const cellValue = String(cell.value || "");
                if (cellValue.length > maxLen) maxLen = cellValue.length;
            });
            wsExclusive.getColumn(colIdx).width = Math.min(Math.max(maxLen + 4, 15), 50);
        }

        // --- Sheet 4: Exclusive To Time Period (By Time Sequence) ---
        const wsExclusiveByTime = outWb.addWorksheet("Exclusive (By Time)");
        exclusiveHeaders.forEach((h, idx) => {
            const cell = wsExclusiveByTime.getRow(1).getCell(idx + 1);
            cell.value = h;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0504D" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });
        wsExclusiveByTime.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        const totalExclATime = exclusiveAByTime.length;
        const totalExclBTime = exclusiveBByTime.length;
        const maxExclTimeRows = Math.max(totalExclATime, totalExclBTime);

        for (let i = 0; i < maxExclTimeRows; i++) {
            const row = wsExclusiveByTime.getRow(i + 2);

            if (i < totalExclATime) {
                const aRow = exclusiveAByTime[i];
                EXCL_A_COLS.forEach((h, colIdx) => {
                    let val = aRow[h];
                    const cell = row.getCell(colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        if (h === "A Count" && typeof val === "number") {
                            cell.value = val;
                        } else {
                            cell.value = String(val);
                            cell.numFmt = '@';
                        }
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }

            if (includeB && i < totalExclBTime) {
                const bRow = exclusiveBByTime[i];
                EXCL_B_COLS.forEach((h, colIdx) => {
                    let val = bRow[h];
                    const cell = row.getCell(EXCL_B_OFFSET + colIdx + 1);
                    if (val !== null && val !== undefined && val !== "") {
                        if (h === "B Count" && typeof val === "number") {
                            cell.value = val;
                        } else {
                            cell.value = String(val);
                            cell.numFmt = '@';
                        }
                    } else {
                        cell.value = "";
                    }
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                });
            }
        }

        // Column width auto-adjust for Sheet 4 (sampling first 200 rows)
        for (let colIdx = 1; colIdx <= exclusiveHeaders.length; colIdx++) {
            let maxLen = 15;
            let count = 0;
            wsExclusiveByTime.eachRow({ includeEmpty: false }, (row) => {
                if (count++ > 200) return;
                const cell = row.getCell(colIdx);
                const cellValue = String(cell.value || "");
                if (cellValue.length > maxLen) maxLen = cellValue.length;
            });
            wsExclusiveByTime.getColumn(colIdx).width = Math.min(Math.max(maxLen + 4, 15), 50);
        }

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
    } finally {
        // 🚀 Always delete file from Cloudinary after processing (success or failure)
        if (publicIdToClean) {
            await deleteFileFromStorageServer(publicIdToClean);
        }
    }
}