"use client";

import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileSpreadsheet,
  FileText,
  UploadCloud,
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  Table as TableIcon,
  Zap,
  FileCheck2,
  MessageSquare,
  Share2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface MergedRecord {
  _id: string;
  _sourceFile: string;
  _category: "ownership" | "location" | "general";
  [key: string]: any;
}

interface ExcelDataMergerProps {
  onExportNumbersToGenerator?: (numbers: string[]) => void;
}

// Clean and preserve numbers (no scientific notation for CNIC, Mobile, IMSI, IMEI)
function cleanCellValue(val: any): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return BigInt(val).toString();
    }
    return val.toString();
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  // Check if string is scientific notation e.g. 9.23061E+11 or 3.83016E+12
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      const num = Number(str);
      if (Number.isInteger(num)) return BigInt(Math.round(num)).toString();
    } catch {}
  }
  return str;
}

// Normalize Pakistani mobile number to 92...
function formatTo92(num: string): string {
  const clean = num.replace(/\D/g, "");
  if (clean.length < 10) return num;
  if (clean.startsWith("92") && clean.length === 12) return clean;
  if (clean.startsWith("03") && clean.length === 11) return "92" + clean.substring(1);
  if (clean.startsWith("3") && clean.length === 10) return "92" + clean;
  return clean;
}

// Format to 0300-1234567 for neat Pakistani viewing
function format03Dash(num: string): string {
  let s = String(num).replace(/\D/g, "");
  if (s.startsWith("923") && s.length === 12) {
    s = "0" + s.substring(2);
  } else if (s.startsWith("3") && s.length === 10) {
    s = "0" + s;
  }
  if (s.startsWith("03") && s.length === 11) {
    return s.substring(0, 4) + "-" + s.substring(4);
  }
  return num;
}

