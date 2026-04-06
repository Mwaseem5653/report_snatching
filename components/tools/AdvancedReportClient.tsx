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
    Download
} from "lucide-react";
import { locationData } from "@/components/location/location";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn, getApiUrl } from "@/lib/utils";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { toast } from "sonner";

export default function AdvancedReportClient() {
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [officers, setOfficers] = useState<any[]>([]);
    
    // Filter States
    const [filterPeriod, setFilterPeriod] = useState("today");
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("period", filterPeriod);
            params.append("status", "all"); // We filter status in-memory or we can send it
            if (filterPs !== "all") params.append("ps", filterPs);

            const resApps = await fetch(getApiUrl(`/api/applications?${params.toString()}`));
            const dataApps = await resApps.json();

            if (dataApps.success) {
                let filtered = dataApps.applications || [];
                
                // In-memory filtering for more granular control
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

            // Fetch Officers for filter
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
    }, [filterPeriod, filterPs, filterStatus, filterOfficer, filterCrime]);

    const allPS = useMemo(() => {
        return Object.values(locationData).flatMap(city => 
            Object.values(city.districts).flatMap(district => district.ps)
        ).sort();
    }, []);

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
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button onClick={fetchData} variant="outline" className="flex-1 md:flex-none rounded-xl h-10 border-slate-200" disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                    </Button>
                    <Button onClick={exportToExcel} className="flex-[2] md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 shadow-lg shadow-emerald-600/20 text-xs font-bold uppercase tracking-tight">
                        <Download size={16} className="mr-2" /> Export Excel
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden">
                <CardContent className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
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

            {/* List View */}
            <Card className="border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between p-4 md:p-6">
                    <CardTitle className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                        <PieChart size={18} className="text-indigo-600 shrink-0" /> Filtered Records
                    </CardTitle>
                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Total {applications.length}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Police Station</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Officer</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {applications.length > 0 ? applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <p className="text-[11px] md:text-xs font-bold text-slate-900 uppercase">{app.applicantName}</p>
                                            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold">{app.applicantMobile || app.applicantPhone}</p>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-slate-600 uppercase truncate max-w-[120px]">{app.ps || "N/A"}</td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <span className={cn(
                                                "px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider",
                                                app.crimeHead === "snatched" ? "bg-red-50 text-red-600" :
                                                app.crimeHead === "theft" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                                            )}>{app.crimeHead || "N/A"}</span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <span className={cn(
                                                "px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider",
                                                app.status === "pending" ? "bg-amber-50 text-amber-600" :
                                                app.status === "processed" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                                            )}>{app.status}</span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-slate-700 uppercase truncate max-w-[100px]">{app.processedBy?.name || "N/A"}</td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-bold text-slate-400">
                                            {app.createdAt?._seconds ? new Date(app.createdAt._seconds * 1000).toLocaleDateString() : "N/A"}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">No matching records found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
