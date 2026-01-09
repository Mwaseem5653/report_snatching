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
  ChevronDown,
  RefreshCcw,
  History,
  User
} from "lucide-react";
import { locationData } from "@/components/location/location";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* -------------------- Helper: Radial Progress -------------------- */
const RadialProgress = ({ value, total, label, color, icon: Icon }: any) => {
  const percentage = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="relative flex items-center justify-center mb-4">
        <svg className="w-40 h-40 transform -rotate-90">
          <circle cx="80" cy="80" r={radius} stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
          <motion.circle
            cx="80" cy="80" r={radius} stroke={color} strokeWidth="12" fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <div className={`p-2 rounded-lg mb-1`} style={{ backgroundColor: `${color}15` }}>
              <Icon size={20} style={{ color }} />
           </div>
           <span className="text-2xl font-black text-slate-800 leading-none">{value}</span>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{percentage}%</span>
        </div>
      </div>
      <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide">{label}</h4>
    </div>
  );
};

/* -------------------- Main Component -------------------- */
export default function ReportsView({ officerUid: initialOfficerUid }: { officerUid?: string }) {
  const [district, setDistrict] = useState("all");
  const [period, setPeriod] = useState("1month");
  const [selectedOfficer, setSelectedOfficer] = useState(initialOfficerUid || "all");
  const [stats, setStats] = useState({ total: 0, pending: 0, processed: 0, complete: 0, matched: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [officers, setOfficers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch("/api/auth/create-session");
      const data = await res.json();
      if (data.authenticated) {
          setCurrentUser(data);
          if (initialOfficerUid) setSelectedOfficer(initialOfficerUid);
      }
    }
    fetchSession();
  }, [initialOfficerUid]);

  // Fetch Officers List for Admin/SuperAdmin
  useEffect(() => {
    async function fetchOfficers() {
        if (!currentUser || !["admin", "super_admin"].includes(currentUser.role)) return;
        try {
            const params = new URLSearchParams();
            params.append("role", "officer");
            
            // SECURITY: If Admin, restrict fetching to their own district
            if (currentUser.role === "admin" && currentUser.district) {
                params.append("district", currentUser.district);
            } else if (district !== "all") {
                params.append("district", district);
            }

            const res = await fetch(`/api/get-users?${params.toString()}`);
            const data = await res.json();
            setOfficers(data.users || []);
        } catch (err) {
            console.error("Failed to fetch officers:", err);
        }
    }
    fetchOfficers();
  }, [currentUser, district]);

  const fetchStats = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district !== "all") params.append("district", district);
      params.append("period", period);
      
      const [resApps, resMatched] = await Promise.all([
          fetch(`/api/applications?${params.toString()}&status=all`),
          fetch(`/api/matched-imeis?${params.toString()}`)
      ]);

      const dataApps = await resApps.json();
      const dataMatched = await resMatched.json();
      
      if (dataApps.success && dataMatched.success) {
        let apps = dataApps.applications || [];
        let matches = dataMatched.matches || [];
        
        if (selectedOfficer !== "all") {
            apps = apps.filter((a: any) => a.processedBy?.uid === selectedOfficer);
            matches = matches.filter((m: any) => m.processedBy?.uid === selectedOfficer);
        }

        const uniqueMatchedCount = new Set(matches.map((m: any) => m.imei)).size;

        setStats({
          total: apps.length,
          pending: apps.filter((a: any) => a.status === "pending").length,
          processed: apps.filter((a: any) => a.status === "processed").length,
          complete: apps.filter((a: any) => a.status === "complete").length,
          matched: uniqueMatchedCount
        });
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [district, period, currentUser, selectedOfficer]);

  const availableDistricts = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
        return Object.keys(locationData).flatMap(city => Object.keys(locationData[city].districts));
    }
    const d = currentUser.district;
    return Array.isArray(d) ? d : (d ? [d] : []);
  }, [currentUser]);

  const showOfficerFilter = currentUser && ["admin", "super_admin"].includes(currentUser.role) && !initialOfficerUid;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">Operational Insights</h2>
            <button onClick={fetchStats} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full group">
                <RefreshCcw size={18} className={cn("text-slate-400 group-hover:text-blue-600", loading && "animate-spin")} />
            </button>
          </div>
          <p className="text-slate-500 text-sm font-medium">Real-time recovery and status distribution.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {showOfficerFilter && (
                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                    <User size={14} className="text-slate-400 ml-3" />
                    <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                        <SelectTrigger className="w-[180px] border-0 focus:ring-0 shadow-none bg-slate-50 rounded-xl h-9 text-xs font-bold">
                            <SelectValue placeholder="All Officers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Officers</SelectItem>
                            {officers.map(o => (
                                <SelectItem key={o.uid} value={o.uid} className="text-xs">
                                    {o.name} ({o.buckle || "N/A"})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <History size={14} className="text-slate-400 ml-3" />
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[120px] border-0 focus:ring-0 shadow-none bg-transparent h-9 text-xs font-bold">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="15days">15 Days</SelectItem>
                        <SelectItem value="1month">1 Month</SelectItem>
                        <SelectItem value="3months">3 Months</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                <Filter size={14} className="text-slate-400 ml-3" />
                <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="w-[160px] border-0 focus:ring-0 shadow-none bg-slate-50 rounded-xl h-9 text-xs font-bold">
                        <SelectValue placeholder="District" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{currentUser?.role === "super_admin" ? "Entire Sindh" : "My Jurisdiction"}</SelectItem>
                        {(availableDistricts || []).map(d => (
                        <SelectItem key={d} value={d} className="capitalize text-xs">{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <RadialProgress value={stats.total} total={stats.total} label="Total Reports" color="#3b82f6" icon={FileText} />
        <RadialProgress value={stats.pending} total={stats.total} label="Pending" color="#f59e0b" icon={Clock} />
        <RadialProgress value={stats.processed} total={stats.total} label="In Progress" color="#6366f1" icon={Activity} />
        <RadialProgress value={stats.complete} total={stats.total} label="Completed" color="#10b981" icon={CheckCircle2} />
        <RadialProgress value={stats.matched} total={stats.total} label="Device Matches" color="#ef4444" icon={ShieldCheck} />
      </div>

      <div className="bg-[#0f172a] rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
         <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
               <h3 className="text-3xl font-black tracking-tight">System Summary</h3>
               <p className="text-slate-400 leading-relaxed font-medium">
                  Reviewing metrics for <span className="text-white font-bold capitalize">{district === "all" ? "All Assigned Areas" : district}</span>. 
                  Efficiency is currently calculated at <span className="text-emerald-400 font-bold">{stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}%</span> based on resolved cases.
               </p>
               <div className="flex gap-4">
                  <div className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700 text-center">
                     <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Match Rate</p>
                     <p className="text-2xl font-black">{stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}%</p>
                  </div>
                  <div className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700 text-center">
                     <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Recovered</p>
                     <p className="text-2xl font-black text-red-400">{stats.matched}</p>
                  </div>
               </div>
            </div>
            <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/5 backdrop-blur-sm">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <span>Recovery Target</span>
                     <span className="text-white">{stats.matched} / {stats.total}</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.matched / stats.total) * 100 || 0}%` }} className="h-full bg-red-500" />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <span>Resolution Target</span>
                     <span className="text-white">{stats.complete} / {stats.total}</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.complete / stats.total) * 100 || 0}%` }} className="h-full bg-emerald-500" />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}