export default function ExcelDataMerger({ onExportNumbersToGenerator }: ExcelDataMergerProps) {
  const [fileList, setFileList] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords] = useState<MergedRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState<"all" | "ownership" | "location" | "general">("all");
  // Default format is "whatsapp" as requested by user
  const [notepadFormat, setNotepadFormat] = useState<"whatsapp" | "tsv" | "cards" | "pipes">("whatsapp");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<"notepad" | "table">("notepad");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse uploaded files
  const parseFiles = async (filesToAdd: File[]) => {
    if (!filesToAdd.length) return;
    setIsProcessing(true);
    const newRecords: MergedRecord[] = [];
    let recordCounter = records.length;

    try {
      for (const file of filesToAdd) {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array", raw: true });

          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true });
            if (!rawData || rawData.length === 0) continue;

            const rawHeaders = (rawData[0] || []).map(h => String(h || "").trim()).filter(Boolean);
            if (rawHeaders.length === 0) continue;

            for (let rIdx = 1; rIdx < rawData.length; rIdx++) {
              const row = rawData[rIdx];
              if (!row || row.length === 0 || row.every(c => c === "" || c == null)) continue;

              recordCounter++;
              const recordObj: MergedRecord = {
                _id: `rec-${recordCounter}-${Date.now()}`,
                _sourceFile: file.name,
                _category: "general"
              };

              rawHeaders.forEach((h, colIdx) => {
                let val = cleanCellValue(row[colIdx]);
                if (/^(msisdn|mobile\s*no|phone|cell\s*no|number)$/i.test(h)) {
                  val = formatTo92(val);
                }
                recordObj[h] = val;
              });

              // Detect category
              const keys = Object.keys(recordObj);
              const isOwnership = keys.some(k => /msisdn|owner/i.test(k));
              const isLocation = keys.some(k => /latitude|cell\s*id|lac\s*id|gmlc/i.test(k));

              if (isOwnership && !isLocation) {
                recordObj._category = "ownership";
              } else if (isLocation) {
                recordObj._category = "location";
              } else {
                recordObj._category = "general";
              }

              newRecords.push(recordObj);
            }
          }
        } catch (err: any) {
          console.error(`Error reading ${file.name}:`, err);
          toast.error(`Error reading ${file.name}: ${err?.message || "Invalid Excel file"}`);
        }
      }

      setRecords(prev => [...prev, ...newRecords]);
      setFileList(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const added = filesToAdd.filter(f => !existingNames.has(f.name));
        return [...prev, ...added];
      });

      toast.success(`Processed ${filesToAdd.length} files (${newRecords.length} records extracted)!`);
    } catch (error: any) {
      toast.error("Failed to parse files: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setFileList(prev => prev.filter(f => f.name !== fileName));
    setRecords(prev => prev.filter(r => r._sourceFile !== fileName));
    toast.info(`Removed ${fileName}`);
  };

  const handleClearAll = () => {
    setFileList([]);
    setRecords([]);
    toast.info("Cleared all files and records.");
  };

  // Determine category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: records.length, ownership: 0, location: 0, general: 0 };
    records.forEach(r => {
      counts[r._category]++;
    });
    return counts;
  }, [records]);

  // Filtered records by category & search
  const filteredRecords = useMemo(() => {
    let list = records;
    if (activeCategory !== "all") {
      list = list.filter(r => r._category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        return Object.entries(r).some(([k, v]) => {
          if (k.startsWith("_")) return false;
          return String(v).toLowerCase().includes(q);
        });
      });
    }
    return list;
  }, [records, activeCategory, searchQuery]);

  // Headers for current filtered records
  const currentHeaders = useMemo(() => {
    const set = new Set<string>();
    const order: string[] = [];
    filteredRecords.forEach(r => {
      Object.keys(r).forEach(k => {
        if (!k.startsWith("_") && !set.has(k)) {
          set.add(k);
          order.push(k);
        }
      });
    });
    return order;
  }, [filteredRecords]);

  // ─── WHATSAPP FORMAT BUILDER ──────────────────────────────────────────
  const generateWhatsAppMessage = (rows: MergedRecord[]): string => {
    if (!rows.length) return "";

    const lines: string[] = [];
    const isOnlyOwnership = rows.every(r => r._category === "ownership");
    const isOnlyLocation = rows.every(r => r._category === "location");

    // Header Title
    if (isOnlyOwnership) {
      lines.push("*📋 SUBSCRIBER OWNERSHIP REPORT*");
    } else if (isOnlyLocation) {
      lines.push("*📍 CELL LOCATION & TRACKING REPORT*");
    } else {
      lines.push("*📋 CONSOLIDATED TELECOM REPORT*");
    }
    lines.push(`*Total Records:* ${rows.length}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━━━");

    rows.forEach((r, idx) => {
      const numRaw = r["Mobile No"] || r["Msisdn"] || r["MSISDN"] || r["Phone"] || "";
      const displayNum = numRaw ? formatTo92(numRaw) : `Record #${idx + 1}`;

      // Serial + Number Header (Always 92 format)
      lines.push(`*${idx + 1}.* 📱 *${displayNum}*`);

      if (r._category === "ownership") {
        // Ownership details
        const handled = new Set<string>();
        const markHandled = (key: string) => handled.add(key.toLowerCase().trim());

        // Helper to get case-insensitive value
        const getVal = (aliases: string[]) => {
          for (const a of aliases) {
            markHandled(a);
            for (const k of Object.keys(r)) {
              if (k.toLowerCase().trim() === a.toLowerCase().trim()) {
                markHandled(k);
                const v = r[k];
                if (v && v !== "null" && v !== "undefined" && v !== "N/A") return String(v).trim();
              }
            }
          }
          return null;
        };

        const name = getVal(["Owner Name", "Name", "Customer Name"]);
        const cnic = getVal(["Owner CNIC", "CNIC", "Cnic No", "Cnic"]);
        const city = getVal(["City", "District", "Tehsil"]);
        const address = getVal(["Owner Address", "Address", "Permanent Address", "Present Address"]);
        let activationDate = getVal(["SIM Activation Date", "Activation Date", "Act Date"]);
        if (activationDate && activationDate.includes("T")) {
          activationDate = activationDate.split("T")[0];
        }
        const connType = getVal(["Conn Type", "Connection Type", "Type"]);
        const channelName = getVal(["Channel Name", "Channel", "Franchise", "Retailer Name"]);
        const channelAddress = getVal(["Channel Address", "Franchise Address"]);
        const bvsId = getVal(["Bvs Id", "BVS ID", "Bvs"]);
        const imsi = getVal(["Imsi", "IMSI"]);
        const iccId = getVal(["Icc Id", "ICCID", "Sim No", "Sim #"]);
        let createDate = getVal(["Create Date", "Created Date"]);
        if (createDate && createDate.includes("T")) {
          createDate = createDate.split("T")[0];
        }

        if (name) lines.push(`👤 *Name:* ${name}`);
        if (cnic) lines.push(`🆔 *CNIC:* ${cnic}`);
        if (city) lines.push(`🏙️ *City:* ${city}`);
        if (address) lines.push(`🏠 *Address:* ${address}`);
        if (activationDate) lines.push(`📅 *Activated:* ${activationDate}`);
        if (connType) lines.push(`💳 *Conn Type:* ${connType}`);
        if (channelName) lines.push(`🏪 *Channel:* ${channelName}`);
        if (channelAddress) lines.push(`📍 *Channel Address:* ${channelAddress}`);
        if (bvsId) lines.push(`🔐 *BVS ID:* ${bvsId}`);
        if (imsi) lines.push(`📡 *IMSI:* ${imsi}`);
        if (iccId) lines.push(`🔢 *ICCID:* ${iccId}`);
        if (createDate) lines.push(`📅 *Create Date:* ${createDate}`);

        // Mark phone numbers as handled
        ["msisdn", "mobile no", "mobile", "phone", "number"].forEach(markHandled);

        // Dynamically append any remaining extra columns
        Object.keys(r).forEach(k => {
          if (k.startsWith("_")) return;
          if (!handled.has(k.toLowerCase().trim())) {
            const val = r[k];
            if (val && val !== "null" && val !== "undefined" && val !== "N/A") {
              lines.push(`• *${k}:* ${val}`);
            }
          }
        });
      } else if (r._category === "location") {
        // Location details
        const lat = r["Latitude"];
        const lon = r["Longitude"];
        const address = r["Address"];
        const cellId = r["Cell ID"];
        const lacId = r["LAC ID"];
        const age = r["Location Age"];
        const state = r["Subscriber State"];
        const imei = r["IMEI"];
        const imsi = r["IMSI"];

        const isPurged =
          (state && /purged/i.test(state)) ||
          (lat && /purged/i.test(lat)) ||
          (address && /purged/i.test(address));

        if (isPurged) {
          lines.push(`⚠️ *Status:* ${state || "Subscriber Purged / Inactive"}`);
          if (imsi && imsi !== "N/A" && imsi !== "purged") lines.push(`📡 *IMSI:* ${imsi}`);
          if (imei && imei !== "N/A" && imei !== "purged") lines.push(`📱 *IMEI:* ${imei}`);
        } else {
          if (address && address !== "N/A") lines.push(`🏠 *Address:* ${address}`);

          const cellInfo: string[] = [];
          if (cellId && cellId !== "N/A") cellInfo.push(`*Cell ID:* ${cellId}`);
          if (lacId && lacId !== "N/A") cellInfo.push(`*LAC ID:* ${lacId}`);
          if (cellInfo.length) lines.push(`📡 ${cellInfo.join("  |  ")}`);

          if (age && age !== "N/A") lines.push(`⏱️ *Age:* ${age}`);

          const validLat = lat && !isNaN(Number(lat)) && lat !== "N/A";
          const validLon = lon && !isNaN(Number(lon)) && lon !== "N/A";
          if (validLat && validLon) {
            lines.push(`🌐 *GPS:* ${lat}, ${lon}`);
            lines.push(`🗺️ *Map:* https://maps.google.com/?q=${lat},${lon}`);
          }
          if (imei && imei !== "N/A" && imei !== "purged") lines.push(`📱 *IMEI:* ${imei}`);
        }

        // Dynamically append any remaining extra columns in location files
        const handledLoc = new Set([
          "msisdn", "mobile no", "mobile", "phone", "number",
          "latitude", "longitude", "address", "cell id", "lac id",
          "location age", "subscriber state", "imei", "imsi"
        ]);
        Object.keys(r).forEach(k => {
          if (k.startsWith("_")) return;
          if (!handledLoc.has(k.toLowerCase().trim())) {
            const val = r[k];
            if (val && val !== "null" && val !== "undefined" && val !== "N/A" && val !== "purged") {
              lines.push(`• *${k}:* ${val}`);
            }
          }
        });
      } else {
        // General columns
        currentHeaders.forEach(h => {
          const val = r[h];
          if (val && !/msisdn|mobile\s*no/i.test(h)) {
            lines.push(`• *${h}:* ${val}`);
          }
        });
      }

      lines.push("━━━━━━━━━━━━━━━━━━━━━━");
    });

    return lines.join("\n");
  };

  // Generate Notepad Text according to format
  const notepadText = useMemo(() => {
    if (!filteredRecords.length) return "";

    if (notepadFormat === "whatsapp") {
      return generateWhatsAppMessage(filteredRecords);
    }

    if (notepadFormat === "tsv") {
      // Tab-separated: Perfect for direct paste into Notepad and Excel
      const headerLine = ["#", "Source File", ...currentHeaders].join("\t");
      const lines = filteredRecords.map((r, idx) => {
        const values = currentHeaders.map(h => r[h] ?? "");
        return [idx + 1, r._sourceFile, ...values].join("\t");
      });
      return [headerLine, ...lines].join("\n");
    }

    if (notepadFormat === "cards") {
      // Clean Case Diary / Text Block format
      return filteredRecords.map((r, idx) => {
        const mainNum = r["Mobile No"] || r["Msisdn"] || r["MSISDN"] || r["Phone"] || "";
        const formattedNum = mainNum ? formatTo92(mainNum) : "";
        const name = r["Owner Name"] || r["Name"] || "";

        const border = "------------------------------------------------------------";
        const headerText = `[RECORD #${idx + 1}] ${formattedNum ? formattedNum + " " : ""}${name ? "- " + name : ""}`;

        const fieldLines: string[] = [];
        currentHeaders.forEach(h => {
          const val = r[h];
          if (val) {
            fieldLines.push(`${h.padEnd(18)}: ${val}`);
          }
        });

        return [headerText, border, ...fieldLines].join("\n");
      }).join("\n\n" + "=".repeat(60) + "\n\n");
    }

    if (notepadFormat === "pipes") {
      // Single line pipe delimited
      const headerLine = ["#", "Source File", ...currentHeaders].join(" | ");
      const lines = filteredRecords.map((r, idx) => {
        const values = currentHeaders.map(h => r[h] || "-");
        return [idx + 1, r._sourceFile, ...values].join(" | ");
      });
      return [headerLine, ...lines].join("\n");
    }

    return "";
  }, [filteredRecords, currentHeaders, notepadFormat]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!notepadText) {
      toast.error("No text available to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(notepadText);
      setCopied(true);
      toast.success(
        notepadFormat === "whatsapp"
          ? "Copied! Ready to paste into WhatsApp directly."
          : notepadFormat === "tsv"
          ? "Copied table! Press Ctrl+V in Excel to paste directly into cells."
          : "Copied to clipboard!"
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  // Direct Share to WhatsApp Web / App
  const handleShareToWhatsApp = () => {
    if (!notepadText) {
      toast.error("No data available to share.");
      return;
    }
    const encText = encodeURIComponent(notepadText);
    const waUrl = `https://api.whatsapp.com/send?text=${encText}`;
    window.open(waUrl, "_blank");
  };

  // Download Notepad Text (.txt)
  const handleDownloadTxt = () => {
    if (!notepadText) {
      toast.error("No data to download.");
      return;
    }
    const blob = new Blob([notepadText], { type: "text/plain;charset=utf-8" });
    const fileName = `Merged_${activeCategory}_${new Date().toISOString().slice(0, 10)}.txt`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fileName}`);
  };

  // Download Merged Excel (.xlsx)
  const handleDownloadExcel = async () => {
    if (!records.length) {
      toast.error("No data to export to Excel.");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      const buildSheetForRecords = (recs: MergedRecord[], title: string) => {
        if (!recs.length) return null;
        const set = new Set<string>();
        const headers: string[] = ["Sr#", "Source File"];
        recs.forEach(r => {
          Object.keys(r).forEach(k => {
            if (!k.startsWith("_") && !set.has(k)) {
              set.add(k);
              headers.push(k);
            }
          });
        });

        const rows = recs.map((r, idx) => {
          return headers.map(h => {
            if (h === "Sr#") return idx + 1;
            if (h === "Source File") return r._sourceFile;
            return r[h] ?? "";
          });
        });

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Force string type on columns to prevent scientific notation in Excel
        Object.keys(ws).forEach(addr => {
          if (addr.startsWith("!")) return;
          const rowNum = parseInt(addr.replace(/[A-Z]/gi, ""), 10);
          if (rowNum > 1) {
            const cell = ws[addr];
            if (cell && cell.v !== undefined && cell.v !== null) {
              cell.t = "s";
              cell.v = String(cell.v);
            }
          }
        });

        // Set column widths
        ws["!cols"] = headers.map((h, i) => {
          let maxLen = h.length;
          rows.forEach(r => {
            const l = String(r[i] || "").length;
            if (l > maxLen) maxLen = l;
          });
          return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
        });

        XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
        return ws;
      };

      if (categoryCounts.ownership > 0 && categoryCounts.location > 0) {
        buildSheetForRecords(records.filter(r => r._category === "ownership"), "Ownership Records");
        buildSheetForRecords(records.filter(r => r._category === "location"), "Location Records");
        buildSheetForRecords(records, "All Merged Records");
      } else if (categoryCounts.ownership > 0) {
        buildSheetForRecords(records.filter(r => r._category === "ownership"), "Ownership Details");
      } else if (categoryCounts.location > 0) {
        buildSheetForRecords(records.filter(r => r._category === "location"), "Location Details");
      } else {
        buildSheetForRecords(records, "Merged Records");
      }

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const fileName = `Merged_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const base64 = Buffer.from(excelBuffer).toString("base64");
        const res = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents,
          recursive: true,
        });
        await Share.share({
          title: fileName,
          url: res.uri,
        });
        toast.success("Excel file saved and shared!");
      } else {
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${fileName}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate Excel file: " + err.message);
    }
  };

  // Extract phone numbers and send to CDR Generator
  const handleExportNumbers = () => {
    const numberSet = new Set<string>();
    filteredRecords.forEach(r => {
      const candidates = [
        r["Mobile No"],
        r["Msisdn"],
        r["MSISDN"],
        r["Phone"],
        r["Number"],
        r["IMEI"],
      ];
      candidates.forEach(c => {
        if (c) {
          const clean = String(c).replace(/\D/g, "");
          if (clean.length === 15) {
            numberSet.add(clean);
          } else if (clean.length >= 10) {
            numberSet.add(formatTo92(clean));
          }
        }
      });
    });

    const numbersArray = Array.from(numberSet);
    if (!numbersArray.length) {
      toast.error("No valid mobile numbers or IMEIs found in the records.");
      return;
    }

    if (onExportNumbersToGenerator) {
      onExportNumbersToGenerator(numbersArray);
    } else {
      navigator.clipboard.writeText(numbersArray.join("\n"));
      toast.success(`${numbersArray.length} numbers copied to clipboard!`);
    }
  };

  return (
    <div className="flex flex-col space-y-2.5 text-slate-900 pb-12 animate-in fade-in duration-200">
      {/* 🔹 SLIM ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-800 tracking-tight">
            Excel Data Merger
          </span>
          {records.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400">
              • {records.length} record(s) from {fileList.length} file(s)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <>
              {onExportNumbersToGenerator && (
                <Button
                  onClick={handleExportNumbers}
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-xl text-[10px] font-black uppercase border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 transition-all gap-1.5 px-2.5"
                  title="Transfer all mobile numbers to CDR Generator"
                >
                  <Zap size={11} className="text-indigo-600 fill-indigo-600" />
                  Send to CDR
                </Button>
              )}

              <Button
                onClick={handleDownloadExcel}
                size="sm"
                className="h-7 rounded-xl text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all gap-1.5 px-2.5"
                title="Download consolidated Excel file (.xlsx)"
              >
                <Download size={11} />
                Download Excel (.xlsx)
              </Button>
            </>
          )}

          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="h-7 rounded-xl text-[10px] font-black uppercase bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all gap-1.5 px-2.5"
          >
            <UploadCloud size={12} />
            Add Excel Files
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* 🔹 MAIN SPLIT VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Upload Queue & Files List (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {/* Dropzone Card */}
          <Card
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[130px]",
              isDragOver
                ? "border-emerald-500 bg-emerald-50/50 scale-[1.01]"
                : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/20"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-1.5">
              <UploadCloud size={18} className={isDragOver ? "animate-bounce" : ""} />
            </div>
            <p className="text-[11px] font-black uppercase text-slate-700 tracking-tight">
              Drag & Drop Excel Files Here
            </p>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
              Select multiple Location or Ownership .xlsx files
            </p>
          </Card>

          {/* Files List Card */}
          <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1 min-h-[300px] max-h-[500px] bg-white">
            <CardHeader className="bg-slate-50 border-b py-2 px-3 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <FileCheck2 size={13} className="text-slate-500" />
                <CardTitle className="text-[10px] font-black uppercase text-slate-700 tracking-tight">
                  Uploaded Files ({fileList.length})
                </CardTitle>
              </div>

              {fileList.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[9px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                  title="Remove all files"
                >
                  <Trash2 size={11} />
                  Clear All
                </button>
              )}
            </CardHeader>

            <CardContent className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1.5">
              {fileList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 opacity-60">
                  <FileSpreadsheet size={28} className="mb-2 stroke-1" />
                  <p className="text-[10px] font-bold uppercase">No files loaded</p>
                  <p className="text-[8px] mt-0.5">Drop multiple files to merge them</p>
                </div>
              ) : (
                fileList.map((file, idx) => {
                  const fileRecordsCount = records.filter(r => r._sourceFile === file.name).length;
                  const isLocation = file.name.toLowerCase().includes("location");
                  const isOwnership = file.name.toLowerCase().includes("ownership");

                  return (
                    <div
                      key={file.name + idx}
                      className="group bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[8px] font-black tracking-tight",
                            isLocation
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : isOwnership
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-200 text-slate-700"
                          )}
                        >
                          {isLocation ? "LOC" : isOwnership ? "OWN" : "XLS"}
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <p className="text-[10px] font-mono font-bold text-slate-800 truncate leading-tight">
                            {file.name}
                          </p>
                          <p className="text-[8px] font-medium text-slate-400">
                            {fileRecordsCount} record(s) • {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-slate-300 group-hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-all shrink-0"
                        title="Remove file"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Output Workspace (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          {/* Controls Bar: Category Filters & Formats */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[9px] font-black uppercase">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  activeCategory === "all"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                All ({categoryCounts.all})
              </button>

              {categoryCounts.ownership > 0 && (
                <button
                  onClick={() => setActiveCategory("ownership")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeCategory === "ownership"
                      ? "bg-white text-emerald-700 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Ownership ({categoryCounts.ownership})
                </button>
              )}

              {categoryCounts.location > 0 && (
                <button
                  onClick={() => setActiveCategory("location")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeCategory === "location"
                      ? "bg-white text-blue-700 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Location ({categoryCounts.location})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[150px] max-w-[240px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, number, cnic..."
                className="h-7 pl-7 text-[10px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* View Switcher: Output View vs Table Grid */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[9px] font-black uppercase">
              <button
                onClick={() => setActiveView("notepad")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                  activeView === "notepad"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <MessageSquare size={11} />
                Message / Text
              </button>
              <button
                onClick={() => setActiveView("table")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                  activeView === "table"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <TableIcon size={11} />
                Table Grid
              </button>
            </div>
          </div>

          {/* 🔹 MAIN OUTPUT CARD */}
          <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[480px] bg-white">
            {/* WhatsApp Styled Header Bar */}
            <div className="bg-[#075E54] text-white px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <MessageSquare size={13} className="fill-white" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-tight block leading-tight">
                    {notepadFormat === "whatsapp" ? "WhatsApp Message Preview" : "Formatted Text Output"}
                  </span>
                  <span className="text-[9px] text-emerald-100/80 font-medium">
                    {filteredRecords.length} Record(s) Ready
                  </span>
                </div>
              </div>

              {/* Format Buttons & Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeView === "notepad" && (
                  <div className="flex bg-[#054c44] p-0.5 rounded-lg text-[8px] font-bold uppercase text-emerald-200">
                    <button
                      onClick={() => setNotepadFormat("whatsapp")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all flex items-center gap-1",
                        notepadFormat === "whatsapp" ? "bg-[#25D366] text-slate-900 shadow-xs font-black" : "hover:text-white"
                      )}
                      title="Clean WhatsApp message with bold labels, emojis and map links"
                    >
                      💬 WhatsApp
                    </button>
                    <button
                      onClick={() => setNotepadFormat("tsv")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all flex items-center gap-1",
                        notepadFormat === "tsv" ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-white"
                      )}
                      title="Excel table format (tab-separated) — copy and paste directly into Excel cells"
                    >
                      📊 Excel Table
                    </button>
                    <button
                      onClick={() => setNotepadFormat("cards")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all",
                        notepadFormat === "cards" ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-white"
                      )}
                      title="Clean Diary / Case File Text"
                    >
                      Case Diary
                    </button>
                  </div>
                )}

                {/* Copy Button */}
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className={cn(
                    "h-7 rounded-lg text-[9px] font-black uppercase shadow-xs transition-all gap-1 px-2.5",
                    copied
                      ? "bg-white text-emerald-700"
                      : "bg-[#25D366] hover:bg-[#20bd5a] text-slate-900"
                  )}
                  title={notepadFormat === "tsv" ? "Copy table to paste in Excel" : "Copy full message to paste anywhere"}
                >
                  {copied ? <Check size={11} className="stroke-[3]" /> : <Copy size={11} />}
                  {copied ? "Copied!" : (notepadFormat === "tsv" ? "Copy Excel Table" : "Copy WhatsApp Msg")}
                </Button>

                {/* Direct Share on WhatsApp */}
                {notepadFormat === "whatsapp" && (
                  <Button
                    onClick={handleShareToWhatsApp}
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg text-[9px] font-black uppercase bg-[#128C7E] hover:bg-[#0f7a6e] text-white gap-1 px-2.5 transition-all"
                    title="Open directly in WhatsApp Web or App"
                  >
                    <Share2 size={11} />
                    Share
                  </Button>
                )}

                {/* Download Merged Excel (.xlsx) */}
                <Button
                  onClick={handleDownloadExcel}
                  size="sm"
                  className="h-7 rounded-lg text-[9px] font-black uppercase bg-[#128C7E] hover:bg-[#0f7a6e] text-white gap-1 px-2.5 transition-all shadow-xs"
                  title="Download complete merged Excel file (.xlsx)"
                >
                  <Download size={11} />
                  Excel (.xlsx)
                </Button>

                {/* Download TXT */}
                <Button
                  onClick={handleDownloadTxt}
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-lg text-[9px] font-black uppercase bg-black/20 hover:bg-black/40 text-emerald-100 gap-1 px-2 transition-all"
                  title="Download as .txt Notepad file"
                >
                  <Download size={11} />
                  TXT
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto custom-scrollbar flex flex-col bg-[#ECE5DD]/40">
              {filteredRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-xs">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                    No Files Added Yet
                  </h3>
                  <p className="text-[10px] text-slate-400 max-w-xs">
                    Drag and drop your Location or Ownership Excel files on the left to see the clean WhatsApp message here.
                  </p>
                </div>
              ) : activeView === "notepad" ? (
                <div className="p-4 flex-1 flex flex-col">
                  {/* WhatsApp Chat Bubble Style Box */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                        <span>Format: {notepadFormat === "tsv" ? "EXCEL TABLE" : notepadFormat.toUpperCase()}</span>
                        <span>•</span>
                        <span>{filteredRecords.length} Items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {notepadFormat === "tsv" ? (
                          <button
                            onClick={handleDownloadExcel}
                            className="text-[9px] text-emerald-700 font-black bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 transition-all"
                          >
                            <Download size={10} />
                            Download .xlsx File
                          </button>
                        ) : (
                          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Ready to Copy & Paste
                          </span>
                        )}
                      </div>
                    </div>

                    <textarea
                      readOnly
                      value={notepadText}
                      className="w-full flex-1 bg-transparent text-slate-800 font-mono text-[12px] leading-relaxed border-none outline-none resize-none select-text custom-scrollbar selection:bg-[#25D366]/30"
                      style={{ minHeight: "400px" }}
                    />
                  </div>
                </div>
              ) : (
                /* Interactive Table View */
                <div className="w-full flex-1 overflow-auto custom-scrollbar bg-white">
                  <table className="w-full border-collapse text-[10px] font-mono text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 font-black text-slate-700 uppercase border-r border-slate-200 w-10 text-center">
                          #
                        </th>
                        <th className="py-2 px-3 font-black text-slate-700 uppercase border-r border-slate-200 min-w-[150px]">
                          Source File
                        </th>
                        {currentHeaders.map(h => (
                          <th
                            key={h}
                            className="py-2 px-3 font-black text-slate-700 uppercase border-r border-slate-200 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((r, idx) => (
                        <tr key={r._id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-1.5 px-3 border-r border-slate-100 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-100 text-slate-500 truncate max-w-[180px]" title={r._sourceFile}>
                            {r._sourceFile}
                          </td>
                          {currentHeaders.map(h => (
                            <td
                              key={h}
                              className="py-1.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-800 font-medium"
                            >
                              {r[h] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
