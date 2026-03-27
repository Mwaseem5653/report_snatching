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
import ExcelJS from "exceljs";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function ApplicationToExcelClient() {
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["pending", "processed", "complete"]);
  const [period, setPeriod] = useState("all");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<{ count: number; lastFetch: Date | null }>({ count: 0, lastFetch: null });

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch("/api/auth/create-session");
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

      const res = await fetch(`/api/applications?${params.toString()}`);
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
          { header: "PS", key: "Police Station", width: 25 },
          { header: "PS Vide No.", key: "psVideNo", width: 15 },
          { header: "Properties", key: "Other Property", width: 30 },
          { header: "Mobile Model", key: "Mobile Model", width: 25 },
          { header: "Status", key: "Type", width: 15 },
          { header: "DATE AND TIME OF OFFENCE", key: "Date Of Offence", width: 25 },
          { header: "TIME", key: "Time Of Offence", width: 15 },
          { header: "NO IN USE", key: "last Num Used", width: 20 },
          { header: "Snatch/Theft IMEI", key: "IMEI Number", width: 35 }
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
          const imei1 = app.imei1 ? String(app.imei1).replace(/\//g, " ") : "";
          const imei2 = app.imei2 ? String(app.imei2).replace(/\//g, " ") : "";
          
          worksheet.addRow({
              "currentDate": formatAppDate(app.createdAt),
              "Name": app.applicantName ? " " + app.applicantName : " None",
              "Phone Number": formatMobile(app.applicantMobile || app.applicantPhone),
              "Police Station": app.ps ? " " + app.ps : " None",
              "psVideNo": app.psVideNo || "",
              "Other Property": app.otherLostProperty ? " " + app.otherLostProperty : " None",
              "Mobile Model": app.mobileModel ? " " + app.mobileModel : " None",
              "Type": app.crimeHead ? " " + app.crimeHead : " None",
              "Date Of Offence": formatAppDate(app.offenceDate),
              "Time Of Offence": app.offenceTime ? " " + app.offenceTime : " None",
              "last Num Used": formatMobile(app.lastNumUsed),
              "IMEI Number": imei1 ? ` ${imei1}${imei2 ? " " + imei2 : ""}` : " None"
          });
      });

      // Style Header (Matching AI Extractor style)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
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

      worksheet.eachRow((row) => {
          row.eachCell((cell) => {
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
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20">
            <FileSpreadsheet size={24} />
        </div>
        <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Application To Excel</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Database Export Utility</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
              <Filter size={16} className="text-emerald-600" /> Export Filters
            </CardTitle>
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <History size={14} className="text-slate-400" />
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[110px] border-0 focus:ring-0 shadow-none h-auto p-0 text-[10px] font-bold">
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
          <CardContent className="p-6 space-y-6">
            {/* Status Selection */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Application Status</label>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAllStatuses(selectedStatuses.length !== 3)}>
                        <Checkbox checked={selectedStatuses.length === 3} onCheckedChange={setAllStatuses} id="select-all" />
                        <label htmlFor="select-all" className="text-[9px] font-bold text-slate-600 uppercase cursor-pointer">Select All</label>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: "pending", label: "Pending", color: "amber" },
                        { id: "processed", label: "In Process", color: "blue" },
                        { id: "complete", label: "Completed", color: "emerald" }
                    ].map((s) => (
                        <div 
                            key={s.id}
                            onClick={() => toggleStatus(s.id)}
                            className={cn(
                                "flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer",
                                selectedStatuses.includes(s.id) 
                                    ? `bg-${s.color}-50 border-${s.color}-200 shadow-sm` 
                                    : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                                selectedStatuses.includes(s.id) 
                                    ? `bg-${s.color}-600 border-${s.color}-600` 
                                    : "bg-white border-slate-200"
                            )}>
                                {selectedStatuses.includes(s.id) && <Check size={12} className="text-white" />}
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tight",
                                selectedStatuses.includes(s.id) ? `text-${s.color}-700` : "text-slate-500"
                            )}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {period === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">From Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input 
                      type="date" 
                      value={fromDate} 
                      onChange={(e) => setFromDate(e.target.value)}
                      className="pl-9 h-10 rounded-xl border-slate-200 focus:ring-emerald-500 font-bold text-xs" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">To Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input 
                      type="date" 
                      value={toDate} 
                      onChange={(e) => setToDate(e.target.value)}
                      className="pl-9 h-10 rounded-xl border-slate-200 focus:ring-emerald-500 font-bold text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={downloadExcel} 
              disabled={loading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download size={18} className="mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
            <Card className="border-slate-200 rounded-2xl shadow-lg overflow-hidden bg-[#0f172a] text-white">
                <CardContent className="p-6 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Export Summary</p>
                    <div className="space-y-0.5">
                        <h3 className="text-3xl font-black tracking-tighter text-emerald-400">{stats.count}</h3>
                        <p className="text-[10px] font-bold text-slate-300">Records processed</p>
                    </div>
                    {stats.lastFetch && (
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest pt-3 border-t border-white/10">
                            Last: {stats.lastFetch.toLocaleTimeString()}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200 rounded-2xl shadow-lg overflow-hidden bg-white">
                <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={14} /></div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Export Guidelines</p>
                    </div>
                    <ul className="space-y-2">
                        <li className="flex gap-2 text-[10px] text-slate-500 font-medium leading-tight">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            Includes all status cases.
                        </li>
                        <li className="flex gap-2 text-[10px] text-slate-500 font-medium leading-tight">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            Template follows AI Extractor.
                        </li>
                        <li className="flex gap-2 text-[10px] text-slate-500 font-medium leading-tight">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            Filtered by creation date.
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
