"use client";

import React, { useState, useEffect } from "react";
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
  RotateCcw
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
  const [filterPeriod, setFilterPeriod] = useState("all");

  // 1. Fetch Session
  useEffect(() => {
    async function fetchSession() {
      const res = await fetch("/api/auth/create-session");
      const data = await res.json();
      if (data.authenticated) setCurrentUser(data);
    }
    fetchSession();
  }, []);

  // 2. Fetch Matches
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchImei.trim()) params.append("imei", searchImei.trim());
      if (filterPeriod !== "all") params.append("period", filterPeriod);

      const res = await fetch(`/api/matched-imeis?${params.toString()}`);
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

  // Initial load
  useEffect(() => {
    fetchMatches(); 
  }, []);

  const handleClearFilters = () => {
      setSearchImei("");
      setFilterPeriod("all");
      // Explicitly fetch with cleared params (which will trigger 'new' only view per API logic)
      setTimeout(() => fetchMatches(), 10);
  };

  // 3. Handle Update Action
  const handleAction = async (action: "officer_view" | "admin_acknowledge", targetId?: string) => {
    const id = targetId || selectedMatch?.id;
    if (!id) return;

    if (action === "officer_view" && !note.trim()) {
        alert("Please add a note about the case progress.");
        return;
    }

    setUpdating(true);
    try {
        const res = await fetch("/api/matched-imeis/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: id, note, action })
        });

        if (res.ok) {
            // Note: Per user request, Admin acknowledgment should clear from default load 
            // but not necessarily change the UI state of the CURRENTLY OPEN dialog.
            // We just refresh the list in the background.
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

  return (
    <div className="w-full space-y-6">
      
      {/* 🔹 FILTER BAR */}
      <div className="sticky top-0 z-30 -mt-2 pb-4 bg-slate-50/80 backdrop-blur-sm">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Matched IMEIs</h2>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Recovery Verification</p>
                </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400 h-4 w-4" />
                    <Input
                        placeholder="Search by IMEI Number..."
                        value={searchImei}
                        onChange={(e) => setSearchImei(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchMatches()}
                        className="pl-9 border-slate-200 focus:ring-red-500 rounded-xl bg-slate-50/50 h-10"
                    />
                </div>

                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="w-[140px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="15days">Last 15 Days</SelectItem>
                        <SelectItem value="1month">Last 1 Month</SelectItem>
                        <SelectItem value="3months">Last 3 Months</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={fetchMatches}
                        className="bg-slate-800 text-white rounded-xl hover:bg-slate-900 h-10 shadow-lg px-6 font-semibold"
                        disabled={loading}
                    >
                        {loading ? "..." : "Search"}
                    </Button>
                    <Button
                        onClick={handleClearFilters}
                        variant="ghost"
                        className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0"
                    >
                        <RotateCcw size={18} />
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100"></div>
            ))}
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleView(match)}
              className="group bg-white border border-slate-200 p-6 rounded-3xl hover:shadow-xl hover:border-red-200 transition-all duration-300 relative overflow-hidden cursor-pointer"
            >
              <div className={cn(
                  "absolute top-0 left-0 w-1.5 h-full",
                  match.status === "cleared" ? "bg-emerald-500" : 
                  match.status === "processed" ? "bg-amber-500" : "bg-red-500"
              )}></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center",
                    match.status === "cleared" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                )}>
                    {match.status === "cleared" ? <CheckCircle size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status</p>
                    <p className={cn(
                        "text-xs font-black uppercase",
                        match.status === "cleared" ? "text-emerald-600" : 
                        match.status === "processed" ? "text-amber-600" : "text-red-600"
                    )}>
                        {match.status || "NEW"}
                    </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Reported Device</p>
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                        <Smartphone size={14} className="text-slate-400" />
                        IMEI: {match.imei}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Applicant</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{match.applicantName}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Origin</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{match.originalPs}</p>
                    </div>
                </div>

                <div className="pt-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-2">Identified By</p>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div className="h-7 w-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                            {match.foundBy?.name?.charAt(0) || "U"}
                        </div>
                        <div className="leading-tight flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{match.foundBy?.name}</p>
                            <p className="text-[9px] text-slate-400 capitalize truncate">{match.foundBy?.role?.replace("_", " ")} • {match.foundBy?.ps || match.foundBy?.district}</p>
                        </div>
                    </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
           <FileCheck className="mx-auto h-12 w-12 text-slate-200 mb-4" />
           <p className="text-slate-500 font-medium">No active recovery alerts.</p>
        </div>
      )}

      {/* 🔹 DETAIL POPUP */}
      {selectedMatch && (
        <Dialog open={true} onOpenChange={() => setSelectedMatch(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className={cn(
                "p-8 text-white relative",
                selectedMatch.status === "cleared" ? "bg-gradient-to-r from-emerald-700 to-emerald-900" : "bg-gradient-to-r from-red-700 to-red-900"
            )}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    {selectedMatch.status === "cleared" ? <CheckCircle size={120} /> : <ShieldAlert size={120} />}
                </div>
                <DialogHeader className="relative z-10">
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                        {selectedMatch.status === "cleared" ? <CheckCircle /> : <ShieldAlert />} 
                        {selectedMatch.status === "cleared" ? "Recovery Acknowledged" : "Recovery Match Found"}
                    </DialogTitle>
                    <p className="text-blue-100 opacity-80 text-sm mt-1 uppercase tracking-widest font-bold">Confidential Incident Report</p>
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
                          <Label className="text-xs font-bold text-slate-500 uppercase">Case Status / Process Note</Label>
                          {selectedMatch.status === "new" && currentUser?.role === "officer" ? (
                              <div className="space-y-3">
                                  <Textarea 
                                    placeholder="Describe current process or action taken..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="rounded-xl border-slate-200 bg-white min-h-[100px] focus:ring-blue-500"
                                  />
                                  <Button 
                                    onClick={() => handleAction("officer_view")}
                                    disabled={updating}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 shadow-lg shadow-blue-600/20"
                                  >
                                    {updating ? <Loader2 className="animate-spin" /> : <><Send size={16} className="mr-2"/> Submit Process Note</>}
                                  </Button>
                              </div>
                          ) : (
                              <div className="p-4 bg-white rounded-2xl border border-slate-100">
                                  <p className="text-sm text-slate-700 leading-relaxed italic">
                                      {selectedMatch.officerNote || "No process notes added yet."}
                                  </p>
                                  {selectedMatch.viewedBy && (
                                      <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase">
                                          Logged by {selectedMatch.viewedBy.name} • {new Date(selectedMatch.viewedBy.at?._seconds * 1000).toLocaleString()}
                                      </p>
                                  )}
                              </div>
                          )}
                      </div>

                      {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && selectedMatch.status !== "cleared" && (
                          <div className="pt-4 border-t border-slate-200">
                              <p className="text-[11px] text-slate-500 mb-3 text-center">Admin action required to clear the system alert.</p>
                              <Button 
                                onClick={() => handleAction("admin_acknowledge")}
                                disabled={updating}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-lg shadow-emerald-600/20 font-bold"
                              >
                                {updating ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} className="mr-2"/> Acknowledge & Clear Alert</>}
                              </Button>
                          </div>
                      )}

                      {selectedMatch.status === "cleared" && selectedMatch.acknowledgedBy && (
                          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                              <CheckCircle className="text-emerald-600 shrink-0" />
                              <div className="leading-tight">
                                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Alert Cleared</p>
                                  <p className="text-[11px] text-emerald-600">This case has been officially acknowledged by {selectedMatch.acknowledgedBy.name}.</p>
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
