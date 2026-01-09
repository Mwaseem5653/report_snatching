"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";

interface OfficerStatsProps {
  uid: string;
}

const CircularProgress = ({ value, label, color, icon: Icon }: any) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white transition-all duration-300 group">
      <div className="relative flex items-center justify-center">
        <svg className="w-10 h-10 transform -rotate-90">
          <circle cx="20" cy="20" r={radius} stroke="#e2e8f0" strokeWidth="3" fill="transparent" />
          <motion.circle
            cx="20" cy="20" r={radius} stroke={color} strokeWidth="3" fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * 0.4 }} 
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
           <Icon size={12} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-[16px] font-black text-slate-800 leading-none">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{label}</p>
      </div>
    </div>
  );
};

export default function OfficerStats({ uid }: OfficerStatsProps) {
  const [stats, setStats] = useState({
    processed: 0,
    complete: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/applications");
        const data = await res.json();
        if (data.success) {
          const myApps = data.applications.filter((app: any) => app.processedBy?.uid === uid);
          const processed = myApps.filter((app: any) => app.status === "processed").length;
          const complete = myApps.filter((app: any) => app.status === "complete").length;
          setStats({
            processed,
            complete,
            total: myApps.length
          });
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (uid) fetchStats();
  }, [uid]);

  if (loading) return (
    <div className="flex gap-2">
        {[1, 2].map(i => <div key={i} className="w-24 h-12 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <CircularProgress value={stats.processed} label="Process" color="#f59e0b" icon={Clock} />
      <CircularProgress value={stats.complete} label="Solved" color="#10b981" icon={CheckCircle2} />
    </div>
  );
}