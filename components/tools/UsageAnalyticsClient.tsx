"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    Users, 
    Wrench, 
    Calendar, 
    Search, 
    RefreshCcw, 
    Loader2, 
    TrendingUp,
    FileSpreadsheet,
    Eye,
    MapPin,
    Smartphone,
    LayoutGrid,
    BarChart3
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function UsageAnalyticsClient() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any[]>([]);
    
    // Filter States
    const [filterPeriod, setFilterPeriod] = useState("today");
    const [filterRole, setFilterRole] = useState("all");
    const [filterTool, setFilterTool] = useState("all");

    // Summary Totals
    const summary = useMemo(() => {
        const totals: Record<string, number> = {
            "Excel Analyzer": 0,
            "Eyecon Lookup": 0,
            "SIM Info Lookup": 0,
            "Geo Fencing": 0,
            "Movement Visualizer": 0,
            "LAC/Cell Converter": 0,
            "AI Application Extractor": 0
        };

        stats.forEach(user => {
            Object.entries(user.tools).forEach(([toolName, count]) => {
                if (totals[toolName] !== undefined) {
                    totals[toolName] += (count as number);
                } else if (toolName === "Eyecon/Info Lookup") {
                    // Fallback for older combined logs
                    totals["SIM Info Lookup"] += (count as number);
                } else {
                    totals["Others"] = (totals["Others"] || 0) + (count as number);
                }
            });
        });

        return totals;
    }, [stats]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("period", filterPeriod);
            if (filterRole !== "all") params.append("role", filterRole);
            if (filterTool !== "all") params.append("tool", filterTool);

            const res = await fetch(`/api/admin/usage-stats?${params.toString()}`);
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
    }, [filterPeriod, filterRole, filterTool]);

    const ROLES = ["super_admin", "admin", "officer", "ps_user", "market_user", "advanced_tool"];
    const TOOLS = ["Excel Analyzer", "Eyecon Lookup", "SIM Info Lookup", "Geo Fencing", "Movement Visualizer", "LAC/Cell Converter", "AI Application Extractor"];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Tool Usage Analytics</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Activity Monitoring</p>
                    </div>
                </div>
                <Button onClick={fetchStats} variant="outline" className="rounded-xl h-10 border-slate-200" disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter by Tool</Label>
                        <Select value={filterTool} onValueChange={setFilterTool}>
                            <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-slate-50 font-bold text-xs"><SelectValue placeholder="All Tools" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tools</SelectItem>
                                {TOOLS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats Overview (Like Advanced Report) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                    { label: "Excel Analyzed", value: summary["Excel Analyzer"], color: "blue", icon: FileSpreadsheet },
                    { label: "Eyecon Lookup", value: summary["Eyecon Lookup"], color: "indigo", icon: Eye },
                    { label: "SIM Info", value: summary["SIM Info Lookup"], color: "cyan", icon: Smartphone },
                    { label: "Geo Fencing", value: summary["Geo Fencing"], color: "emerald", icon: MapPin },
                    { label: "Movement", value: summary["Movement Visualizer"], color: "amber", icon: TrendingUp },
                    { label: "LAC/Cell", value: summary["LAC/Cell Converter"], color: "purple", icon: Smartphone },
                    { label: "AI Extractor", value: summary["AI Application Extractor"], color: "rose", icon: LayoutGrid },
                ].map((s) => (
                    <Card key={s.label} className="border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                            <div className={cn("p-2 rounded-xl bg-slate-50", `text-${s.color}-600`)}>
                                <s.icon size={20} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                <p className="text-xl font-black text-slate-900">{s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Stats Table */}
            <Card className="border-slate-200 rounded-[2rem] shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                        <Users size={18} className="text-blue-600" /> Usage by Officer
                    </CardTitle>
                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Total {stats.length} Active Users in Period
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Officer / User Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Excel Analyzer</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Eyecon</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">SIM Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Geo Fencing</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">AI Extractor</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Movement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.length > 0 ? stats.map((user, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{user.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold">{user.email}</p>
                                                    <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 rounded uppercase tracking-widest">{user.role.replace("_", " ")}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("text-sm font-black", user.tools["Excel Analyzer"] ? "text-slate-900" : "text-slate-300")}>
                                                {user.tools["Excel Analyzer"] || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("text-sm font-black", user.tools["Eyecon Lookup"] ? "text-slate-900" : "text-slate-300")}>
                                                {user.tools["Eyecon Lookup"] || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("text-sm font-black", user.tools["SIM Info Lookup"] ? "text-slate-900" : "text-slate-300")}>
                                                {user.tools["SIM Info Lookup"] || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("text-sm font-black", user.tools["Geo Fencing"] ? "text-slate-900" : "text-slate-300")}>
                                                {user.tools["Geo Fencing"] || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("text-sm font-black", user.tools["AI Application Extractor"] ? "text-slate-900" : "text-slate-300")}>
                                                {user.tools["AI Application Extractor"] || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("text-sm font-black", user.tools["Movement Visualizer"] ? "text-slate-900" : "text-slate-300")}>
                                                {user.tools["Movement Visualizer"] || 0}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">No activity recorded for this criteria</td>
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
