"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Search,
  Filter,
  History,
  Check
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { cn, getApiUrl } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { locationData } from "@/components/location/location";

export default function ApplicationToExcelClient() {
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [psName, setPsName] = useState("all");

  // Extract all PS names from locationData
  const allPS = Object.values(locationData).flatMap(city => 
    Object.values(city.districts).flatMap(district => district.ps)
  ).sort();

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["pending", "processed", "complete"]);
  const [period, setPeriod] = useState("all");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<{ count: number; lastFetch: Date | null }>({ count: 0, lastFetch: null });

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch(getApiUrl("/api/auth/create-session"));
      const data = await res.json();
      if (data.authenticated) {
          setCurrentUser(data);
      }
    }
    fetchSession();
  }, []);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const setAllStatuses = (checked: boolean) => {
    if (checked) {
      setSelectedStatuses(["pending", "processed", "complete"]);
    } else {
      setSelectedStatuses([]);
    }
  };

  const downloadExcel = async () => {
    // Check if at least one status is selected
    if (selectedStatuses.length === 0) {
      toast.error("Please select at least one status.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      
      // If all are selected, we can send "all", otherwise we might need to handle multiple
      // For now, let's send a comma-separated list or just "all"
      if (selectedStatuses.length === 3) {
          params.append("status", "all");
      } else {
          // Note: The backend currently only handles one status. 
          // We will update the backend to handle comma-separated or multiple status parameters.
          params.append("status", selectedStatuses.join(","));
      }
      
      params.append("period", period);
      if (psNames.length > 0) params.append("ps", psNames.join(","));

      const res = await fetch(getApiUrl(`/api/applications?${params.toString()}`));
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch applications");
      }

      const applications = data.applications || [];
      if (applications.length === 0) {
        toast.info("No applications found for the selected date range.");
        setLoading(false);
        return;
      }

      setStats({ count: applications.length, lastFetch: new Date() });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Applications Data");

      // Define columns (Matching AI Extractor Pattern)
      const columns = [
          { header: "DATE", key: "currentDate", width: 15 },
          { header: "Name OF Complaint", key: "Name", width: 25 },
          { header: "Cell No.", key: "Phone Number", width: 20 },
          { header: "CNIC", key: "CNIC", width: 20 }, // New
          { header: "City", key: "City", width: 15 }, // New
          { header: "District", key: "District", width: 15 }, // New
          { header: "PS", key: "Police Station", width: 25 },
          { header: "PS Vide No.", key: "psVideNo", width: 15 },
          { header: "Properties", key: "Other Property", width: 30 },
          { header: "Mobile Model(s)", key: "Mobile Model", width: 25 }, // Modified
          { header: "Type", key: "Type", width: 15 },
          { header: "DATE OF OFFENCE", key: "Date Of Offence", width: 18 }, // Modified
          { header: "TIME OF OFFENCE", key: "Time Of Offence", width: 18 }, // Modified
          { header: "OFFENCE ADDRESS", key: "Offence Address", width: 30 }, // New
          { header: "INCIDENT NOTE", key: "Incident Note", width: 40 }, // New
          { header: "LAST NUM USED", key: "last Num Used", width: 20 }, // Modified
          { header: "ALL IMEIS", key: "IMEI Numbers", width: 40 }, // Modified
          { header: "BOX PICTURE LINK", key: "boxPictureLink", width: 20 }, // New
          { header: "ATTACHMENT LINK", key: "attestedAppLink", width: 20 }, // New
      ];

      worksheet.columns = columns;

      const formatMobile = (num: any) => {
          if (!num) return " None";
          let clean = String(num).replace(/\D/g, "");
          if (clean.startsWith("923")) clean = "0" + clean.substring(2);
          if (clean.length === 11 && clean.startsWith("03")) {
              return ` ${clean.substring(0, 4)}-${clean.substring(4)}`;
          }
          return " " + num;
      };

      const formatAppDate = (dateVal: any) => {
        if (!dateVal) return "None";
        try {
            if (dateVal.seconds || dateVal._seconds) {
                const s = dateVal.seconds || dateVal._seconds;
                return new Date(s * 1000).toLocaleDateString('en-GB');
            }
            const date = new Date(dateVal);
            return isNaN(date.getTime()) ? "None" : date.toLocaleDateString('en-GB');
        } catch (e) { return "None"; }
      };

      // Add rows
      applications.forEach((app: any) => {
          // 🚀 DATA CLEANING: Extract name before S/O, D/O, W/O
          let rawName = app.applicantName || "";
          const nameMatch = rawName.split(/S\/O|D\/O|W\/O/i)[0];
          const cleanedName = nameMatch ? nameMatch.trim() : rawName;

          // Common data for the application, regardless of devices
          const commonRowData = {
              "currentDate": formatAppDate(app.createdAt),
              "Name": cleanedName, // Using the cleaned name here
              "Phone Number": formatMobile(app.applicantMobile || app.applicantPhone),
              "CNIC": app.cnic || "",
              "City": app.city || "",
              "District": app.district || "",
              "Police Station": app.ps || "",
              "psVideNo": app.psVideNo || "",
              "Other Property": app.otherLostProperty || "",
              "Type": app.crimeHead || "",
              "Date Of Offence": formatAppDate(app.offenceDate),
              "Time Of Offence": app.offenceTime || "",
              "Offence Address": app.offenceAddress || "",
              "Incident Note": app.note || "",
              "boxPictureLink": app.pictureUrl || "",
              "attestedAppLink": app.attachmentUrl || "",
          };

          // Handle applications with devices
          if (app.devices && app.devices.length > 0) {
              const hasMultipleDevices = app.devices.length > 1;

              app.devices.forEach((device: any) => {
                  const deviceImeis: string[] = [];
                  if (device.imei1) deviceImeis.push(String(device.imei1).replace(/\//g, " "));
                  if (device.imei2) deviceImeis.push(String(device.imei2).replace(/\//g, " "));
                  const lastNumsUsed: string[] = [];
                  if (device.lastNumUsed) lastNumsUsed.push(formatMobile(device.lastNumUsed));
                  if (device.lastNumUsed2) lastNumsUsed.push(formatMobile(device.lastNumUsed2));

                  const row = worksheet.addRow({
                      ...commonRowData,
                      "Mobile Model": device.mobileModel || "",
                      "IMEI Numbers": deviceImeis.join(", "),
                      "last Num Used": lastNumsUsed.join(", "),
                  });

                  // Apply yellow fill only if there are multiple devices for this application
                  if (hasMultipleDevices) {
                      row.eachCell((cell: any) => {
                          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
                      });
                  }

                  // Add hyperlinks for pictureUrl and attachmentUrl to this row
                  if (commonRowData.boxPictureLink) {
                      const cell = row.getCell("boxPictureLink");
                      cell.value = { text: "Image Link", hyperlink: commonRowData.boxPictureLink };
                      cell.font = { color: { argb: 'FF0000FF' }, underline: true };
                  }
                  if (commonRowData.attestedAppLink) {
                      const cell = row.getCell("attestedAppLink");
                      cell.value = { text: "Attachment Link", hyperlink: commonRowData.attestedAppLink };
                      cell.font = { color: { argb: 'FF0000FF' }, underline: true };
                  }
              });
          } else {
              // Handle applications with no devices array (backward compatibility)
              const fallbackImeis: string[] = [];
              if (app.imei1) fallbackImeis.push(String(app.imei1).replace(/\//g, " "));
              if (app.imei2) fallbackImeis.push(String(app.imei2).replace(/\//g, " "));
              
              // If top-level IMEIs are missing, use allImeis
              const finalImeis = fallbackImeis.length > 0 
                ? fallbackImeis.join(", ") 
                : (app.allImeis && app.allImeis.length > 0 ? Array.from(new Set(app.allImeis)).join(", ") : "None");

              const fallbackNums: string[] = [];
              if (app.lastNumUsed) fallbackNums.push(formatMobile(app.lastNumUsed));
              if (app.lastNumUsed2) fallbackNums.push(formatMobile(app.lastNumUsed2));

              const row = worksheet.addRow({
                  ...commonRowData,
                  "Mobile Model": app.mobileModel || "None",
                  "IMEI Numbers": finalImeis,
                  "last Num Used": fallbackNums.length > 0 ? fallbackNums.join(", ") : "None",
              });
              // No yellow highlight for single row with no device info

              // Add hyperlinks for pictureUrl and attachmentUrl to this row
              if (commonRowData.boxPictureLink) {
                  const cell = row.getCell("boxPictureLink");
                  cell.value = { text: "Image Link", hyperlink: commonRowData.boxPictureLink };
                  cell.font = { color: { argb: 'FF0000FF' }, underline: true };
              }
              if (commonRowData.attestedAppLink) {
                  const cell = row.getCell("attestedAppLink");
                  cell.value = { text: "Attachment Link", hyperlink: commonRowData.attestedAppLink };
                  cell.font = { color: { argb: 'FF0000FF' }, underline: true };
              }
          }
      });

      // Style Header (Matching AI Extractor style)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: any) => {
          cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFB9D297' }
          };
          cell.font = { bold: true, color: { argb: 'FF000000' } };
          cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center' };
      });

      worksheet.eachRow((row: any) => {
          row.eachCell((cell: any) => {
              cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Application_Report_${period === 'custom' ? `${fromDate}_to_${toDate}` : period}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${applications.length} applications!`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== "super_admin") {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <AlertCircle size={48} className="text-red-500" />
              <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
              <p className="text-slate-500">Only Super Admin can access this tool.</p>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm shrink-0">
        <div className="p-3 md:p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20 shrink-0">
            <FileSpreadsheet size={28} className="md:w-8 md:h-8" />
        </div>
        <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Application To Excel</h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Database Export Utility</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
              <Filter size={18} className="text-emerald-600" /> Export Filters
            </CardTitle>
            <div className="flex items-center gap-3 bg-white px-3 md:px-4 py-2 rounded-xl border border-slate-200">
                <History size={16} className="text-slate-400" />
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[100px] md:w-[120px] border-0 focus:ring-0 shadow-none h-auto p-0 text-[11px] md:text-xs font-bold">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="1month">Last Month</SelectItem>
                        <SelectItem value="3months">Last 3 Months</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6 md:space-y-8">
            {/* Status Selection */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Application Status</label>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAllStatuses(selectedStatuses.length !== 3)}>
                        <Checkbox checked={selectedStatuses.length === 3} onCheckedChange={setAllStatuses} id="select-all" />
                        <label htmlFor="select-all" className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase cursor-pointer">Select All</label>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    {[
                        { id: "pending", label: "Pending", color: "amber" },
                        { id: "processed", label: "In Process", color: "blue" },
                        { id: "complete", label: "Completed", color: "emerald" }
                    ].map((s) => (
                        <div 
                            key={s.id}
                            onClick={() => toggleStatus(s.id)}
                            className={cn(
                                "flex items-center gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer",
                                selectedStatuses.includes(s.id) 
                                    ? `bg-${s.color}-50 border-${s.color}-200 shadow-sm` 
                                    : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 md:w-5 md:h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                selectedStatuses.includes(s.id) 
                                    ? `bg-${s.color}-600 border-${s.color}-600` 
                                    : "bg-white border-slate-200"
                            )}>
                                {selectedStatuses.includes(s.id) && <Check size={12} className="text-white" />}
                            </div>
                            <span className={cn(
                                "text-[11px] md:text-xs font-black uppercase tracking-tight",
                                selectedStatuses.includes(s.id) ? `text-${s.color}-700` : "text-slate-500"
                            )}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

  const [psNames, setPsNames] = useState<string[]>([]);

  const togglePs = (ps: string) => {
    setPsNames(prev => prev.includes(ps) ? prev.filter(p => p !== ps) : [...prev, ps]);
  };

  // ... (inside the return JSX)
            {/* PS Filter */}
            <div className="space-y-3">
                <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Police Stations (Select Multiple)</label>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {allPS.map((ps) => (
                            <div key={ps} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-100">
                                <Checkbox 
                                    id={ps} 
                                    checked={psNames.includes(ps)} 
                                    onCheckedChange={() => togglePs(ps)} 
                                />
                                <label htmlFor={ps} className="text-[10px] font-bold uppercase cursor-pointer text-slate-700 truncate">{ps}</label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {period === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">From Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                      type="date" 
                      value={fromDate} 
                      onChange={(e) => setFromDate(e.target.value)}
                      className="pl-12 h-12 md:h-14 rounded-xl md:rounded-2xl border-slate-200 focus:ring-emerald-500 font-bold text-xs" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">To Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                      type="date" 
                      value={toDate} 
                      onChange={(e) => setToDate(e.target.value)}
                      className="pl-12 h-12 md:h-14 rounded-xl md:rounded-2xl border-slate-200 focus:ring-emerald-500 font-bold text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={downloadExcel} 
              disabled={loading}
              className="w-full h-14 md:h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="mr-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download size={20} className="mr-3" />
                  Generate Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
            <Card className="border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-lg overflow-hidden bg-[#0f172a] text-white">
                <CardContent className="p-6 md:p-8 space-y-4">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Export Summary</p>
                    <div className="space-y-1">
                        <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-emerald-400">{stats.count}</h3>
                        <p className="text-[10px] md:text-xs font-bold text-slate-300">Records processed in last session</p>
                    </div>
                    {stats.lastFetch && (
                        <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest pt-4 border-t border-white/10">
                            Last Export: {stats.lastFetch.toLocaleTimeString()}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-lg overflow-hidden bg-white">
                <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={18} /></div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600">Export Guidelines</p>
                    </div>
                    <ul className="space-y-2 md:space-y-3">
                        <li className="flex gap-3 text-[11px] md:text-xs text-slate-500 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            Includes all "In-Process" and "Completed" cases.
                        </li>
                        <li className="flex gap-3 text-[11px] md:text-xs text-slate-500 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            Format strictly follows AI Extractor template.
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
