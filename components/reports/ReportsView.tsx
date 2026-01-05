"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Filter, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Activity,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { locationData } from "@/components/location/location";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

/* -------------------- Helper: Radial Progress -------------------- */
const RadialProgress = ({ value, total, label, color, icon: Icon }: any) => {
  let percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  if (percentage > 100) percentage = 100; // 🛡️ Cap at 100%
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="relative flex items-center justify-center mb-4">
        {/* Background Circle */}
        <svg className="w-40 h-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-slate-100"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            strokeLinecap="round"
            style={{ color }}
          />
        </svg>
        
        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <div className={`p-2 rounded-lg bg-opacity-10 mb-1`} style={{ backgroundColor: color }}>
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
export default function ReportsView() {
  const [district, setDistrict] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processed: 0,
    complete: 0,
    matched: 0
  });
  const [loading, setLoading] = useState(true);

  // Flatten all districts for the dropdown
  const allDistricts = Object.keys(locationData).flatMap(city => 
    Object.keys(locationData[city].districts)
  );

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district !== "all") params.append("district", district);
      
      // 1. Fetch Applications Status
      const resApps = await fetch(`/api/applications?${params.toString()}`);
      const dataApps = await resApps.json();
      
      // 2. Fetch Matched IMEIs (Historical Totals)
      const resMatched = await fetch(`/api/matched-imeis?${params.toString()}&all=true`);
      const dataMatched = await resMatched.json();
      
      if (dataApps.success && dataMatched.success) {
        const apps = dataApps.applications || [];
        const matches = dataMatched.matches || [];
        
        setStats({
          total: apps.length,
          pending: apps.filter((a: any) => a.status === "pending").length,
          processed: apps.filter((a: any) => a.status === "processed").length,
          complete: apps.filter((a: any) => a.status === "complete").length,
          matched: matches.length
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
  }, [district]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      
      {/* 🔹 Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Operational Insights</h2>
          <p className="text-slate-500 text-sm">Real-time crime reporting and recovery metrics.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-2 pl-3 text-slate-400">
              <Filter size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">District:</span>
           </div>
           <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="w-[180px] border-0 focus:ring-0 shadow-none bg-slate-50 rounded-xl h-10 font-semibold text-slate-700">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Districts</SelectItem>
                {allDistricts.map(d => (
                  <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                ))}
              </SelectContent>
           </Select>
        </div>
      </div>

      {/* 🔹 Radial Stats Grid (5 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <RadialProgress 
          value={stats.total} 
          total={stats.total} 
          label="Total Reports" 
          color="#3b82f6" // blue-500
          icon={FileText}
        />
        <RadialProgress 
          value={stats.pending} 
          total={stats.total} 
          label="Pending" 
          color="#f59e0b" // amber-500
          icon={Clock}
        />
        <RadialProgress 
          value={stats.processed} 
          total={stats.total} 
          label="In Progress" 
          color="#6366f1" // indigo-500
          icon={Activity}
        />
        <RadialProgress 
          value={stats.complete} 
          total={stats.total} 
          label="Completed" 
          color="#10b981" // emerald-500
          icon={CheckCircle2}
        />
        <RadialProgress 
          value={stats.matched} 
          total={stats.total} 
          label="Device Matches" 
          color="#ef4444" // red-500
          icon={ShieldCheck}
        />
      </div>

      {/* 🔹 Summary Details Card */}
      <div className="bg-[#0f172a] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
         
         <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
               <h3 className="text-2xl font-bold mb-4">Recovery Summary</h3>
               <p className="text-slate-400 leading-relaxed mb-6">
                  Analysis for <span className="text-white font-bold capitalize">{district === "all" ? "Entire Sindh" : district}</span>. 
                  Out of {stats.total} reported devices, <span className="text-red-400 font-bold">{stats.matched}</span> have been successfully matched through our verification network.
               </p>
               <div className="flex gap-4">
                  <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Match Accuracy</p>
                     <p className="text-xl font-bold">{Math.round((stats.matched / stats.total) * 100 || 0)}%</p>
                  </div>
                  <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resolution</p>
                     <p className="text-xl font-bold">{stats.complete} Fixed</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                     <span className="text-slate-400">Recovered vs Reported</span>
                     <span>{stats.matched} / {stats.total}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.matched / stats.total) * 100 || 0}%` }}
                        className="h-full bg-red-500"
                     />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                     <span className="text-slate-400">System Efficiency</span>
                     <span>{Math.round((stats.complete / stats.total) * 100 || 0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.complete / stats.total) * 100 || 0}%` }}
                        className="h-full bg-emerald-500"
                     />
                  </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
}