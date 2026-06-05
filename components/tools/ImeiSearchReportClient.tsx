"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    Search, 
    RefreshCcw, 
    Loader2, 
    TrendingUp,
    CheckCircle2,
    XCircle,
    User,
    Building2,
    BarChart3,
    FileSpreadsheet,
    Download,
    Calendar,
    PieChart
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn, getApiUrl } from "@/lib/utils";
import { toast } from "sonner";
import ExcelJS from "exceljs/dist/exceljs.min.js";

export default function ImeiSearchReportClient() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any[]>([]);
    
    // Filter States
    const [filterPeriod, setFilterPeriod] = useState("today");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterRole, setFilterRole] = useState("all");

    // Summary Totals
    const summary = useMemo(() => {
        return stats.reduce((acc, curr) => ({
            totalChecked: acc.totalChecked + curr.totalChecked,
            totalMatched: acc.totalMatched + curr.totalMatched,
            totalNotMatched: acc.totalNotMatched + curr.totalNotMatched,
        }), { totalChecked: 0, totalMatched: 0, totalNotMatched: 0 });
    }, [stats]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("period", filterPeriod);
            if (filterPeriod === "custom") {
                if (fromDate) params.append("fromDate", fromDate);
                if (toDate) params.append("toDate", toDate);
            }
            if (filterRole !== "all") params.append("role", filterRole);

            const res = await fetch(getApiUrl(`/api/admin/imei-search-stats?${params.toString()}`));
            const data = await res.json();

            if (data.success) {
                setStats(data.stats || []);
            } else {
                toast.error(data.error || "Failed to fetch stats");
            }
        } catch (err) {
            console.error("Stats fetch error:", err);
            toast.error("Internal Server Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filterPeriod, fromDate, toDate, filterRole]);

    const exportToExcel = async () => {
        if (stats.length === 0) {
            toast.error("No data to export");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("IMEI Search Report");

        const columns = [
            { header: "User Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 30 },
            { header: "Police Station", key: "ps", width: 25 },
            { header: "Role", key: "role", width: 15 },
            { header: "Total Checked", key: "totalChecked", width: 15 },
            { header: "Matched", key: "totalMatched", width: 15 },
            { header: "Not Matched", key: "totalNotMatched", width: 15 }
        ];

        worksheet.columns = columns;

        // Add Data
        stats.forEach(item => {
            worksheet.addRow({
                name: item.name,
                email: item.email,
                ps: item.ps,
                role: item.role.replace("_", " "),
                totalChecked: item.totalChecked,
                totalMatched: item.totalMatched,
                totalNotMatched: item.totalNotMatched
            });
        });

        // Add Grand Total Row
        const totalRow = worksheet.addRow({
            name: "GRAND TOTAL",
            email: "",
            ps: "",
            role: "",
            totalChecked: summary.totalChecked,
            totalMatched: summary.totalMatched,
            totalNotMatched: summary.totalNotMatched
        });
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' } // slate-50
        };

        // 🎨 Style the Header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell((cell: any) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E40AF' } // blue-800
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 📏 Auto-fit column widths
        worksheet.columns.forEach((column: any) => {
            let maxLength = 0;
            column.eachCell!({ includeEmpty: true }, (cell: any) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 12 ? 12 : maxLength + 2;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `IMEI_Search_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
    };

    const ROLES = ["ps_user", "market_user"];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                        <Search size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">IMEI Search Analytics</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Market & PS User Monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 shadow-lg shadow-emerald-600/20 text-xs font-bold uppercase tracking-tight px-4">
                        <Download size={16} className="mr-2" /> Export Excel
                    </Button>
                    <Button onClick={fetchStats} variant="outline" className="rounded-xl h-10 border-slate-200" disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time Period</Label>
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-slate-50 font-bold text-xs"><SelectValue placeholder="Period" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="15days">Last 15 Days</SelectItem>
                                    <SelectItem value="1month">Last 1 Month</SelectItem>
                                    <SelectItem value="3months">Last 3 Months</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter by Role</Label>
                            <Select value={filterRole} onValueChange={setFilterRole}>
                                <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-slate-50 font-bold text-xs"><SelectValue placeholder="All Roles" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace("_", " ")}</SelectItem>)}
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

            {/* Summary Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Total Checked", value: summary.totalChecked, color: "blue", icon: Search },
                    { label: "Total Matched", value: summary.totalMatched, color: "emerald", icon: CheckCircle2 },
                    { label: "Not Matched", value: summary.totalNotMatched, color: "rose", icon: XCircle },
                ].map((s) => (
                    <Card key={s.label} className="border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                            <div className={cn("p-3 rounded-2xl bg-slate-50", `text-${s.color}-600`)}>
                                <s.icon size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Stats Table - MATCHING ADVANCED REPORT STYLE */}
            <div className="flex justify-center">
                <Card className="w-full lg:w-[85%] border-slate-200 rounded-none shadow-sm overflow-hidden bg-white border">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between p-3 md:p-4">
                        <CardTitle className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600 shrink-0" /> Search Activity Report
                        </CardTitle>
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Total {stats.length} Active Users
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse border border-slate-100">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100">User / Details</th>
                                        <th className="px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100">Police Station</th>
                                        <th className="px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center border-r border-slate-100">Checked</th>
                                        <th className="px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center border-r border-slate-100">Matched</th>
                                        <th className="px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Not Matched</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.length > 0 ? (
                                        <>
                                            {stats.map((user, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 md:px-6 py-2 border-r border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight">{user.name}</p>
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold">{user.email}</p>
                                                                <span className="text-[7px] font-black text-indigo-600 bg-indigo-50 px-1 rounded uppercase tracking-widest">{user.role.replace("_", " ")}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-2 text-[10px] md:text-xs font-bold text-slate-700 uppercase border-r border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 size={12} className="text-slate-400" />
                                                            {user.ps}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-2 text-sm md:text-base font-black text-black text-center border-r border-slate-100">{user.totalChecked}</td>
                                                    <td className="px-4 md:px-6 py-2 text-sm md:text-base font-black text-emerald-600 text-center border-r border-slate-100">{user.totalMatched}</td>
                                                    <td className="px-4 md:px-6 py-2 text-sm md:text-base font-black text-rose-600 text-center">{user.totalNotMatched}</td>
                                                </tr>
                                            ))}
                                            {/* Grand Total Row */}
                                            <tr className="bg-slate-50 font-bold">
                                                <td colSpan={2} className="px-4 md:px-6 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-900 border-r border-slate-100 text-right">
                                                    Grand Total
                                                </td>
                                                <td className="px-4 md:px-6 py-3 text-sm md:text-base font-black text-black text-center border-r border-slate-100">{summary.totalChecked}</td>
                                                <td className="px-4 md:px-6 py-3 text-sm md:text-base font-black text-emerald-700 text-center border-r border-slate-100">{summary.totalMatched}</td>
                                                <td className="px-4 md:px-6 py-3 text-sm md:text-base font-black text-rose-700 text-center">{summary.totalNotMatched}</td>
                                            </tr>
                                        </>
                                    ) : (
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
