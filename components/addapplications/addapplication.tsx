"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddApplicationForm from "../applicationform/applicationform";
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
import { getApplications, updateApplication } from "@/lib/applicationApi";
import { Search, Plus, Filter, RotateCcw, FileText, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Simple text row component
function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <p className="text-sm text-gray-700 border-b py-2.5 flex flex-wrap items-center justify-between">
      <span className="font-semibold text-slate-500">{label}:</span>
      <span className="text-slate-800 ml-2 font-medium">{value ? value : "—"}</span>
    </p>
  );
}

export default function ApplicationManagement() {
  const [applications, setApplications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending"); // Default to pending
  const [filterPeriod, setFilterPeriod] = useState<string>("1month"); // Default to 1 month for speed
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Session
  useEffect(() => {
    async function fetchSession() {
      const res = await fetch("/api/auth/create-session");
      const data = await res.json();
      if (data.authenticated) setCurrentUser(data);
    }
    fetchSession();
  }, []);

  // 2. Main Search Function
  const handleSearch = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {
          status: filterStatus,
          period: filterPeriod
      };

      if (searchQuery.trim()) {
          params.search = searchQuery.trim();
          params.period = "all"; // Force all-time search if specific query is provided
      }

      const res = await fetch(`/api/applications?${new URLSearchParams(params).toString()}`);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on mount and when filters change
  useEffect(() => {
    if (currentUser) {
        handleSearch();
    }
  }, [currentUser, filterStatus, filterPeriod]);

  const handleClear = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterPeriod("all");
  };

  const handleUpdateStatus = async (app: any, newStatus: string, comments?: string) => {
    try {
      const res = await updateApplication({
        ...app,
        status: newStatus,
        processedBy: currentUser?.role === "officer" ? { name: currentUser?.name, email: currentUser?.email, mobile: currentUser?.mobile } : undefined,
        comments,
      });

      if (res.success) {
        alert("✅ Status updated!");
        setSelectedApp(null);
        handleSearch();
      }
    } catch {
      alert("Update failed!");
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* 🔹 STICKY FILTER BAR */}
      <div className="sticky top-0 z-30 -mt-2 pb-4 bg-slate-50/80 backdrop-blur-sm">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText size={20} />
                </div>
                <div className="hidden sm:block">
                    <h2 className="text-lg font-bold text-slate-800">Applications</h2>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Management Portal</p>
                </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400 h-4 w-4" />
                    <Input
                        placeholder="Search by Name, IMEI, CNIC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-9 border-slate-200 focus:ring-blue-500 rounded-xl bg-slate-50/50 h-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[130px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processed">Processed</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                        <SelectTrigger className="w-[130px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="15days">15 Days</SelectItem>
                            <SelectItem value="1month">1 Month</SelectItem>
                            <SelectItem value="6months">6 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={handleSearch} className="bg-blue-600 text-white rounded-xl h-10 shadow-lg px-6 font-semibold" disabled={loading}>
                        {loading ? "..." : "Search"}
                    </Button>
                    <Button onClick={handleClear} variant="ghost" className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0">
                        <RotateCcw size={18} />
                    </Button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <Button onClick={() => setShowAddForm(true)} className="bg-emerald-600 text-white rounded-xl h-10 shadow-lg shadow-emerald-600/20 px-4 font-semibold">
                        <Plus size={18} className="mr-1" /> New
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && applications.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100"></div>)
        ) : applications.length > 0 ? (
          applications.map((app) => (
            <div key={app.id} onClick={() => setSelectedApp(app)} className="group bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <FileText size={20} />
                </div>
                <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    app.status === "pending" ? "bg-amber-100 text-amber-700" :
                    app.status === "processed" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                )}>
                    {app.status}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">{app.applicantName}</p>
                <p className="text-[10px] text-blue-600 font-mono mt-1">IMEI: {app.imei1}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                 <span>{app.ps || app.city || "Sindh"}</span>
                 <ChevronRight size={14} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <FileText className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <p className="text-slate-500 font-medium">No applications found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* 🔹 DETAIL POPUP */}
      {selectedApp && (
        <Dialog open={true} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                        <FileText /> Application Details
                    </DialogTitle>
                    <p className="text-blue-100 opacity-80 text-sm mt-1">Reference ID: {selectedApp.id}</p>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-8 bg-white">
              <section>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    Applicant Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <DetailRow label="Name" value={selectedApp.applicantName} />
                    <DetailRow label="Email" value={selectedApp.applicantEmail} />
                    <DetailRow label="Phone" value={selectedApp.applicantPhone} />
                    <DetailRow label="City" value={selectedApp.city} />
                    <DetailRow label="District" value={selectedApp.district} />
                    <DetailRow label="Police Station" value={selectedApp.ps} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    Device & Incident Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    {Object.entries(selectedApp)
                    .filter(([key]) => !["id","createdAt","updatedAt","applicantName","applicantEmail","applicantPhone","city","district","ps","processedBy","status"].includes(key))
                    .map(([key, value]) => {
                        if (!value) return null;
                        const displayLabel = key === "pictureUrl" ? "Box Image" : key === "attachmentUrl" ? "Attested Application" : key.replace(/([A-Z])/g, ' $1').trim();
                        if (typeof value === "string" && value.startsWith("http")) {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
                            return (
                                <div key={key} className="py-3 flex items-center justify-between border-b border-slate-200">
                                    <span className="text-sm font-semibold text-slate-500 capitalize">{displayLabel}:</span>
                                    <Button variant="outline" size="sm" className="text-blue-600 text-xs border-blue-200 hover:bg-blue-50 rounded-lg h-8" onClick={() => window.open(value, "_blank")}>
                                        View {isImage ? "Image" : "File"}
                                    </Button>
                                </div>
                            );
                        }
                        return <DetailRow key={key} label={displayLabel} value={value} />;
                    })}
                </div>
              </section>

              {/* Status Actions */}
              <section className="pt-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Current Progress</p>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                selectedApp.status === "pending" ? "bg-amber-500 text-white" :
                                selectedApp.status === "processed" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                            )}>
                                {selectedApp.status}
                            </span>
                            {selectedApp.processedBy && <span className="text-sm text-slate-500 font-medium">Processed by {selectedApp.processedBy.name}</span>}
                        </div>
                    </div>
                    {currentUser?.role === "officer" && (
                    <div className="flex gap-3">
                        {selectedApp.status === "pending" && <Button onClick={() => handleUpdateStatus(selectedApp, "processed")} className="bg-blue-600 text-white rounded-xl shadow-lg px-6 h-11">Mark as Processed</Button>}
                        {selectedApp.status === "processed" && <Button onClick={() => handleUpdateStatus(selectedApp, "complete", "Completed successfully")} className="bg-emerald-600 text-white rounded-xl shadow-lg px-6 h-11">Mark Complete</Button>}
                    </div>
                    )}
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🔹 Add Application */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className="sticky top-0 bg-blue-900 p-6 z-10 flex items-center justify-between text-white">
              <DialogTitle className="text-xl font-bold">New Application</DialogTitle>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => setShowAddForm(false)}>✕</Button>
            </div>
            <AddApplicationForm currentUser={currentUser} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
