"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddApplicationForm from "../applicationform/applicationform";
import { getApplications } from "@/lib/applicationApi";
import { FileText, Search, Plus, RotateCcw, ChevronRight, Clock, MapPin, Calendar, User, X } from "lucide-react";
import { cn, getApiUrl } from "@/lib/utils";

export default function Psusersapplication() {
  const [applications, setApplications] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>("today");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(getApiUrl("/api/auth/create-session"));
        const data = await res.json();
        if (data.authenticated) {
          setCurrentUser({
            uid: data.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            city: data.city ?? null,
            district: data.district ?? null,
            ps: data.ps ?? null,
          });
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    }
    fetchSession();
  }, []);

  async function fetchApplications() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {
        period: filterPeriod,
        district: currentUser.district,
        ps: currentUser.ps,
      };
      const data = await getApplications(params);
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Application fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) fetchApplications();
  }, [currentUser, filterPeriod]);

  function clearFilters() {
    setFilterPeriod("today");
  }

  const formatAppDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    try {
        if (dateVal.seconds || dateVal._seconds) {
            const s = dateVal.seconds || dateVal._seconds;
            return new Date(s * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        const date = new Date(dateVal);
        return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return "N/A"; }
  }

  return (
    <div className="w-full space-y-6">
      
      {/* 🔹 FILTER BAR (RE-DESIGNED FOR MOBILE) */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><FileText size={20} /></div>
              <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800 leading-tight">Station Records</h2>
                  <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate max-w-[150px] md:max-w-none">{currentUser?.ps || "Loading Station..."}</p>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2 justify-end">
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="flex-1 sm:w-[180px] border-slate-200 rounded-xl bg-slate-50/50 h-10 text-[11px] font-bold">
                      <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="15days">Last 15 Days</SelectItem>
                      <SelectItem value="1month">Last 1 Month</SelectItem>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                  </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button onClick={fetchApplications} className="flex-1 sm:flex-none bg-blue-600 text-white rounded-xl h-10 px-4 font-semibold text-xs" disabled={loading}>{loading ? "..." : "Refresh"}</Button>
                <Button onClick={clearFilters} variant="ghost" className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0 shrink-0"><RotateCcw size={18} /></Button>
                <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
                <Button onClick={() => setShowAddForm(true)} className="flex-1 sm:flex-none bg-emerald-600 text-white rounded-xl h-10 px-4 font-semibold text-xs shrink-0"><Plus size={18} className="mr-1" /> New Entry</Button>
              </div>
          </div>
      </div>

      {/* APPLICATION LIST (USING COMPACT UI) */}
      <div className="flex flex-col gap-1">
        {loading && applications.length === 0 ? (
            Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-12 bg-white rounded-xl animate-pulse border border-slate-100"></div>)
        ) : applications.length > 0 ? (
          applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="group bg-white border border-slate-200 py-2 px-4 rounded-xl cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 relative overflow-hidden flex items-center justify-between"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex flex-col min-w-0 flex-1">
                <p className="font-black text-[#0a2c4e] text-xs uppercase tracking-tight group-hover:text-blue-700 transition-colors leading-none truncate pr-2">
                  {app.applicantName}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <p className="text-[9px] text-slate-400 font-bold tracking-wider">
                        {app.applicantMobile || app.applicantPhone || "No Contact"}
                    </p>
                    <span className="hidden sm:block w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                    <p className="text-[8px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-1 rounded-[4px]">
                        {app.crimeHead || "N/A"}
                    </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-2">
                <div className="flex flex-col items-end gap-1">
                   <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border",
                        app.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        app.status === "processed" ? "bg-blue-50 text-blue-600 border-blue-100" :
                        "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                        {app.status}
                    </span>
                    <p className="font-bold text-slate-400 text-[7px] md:text-[9px] uppercase tracking-tighter truncate max-w-[70px] md:max-w-none text-right leading-none">
                        {app.ps ? app.ps.toUpperCase() : "SINDH POLICE"}
                    </p>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all" />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <FileText className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <p className="text-slate-500 font-medium font-black uppercase tracking-widest text-xs text-center">No records found.</p>
          </div>
        )}
      </div>

      {/* 🔹 DETAIL POPUP */}
      {selectedApp && (
        <Dialog open={true} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-[2rem] p-0 border-0 shadow-2xl overflow-x-hidden !top-[50%] !translate-y-[-50%] flex flex-col">
            <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><X size={20} /></button>
            <div className="bg-[#0a2c4e] p-8 md:p-10 text-white relative overflow-hidden shrink-0">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20", selectedApp.status === "pending" ? "bg-amber-500" : selectedApp.status === "processed" ? "bg-blue-500" : "bg-emerald-500")}>
                            {selectedApp.status}
                        </span>
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Case ID: {selectedApp.id}</span>
                    </div>
                    <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                        {selectedApp.applicantName}
                    </DialogTitle>
                    <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Station: {selectedApp.ps}</p>
                </DialogHeader>
            </div>
            <div className="p-6 md:p-10 bg-white flex-1 overflow-y-auto">
                {/* Details layout similar to Admin view for consistency */}
                <p className="text-center text-slate-400 text-xs italic">Full details view ready.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🔹 ADD APPLICATION POPUP */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-0 shadow-2xl fixed !top-[5vh] left-1/2 -translate-x-1/2 !translate-y-0 flex flex-col">
            <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><X size={20} /></button>
            <div className="sticky top-0 bg-[#0a2c4e] p-6 z-10 text-white shadow-xl shrink-0">
              <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-3"><Plus /> New Station Entry</DialogTitle>
            </div>
            <div className="p-0 bg-slate-50 flex-1 overflow-y-auto">
                <AddApplicationForm currentUser={currentUser} />
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
