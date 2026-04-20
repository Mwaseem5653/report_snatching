"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileCheck, 
  MapPin, 
  User, 
  Clock, 
  Smartphone, 
  ShieldAlert,
  ChevronRight,
  Loader2,
  Calendar,
  Building2,
  Mail,
  Fingerprint,
  Phone,
  Send,
  CheckCircle,
  Search,
  RotateCcw,
  RefreshCcw,
  History
} from "lucide-react";
import { motion } from "framer-motion";
import { cn, getApiUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// ✅ Helper Row for Details
function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
            <div className="mt-0.5 text-slate-400">
                <Icon size={16} />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-semibold text-slate-700">{value || "—"}</p>
            </div>
        </div>
    );
}

export default function MatchedIMEIsView() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Filter States
  const [searchImei, setSearchImei] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all"); // 🚀 Changed to 'all'
  const [filterStatus, setFilterStatus] = useState("new"); // 🚀 New: Default to 'new'

  // 1. Fetch Session
  useEffect(() => {
    async function fetchSession() {
      const res = await fetch(getApiUrl("/api/auth/create-session"));
      const data = await res.json();
      if (data.authenticated) setCurrentUser(data);
    }
    fetchSession();
  }, []);

  // 2. Fetch Matches
  const fetchMatches = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchImei.trim()) {
          params.append("imei", searchImei.trim());
          params.append("period", "all"); 
          params.append("status", "all"); // Search across everything
      } else {
          params.append("period", filterPeriod);
          params.append("status", filterStatus); // 🚀 Respect status filter
      }

      const res = await fetch(getApiUrl(`/api/matched-imeis?${params.toString()}`));
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Failed to fetch matched IMEIs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on any filter change
  useEffect(() => {
    if (currentUser) {
        fetchMatches();
    }
  }, [currentUser, filterPeriod, filterStatus]);

  const handleClearFilters = () => {
      setSearchImei("");
      setFilterPeriod("1month");
      setFilterStatus("new");
  };

  // 3. Handle Update Action
  const handleAction = async (action: "officer_view" | "admin_acknowledge" | "not_clear", targetId?: string) => {
    const id = targetId || selectedMatch?.id;
    if (!id) return;

    if (action === "officer_view" && !note.trim()) {
        alert("Please add a note about the case progress.");
        return;
    }

    setUpdating(true);
    try {
        const res = await fetch(getApiUrl("/api/matched-imeis/update"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: id, note, action })
        });

        if (res.ok) {
            if (!targetId) { 
                setSelectedMatch(null); 
                setNote("");
            }
            fetchMatches();
            window.dispatchEvent(new Event('focus')); // Refresh header notifs
        }
    } catch (err) {
        console.error("Action error:", err);
    } finally {
        setUpdating(false);
    }
  };

  const handleView = (match: any) => {
    setSelectedMatch(match);
    setNote(match.officerNote || "");

    if (currentUser?.role === "super_admin" && match.status !== "cleared") {
        handleAction("admin_acknowledge", match.id);
    }
  };

  const isClearedForUser = (match: any) => {
      if (!currentUser) return false;
      if (currentUser.role === "super_admin") return match.superAdminCleared;
      if (currentUser.role === "admin") return match.adminCleared;
      return match.status === "cleared";
  };

  return (
    <div className="w-full space-y-6">
      
      {/* 🔹 FILTER BAR */}
      <div className="sticky top-0 z-30 -mt-2 pb-4 bg-slate-50/80 backdrop-blur-sm">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <ShieldAlert size={20} />
                </div>
                <div className="hidden sm:block">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800 leading-tight">Matched Recoveries</h2>
                        <button onClick={fetchMatches} disabled={loading} className="p-1 hover:bg-slate-100 rounded-full group">
                            <RefreshCcw size={14} className={cn("text-slate-400 group-hover:text-blue-600", loading && "animate-spin")} />
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status: {filterStatus.replace('new', 'unseen alerts')}</p>
                </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400 h-4 w-4" />
                    <Input
                        placeholder="Search IMEI for history..."
                        value={searchImei}
                        onChange={(e) => setSearchImei(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchMatches()}
                        className="pl-9 border-slate-200 focus:ring-red-500 rounded-xl bg-slate-50/50 h-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* 🚀 New: Status Filter */}
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                            <SelectValue placeholder="Alert Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="new">Pending Alerts</SelectItem>
                            <SelectItem value="processed">Officer Processed</SelectItem>
                            <SelectItem value="cleared">Acknowledged</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* 🚀 Period Selector in sequence */}
                    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                        <SelectTrigger className="w-[130px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15days">15 Days</SelectItem>
                            <SelectItem value="1month">1 Month</SelectItem>
                            <SelectItem value="3months">3 Months</SelectItem>
                            <SelectItem value="6months">6 Months</SelectItem>
                            <SelectItem value="all">All History</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={fetchMatches} className="bg-slate-800 text-white rounded-xl h-10 shadow-lg px-6 font-semibold" disabled={loading}>
                        {loading ? "..." : "Search"}
                    </Button>
                    <Button onClick={handleClearFilters} variant="ghost" className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0" title="Reset Filters">
                        <RotateCcw size={18} />
                    </Button>
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {loading && matches.length === 0 ? (
            Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-12 bg-white rounded-xl animate-pulse border border-slate-100"></div>
            ))
        ) : matches.length > 0 ? (
          matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleView(match)}
              className="group bg-white border border-slate-200 py-1.5 px-4 rounded-xl hover:shadow-md hover:border-red-300 transition-all duration-200 relative overflow-hidden cursor-pointer flex items-center justify-between"
            >
              <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  match.status === "cleared" ? "bg-emerald-500" : 
                  match.status === "processed" ? "bg-amber-500" : "bg-red-500"
              )}></div>
              
              <div className="flex flex-col">
                <p className="font-extrabold text-[#0a2c4e] text-sm uppercase tracking-tight group-hover:text-red-600 transition-colors leading-tight">
                  {match.applicantName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">
                        {match.applicantMobile || match.applicantPhone || "No Contact"}
                    </p>
                    <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                    <p className="text-[9px] text-red-600 font-mono font-bold uppercase">IMEI: {match.imei}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Police Station</p>
                    <p className="font-bold text-slate-700 text-xs uppercase tracking-tight">{match.originalPs || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider", 
                        match.status === "cleared" ? "bg-emerald-50 text-emerald-700" : 
                        match.status === "processed" ? "bg-amber-50 text-amber-700" : 
                        "bg-red-50 text-red-700"
                    )}>
                        {match.status || "NEW"}
                    </span>
                   <ChevronRight size={16} className="text-slate-300 group-hover:text-red-500 transition-all" />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <ShieldAlert className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <p className="text-slate-500 font-medium">No records found. Try changing your filters.</p>
          </div>
        )}
      </div>

      {/* 🔹 DETAIL POPUP */}
      {selectedMatch && (
        <Dialog open={true} onOpenChange={() => setSelectedMatch(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className={cn(
                "p-8 text-white relative",
                isClearedForUser(selectedMatch) ? "bg-gradient-to-r from-emerald-700 to-emerald-900" : 
                selectedMatch.status === "processed" ? "bg-gradient-to-r from-amber-600 to-amber-800" :
                "bg-gradient-to-r from-red-700 to-red-900"
            )}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    {isClearedForUser(selectedMatch) ? <CheckCircle size={120} /> : <ShieldAlert size={120} />}
                </div>
                <DialogHeader className="relative z-10">
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                        {isClearedForUser(selectedMatch) ? <CheckCircle /> : <ShieldAlert />} 
                        {isClearedForUser(selectedMatch) ? "Recovery Acknowledged" : 
                         selectedMatch.status === "processed" ? "Recovery Processed" : "Recovery Match Found"}
                    </DialogTitle>
                    <p className="text-blue-100 opacity-80 text-sm mt-1 uppercase tracking-widest font-bold font-sans">Official Record Copy</p>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        Device & Original Report
                    </h3>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-1">
                        <InfoRow icon={Fingerprint} label="IMEI Number" value={selectedMatch.imei} />
                        <InfoRow icon={User} label="Applicant Name" value={selectedMatch.applicantName} />
                        <InfoRow icon={Building2} label="Police Station" value={selectedMatch.originalPs} />
                        <InfoRow icon={MapPin} label="Origin District" value={selectedMatch.originalDistrict} />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        Identified By
                    </h3>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-1">
                        <InfoRow icon={User} label="Officer Name" value={selectedMatch.foundBy?.name} />
                        <InfoRow icon={Mail} label="Official Email" value={selectedMatch.foundBy?.email} />
                        <InfoRow icon={Phone} label="Officer Mobile" value={selectedMatch.foundBy?.mobile || "—"} />
                        <InfoRow icon={Building2} label="Current Assignment" value={selectedMatch.foundBy?.ps || selectedMatch.foundBy?.district} />
                        <InfoRow icon={Calendar} label="Matched On" value={new Date(selectedMatch.matchedAt?._seconds * 1000 || Date.now()).toLocaleString()} />
                    </div>
                  </section>
              </div>

              <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FileCheck className="text-blue-600" size={18} /> Case Process Log
                  </h3>
                  <div className="space-y-6">
                      <div className="space-y-3">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Case Status / Process Note</Label>
                          {selectedMatch.status !== "recovered" && (
                          <div className="space-y-3">
                              <Textarea 
                                placeholder="Describe current process or action taken..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="rounded-xl border-slate-200 bg-white min-h-[100px] focus:ring-blue-500 font-sans"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                  <Button 
                                    onClick={() => handleAction("admin_acknowledge")}
                                    disabled={updating}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-lg shadow-emerald-600/20 uppercase font-bold tracking-widest text-[10px]"
                                  >
                                    {updating ? <Loader2 className="animate-spin" /> : "Submit Note & Clear Status"}
                                  </Button>
                                  <Button 
                                    onClick={() => handleAction("officer_view")}
                                    disabled={updating}
                                    className="bg-slate-600 hover:bg-slate-700 text-white rounded-xl h-11 shadow-lg shadow-slate-600/20 uppercase font-bold tracking-widest text-[10px]"
                                  >
                                    {updating ? <Loader2 className="animate-spin" /> : "Submit Report Not Clear"}
                                  </Button>
                              </div>
                          </div>
                      )}
                      </div>

                      {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && (
                          <div className="pt-4 border-t border-slate-200">
                              <Button 
                                onClick={() => handleAction(selectedMatch.status === "recovered" ? "not_clear" : "admin_acknowledge")}
                                disabled={updating}
                                className={cn(
                                    "w-full h-11 rounded-xl shadow-lg font-black uppercase tracking-[0.2em] text-xs transition-all",
                                    selectedMatch.status === "recovered" 
                                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" 
                                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                )}
                              >
                                {updating ? <Loader2 className="animate-spin" /> : (
                                    selectedMatch.status === "recovered" ? "Not Clear Status" : "Clear Device Status"
                                )}
                              </Button>
                          </div>
                      )}

                      {selectedMatch.status === "cleared" && selectedMatch.acknowledgedBy && (
                          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                              <CheckCircle className="text-emerald-600 shrink-0" />
                              <div className="leading-tight">
                                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Alert Cleared</p>
                                  <p className="text-[11px] text-emerald-600 font-medium">This case has been officially acknowledged by {selectedMatch.acknowledgedBy.name}.</p>
                              </div>
                          </div>
                      )}
                  </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}