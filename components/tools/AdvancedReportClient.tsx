"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    BarChart3, 
    Filter, 
    FileText, 
    Clock, 
    CheckCircle2, 
    Activity,
    ShieldCheck,
    ShieldAlert,
    ChevronDown,
    RefreshCcw,
    History,
    User,
    Building2,
    Briefcase,
    Loader2,
    PieChart,
    Download,
    Calendar
} from "lucide-react";
import { locationData } from "@/components/location/location";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn, getApiUrl } from "@/lib/utils";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdvancedReportClient() {
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [officers, setOfficers] = useState<any[]>([]);
    
    // Filter States
    const [filterPeriod, setFilterPeriod] = useState("today");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterPs, setFilterPs] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterOfficer, setFilterOfficer] = useState("all");
    const [filterCrime, setFilterCrime] = useState("all");

    // Summary Stats
    const stats = useMemo(() => {
        return {
            total: applications.length,
            pending: applications.filter(a => a.status === "pending").length,
            processed: applications.filter(a => a.status === "processed").length,
            complete: applications.filter(a => a.status === "complete").length,
            snatched: applications.filter(a => a.crimeHead === "snatched").length,
            theft: applications.filter(a => a.crimeHead === "theft").length,
            lost: applications.filter(a => a.crimeHead === "lost").length,
        };
    }, [applications]);

    const allPS = useMemo(() => {
        return Object.values(locationData).flatMap(city => 
            Object.values(city.districts).flatMap(district => district.ps)
        ).sort();
    }, []);

    const psSummary = useMemo(() => {
        const summary: Record<string, { snatched: number; theft: number; lost: number; total: number }> = {};

        // Initialize with all PS from location file
        allPS.forEach(ps => {
            summary[ps] = { snatched: 0, theft: 0, lost: 0, total: 0 };
        });

        // Loop through applications and increment counts
        applications.forEach((app) => {
            const psName = app.ps;
            // If PS exists in our list, use it. Otherwise, use N/A
            const targetPs = (psName && allPS.includes(psName)) ? psName : "N/A";
            
            if (!summary[targetPs]) {
                summary[targetPs] = { snatched: 0, theft: 0, lost: 0, total: 0 };
            }

            if (app.crimeHead === "snatched") summary[targetPs].snatched++;
            else if (app.crimeHead === "theft") summary[targetPs].theft++;
            else if (app.crimeHead === "lost") summary[targetPs].lost++;
            summary[targetPs].total++;
        });

        let results = Object.entries(summary)
            .map(([ps, counts]) => ({ ps, ...counts }));

        // Only show N/A if it has actual data
        results = results.filter(r => r.ps !== "N/A" || r.total > 0);

        if (filterPs !== "all") {
            results = results.filter(r => r.ps === filterPs);
        }

        return results.sort((a, b) => {
            if (a.ps === "N/A") return 1;
            if (b.ps === "N/A") return -1;
            return b.total - a.total || a.ps.localeCompare(b.ps);
        });
    }, [applications, allPS, filterPs]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("period", filterPeriod);
            if (filterPeriod === "custom") {
                if (fromDate) params.append("fromDate", fromDate);
                if (toDate) params.append("toDate", toDate);
            }
            params.append("status", "all"); 
            if (filterPs !== "all") params.append("ps", filterPs);

            const resApps = await fetch(getApiUrl(`/api/applications?${params.toString()}`));
            const dataApps = await resApps.json();

            if (dataApps.success) {
                let filtered = dataApps.applications || [];
                
                if (filterStatus !== "all") {
                    filtered = filtered.filter((a: any) => a.status === filterStatus);
                }
                if (filterOfficer !== "all") {
                    filtered = filtered.filter((a: any) => a.processedBy?.uid === filterOfficer);
                }
                if (filterCrime !== "all") {
                    filtered = filtered.filter((a: any) => a.crimeHead === filterCrime);
                }

                setApplications(filtered);
            }

            const resOfficers = await fetch(getApiUrl("/api/get-users?role=officer"));
            const dataOfficers = await resOfficers.json();
            if (dataOfficers.success) {
                setOfficers(dataOfficers.users || []);
            }

        } catch (err) {
            console.error("Report fetch error:", err);
            toast.error("Failed to load report data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterPeriod, fromDate, toDate, filterPs, filterStatus, filterOfficer, filterCrime]);

    const exportToExcel = async () => {
        if (applications.length === 0) {
            toast.error("No data to export");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Report Summary");

        worksheet.columns = [
            { header: "Applicant", key: "applicantName", width: 25 },
            { header: "Contact", key: "applicantMobile", width: 15 },
            { header: "Police Station", key: "ps", width: 25 },
            { header: "Crime Head", key: "crimeHead", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Processed By", key: "officer", width: 25 },
            { header: "Date", key: "createdAt", width: 20 }
        ];

        applications.forEach(app => {
            worksheet.addRow({
                applicantName: app.applicantName,
                applicantMobile: app.applicantMobile || app.applicantPhone,
                ps: app.ps || "N/A",
                crimeHead: app.crimeHead || "N/A",
                status: app.status,
                officer: app.processedBy?.name || "N/A",
                createdAt: app.createdAt?._seconds ? new Date(app.createdAt._seconds * 1000).toLocaleDateString() : "N/A"
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Advanced_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
    };

    const exportToPDF = () => {
        if (psSummary.length === 0) {
            toast.error("No data to export");
            return;
        }

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("PS Report For Application Entry and Record", 105, 15, { align: "center" });
        
        // Date Range Detail
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        let dateRangeText = "";
        const now = new Date();
        const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

        if (filterPeriod === "custom") {
            dateRangeText = `Record From: ${fromDate ? formatDate(new Date(fromDate)) : "Start"} TO ${toDate ? formatDate(new Date(toDate)) : "End"}`;
        } else if (filterPeriod === "today") {
            dateRangeText = `Record For: ${formatDate(now)}`;
        } else if (filterPeriod === "15days") {
            const start = new Date();
            start.setDate(start.getDate() - 15);
            dateRangeText = `Record From: ${formatDate(start)} TO ${formatDate(now)}`;
        } else if (filterPeriod === "1month") {
            const start = new Date();
            start.setMonth(start.getMonth() - 1);
            dateRangeText = `Record From: ${formatDate(start)} TO ${formatDate(now)}`;
        } else if (filterPeriod === "3months") {
            const start = new Date();
            start.setMonth(start.getMonth() - 3);
            dateRangeText = `Record From: ${formatDate(start)} TO ${formatDate(now)}`;
        } else {
            dateRangeText = "Record Period: All Time";
        }

        doc.text(dateRangeText, 105, 22, { align: "center" });

        // Table Data Preparation
        const tableData = psSummary.map(item => [
            item.ps !== "N/A" ? `PS ${item.ps}` : item.ps,
            item.snatched.toString(),
            item.theft.toString(),
            item.lost.toString(),
            item.total.toString()
        ]);

        // Calculate Grand Totals
        const grandTotal = psSummary.reduce((acc, curr) => ({
            snatched: acc.snatched + curr.snatched,
            theft: acc.theft + curr.theft,
            lost: acc.lost + curr.lost,
            total: acc.total + curr.total
        }), { snatched: 0, theft: 0, lost: 0, total: 0 });

        // Add Grand Total Row
        tableData.push([
            'GRAND TOTAL',
            grandTotal.snatched.toString(),
            grandTotal.theft.toString(),
            grandTotal.lost.toString(),
            grandTotal.total.toString()
        ]);

        autoTable(doc, {
            head: [['Police Station', 'Snatched', 'Theft', 'Lost', 'Total']],
            body: tableData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 10, halign: 'center' },
            bodyStyles: { fontSize: 9, halign: 'center', textColor: [0, 0, 0] },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' },
                4: { fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                // Style the Grand Total row
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249]; // slate-50
                }
            },
            margin: { top: 30 }
        });

        doc.save(`PS_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 shrink-0">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Advanced Reports</h1>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Analytical Overview & Counts</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Button onClick={fetchData} variant="outline" className="flex-1 md:flex-none rounded-xl h-10 border-slate-200" disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                    </Button>
                    <Button onClick={exportToExcel} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 shadow-lg shadow-emerald-600/20 text-[10px] md:text-xs font-bold uppercase tracking-tight px-3 md:px-4">
                        <Download size={16} className="md:mr-2" /> <span className="hidden xs:inline">Export Excel</span>
                    </Button>
                    <Button onClick={exportToPDF} className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 shadow-lg shadow-red-600/20 text-[10px] md:text-xs font-bold uppercase tracking-tight px-3 md:px-4">
                        <FileText size={16} className="md:mr-2" /> <span className="hidden xs:inline">Download PDF</span>
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Period</Label>
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger className="rounded-xl h-10 md:h-11 border-slate-200 bg-slate-50 font-bold text-[11px] md:text-xs"><SelectValue placeholder="Period" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="15days">15 Days</SelectItem>
                                    <SelectItem value="1month">1 Month</SelectItem>
                                    <SelectItem value="3months">3 Months</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Police Station</Label>
                            <Select value={filterPs} onValueChange={setFilterPs}>
                                <SelectTrigger className="rounded-xl h-10 md:h-11 border-slate-200 bg-slate-50 font-bold text-[11px] md:text-xs overflow-hidden"><SelectValue placeholder="All PS" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">All Police Stations</SelectItem>
                                    {allPS.map(ps => <SelectItem key={ps} value={ps} className="text-xs">{ps}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="rounded-xl h-10 md:h-11 border-slate-200 bg-slate-50 font-bold text-[11px] md:text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processed">In Process</SelectItem>
                                    <SelectItem value="complete">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Officer</Label>
                            <Select value={filterOfficer} onValueChange={setFilterOfficer}>
                                <SelectTrigger className="rounded-xl h-10 md:h-11 border-slate-200 bg-slate-50 font-bold text-[11px] md:text-xs overflow-hidden"><SelectValue placeholder="All Officers" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">All Officers</SelectItem>
                                    {officers.map(o => <SelectItem key={o.uid} value={o.uid} className="text-xs">{o.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Crime Type</Label>
                            <Select value={filterCrime} onValueChange={setFilterCrime}>
                                <SelectTrigger className="rounded-xl h-10 md:h-11 border-slate-200 bg-slate-50 font-bold text-[11px] md:text-xs"><SelectValue placeholder="All Crime" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="snatched">Snatched</SelectItem>
                                    <SelectItem value="theft">Theft</SelectItem>
                                    <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {filterPeriod === "custom" && (
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custom Date Range:</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="date" 
                                    value={fromDate} 
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="h-9 w-36 rounded-lg border-slate-200 text-xs font-bold"
                                />
                                <span className="text-slate-400 font-bold">to</span>
                                <Input 
                                    type="date" 
                                    value={toDate} 
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="h-9 w-36 rounded-lg border-slate-200 text-xs font-bold"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
                {[
                    { label: "Total", value: stats.total, color: "slate", icon: FileText },
                    { label: "Pending", value: stats.pending, color: "amber", icon: Clock },
                    { label: "Process", value: stats.processed, color: "blue", icon: Activity },
                    { label: "Complete", value: stats.complete, color: "emerald", icon: CheckCircle2 },
                    { label: "Snatched", value: stats.snatched, color: "red", icon: ShieldAlert },
                    { label: "Theft", value: stats.theft, color: "orange", icon: ShieldAlert },
                    { label: "Lost", value: stats.lost, color: "sky", icon: ShieldAlert },
                ].map((s) => (
                    <Card key={s.label} className="border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden">
                        <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center text-center space-y-1.5 md:space-y-2">
                            <div className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl bg-slate-50", `text-${s.color}-600`)}>
                                <s.icon size={18} className="md:w-5 md:h-5" />
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                <p className="text-base md:text-xl font-black text-slate-900">{s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* PS Summary Table View */}
            <div className="flex justify-center">
                <Card className="w-full lg:w-[70%] border-slate-200 rounded-none shadow-sm overflow-hidden bg-white border">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between p-2 md:p-3">
                        <CardTitle className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600 shrink-0" /> PS Summary Report
                        </CardTitle>
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Total {psSummary.length} Stations
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse border border-slate-100">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-4 md:px-6 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100">Police Station</th>
                                        <th className="px-4 md:px-6 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center border-r border-slate-100">Snatched</th>
                                        <th className="px-4 md:px-6 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center border-r border-slate-100">Theft</th>
                                        <th className="px-4 md:px-6 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center border-r border-slate-100">Lost</th>
                                        <th className="px-4 md:px-6 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {psSummary.length > 0 ? psSummary.map((item) => (
                                        <tr key={item.ps} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 md:px-6 py-1 text-[10px] md:text-xs font-bold text-slate-700 uppercase border-r border-slate-100">
                                                {item.ps !== "N/A" ? `PS ${item.ps}` : item.ps}
                                            </td>
                                            <td className="px-4 md:px-6 py-1 text-sm md:text-base font-black text-black text-center border-r border-slate-100">{item.snatched}</td>
                                            <td className="px-4 md:px-6 py-1 text-sm md:text-base font-black text-black text-center border-r border-slate-100">{item.theft}</td>
                                            <td className="px-4 md:px-6 py-1 text-sm md:text-base font-black text-black text-center border-r border-slate-100">{item.lost}</td>
                                            <td className="px-4 md:px-6 py-1 text-sm md:text-base font-black text-black text-center bg-slate-50/30 font-mono">{item.total}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">No matching records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
