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
import { FileText, Search, Plus, RotateCcw, ChevronRight, Clock, MapPin, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Reusable bilingual Detail Row
function DetailRow({
  labelEn,
  labelUr,
  value,
}: {
  labelEn: string;
  labelUr: string;
  value: any;
}) {
  return (
    <div className="text-sm text-gray-700 border-b py-3 flex flex-wrap items-center justify-between">
      <span className="font-semibold text-slate-600">
        {labelEn}
        <span className="text-slate-400 text-[11px] font-normal ml-2 italic">({labelUr})</span>
      </span>
      <span className="text-slate-800 font-medium ml-2 break-all">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

export default function Psusersapplication() {
  const [applications, setApplications] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ---------------- FETCH CURRENT USER ----------------
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/create-session");
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

  // ---------------- FETCH APPLICATIONS ----------------
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

  // Effect to fetch when period changes or user loads
  useEffect(() => {
    if (currentUser) {
        fetchApplications();
    }
  }, [currentUser, filterPeriod]);

  // ---------------- CLEAR FUNCTION ----------------
  function clearFilters() {
    setFilterPeriod("all");
  }

  // ---------------- MAIN JSX ----------------
  return (
    <div className="w-full space-y-6">
      
      {/* 🔹 STICKY FILTER BAR */}
      <div className="sticky top-0 z-30 -mt-2 pb-4 bg-slate-50/80 backdrop-blur-sm">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Branding */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">Station Records</h2>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentUser?.ps || "Police Station"}</p>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
                
                <div className="flex items-center gap-2">
                    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                        <SelectTrigger className="w-[200px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                            <SelectValue placeholder="Time Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time / تمام وقت</SelectItem>
                            <SelectItem value="15days">Last 15 Days / پچھلے 15 دن</SelectItem>
                            <SelectItem value="1month">Last 1 Month / پچھلا مہینہ</SelectItem>
                            <SelectItem value="3months">Last 3 Months / پچھلے 3 مہینے</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={fetchApplications}
                        className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 h-10 shadow-lg shadow-blue-600/20 px-6 font-semibold"
                        disabled={loading}
                    >
                        {loading ? "..." : "Refresh"}
                    </Button>

                    <Button
                        onClick={clearFilters}
                        variant="ghost"
                        className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0"
                    >
                        <RotateCcw size={18} />
                    </Button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <Button
                        onClick={() => setShowAddForm(true)}
                        className="bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 h-10 shadow-lg shadow-emerald-600/20 px-4 font-semibold"
                    >
                        <Plus size={18} className="mr-1" /> New Application
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* APPLICATION LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && applications.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100"></div>
            ))
        ) : applications.length > 0 ? (
          applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="group bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <FileText size={20} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {app.offenceDate ? new Date(app.offenceDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "No Date"}
                    </p>
                    <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                        app.status === "pending" ? "bg-amber-100 text-amber-700" :
                        app.status === "processed" ? "bg-blue-100 text-blue-700" :
                        "bg-emerald-100 text-emerald-700"
                    )}>
                        {app.status}
                    </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                  {app.applicantName}
                </p>
                <p className="text-xs text-slate-500 font-medium truncate">{app.applicantEmail || app.applicantMobile}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                 <span className="flex items-center gap-1"><MapPin size={10} /> {app.district}</span>
                 <ChevronRight size={14} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <FileText className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <p className="text-slate-500 font-medium">No records found for the selected period.</p>
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
                    <p className="text-blue-100 opacity-80 text-sm mt-1 uppercase tracking-widest font-bold">Official Record Copy</p>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-8 bg-white">
              {/* Applicant Info */}
              <section>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-blue-50 pb-2">
                    <User size={16} /> Applicant Information / درخواست دہندہ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <DetailRow labelEn="Full Name" labelUr="نام" value={selectedApp.applicantName} />
                    <DetailRow labelEn="Email" labelUr="ای میل" value={selectedApp.applicantEmail} />
                    <DetailRow labelEn="Phone" labelUr="فون نمبر" value={selectedApp.applicantPhone || selectedApp.applicantMobile} />
                    <DetailRow labelEn="CNIC" labelUr="شناختی کارڈ" value={selectedApp.cnic} />
                    <DetailRow labelEn="District" labelUr="ضلع" value={selectedApp.district} />
                    <DetailRow labelEn="Police Station" labelUr="تھانہ" value={selectedApp.ps} />
                </div>
              </section>

              {/* Application Data */}
              <section>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-blue-50 pb-2">
                    <Clock size={16} /> Incident & Device Data / واقعہ اور موبائل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    {Object.entries(selectedApp)
                    .filter(
                        ([key]) =>
                        ![
                            "id",
                            "createdAt",
                            "updatedAt",
                            "applicantName",
                            "applicantEmail",
                            "applicantPhone",
                            "applicantMobile",
                            "cnic",
                            "city",
                            "district",
                            "ps",
                            "processedBy",
                            "status",
                        ].includes(key)
                    )
                    .map(([key, value]) => {
                        if (value === null || value === undefined) return null;

                        const labelEn = key.replace(/([A-Z])/g, ' $1').trim();
                        const displayLabel = key === "pictureUrl" ? "Box Image" : 
                                             key === "attachmentUrl" ? "Attested Application" : labelEn;

                        if (typeof value === "string" && value.startsWith("http")) {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
                        return (
                            <div key={key} className="py-3 flex items-center justify-between border-b border-slate-200">
                                <span className="text-sm font-semibold text-slate-500 capitalize">{displayLabel}:</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 text-xs border-blue-200 hover:bg-blue-50 rounded-lg h-8"
                                    onClick={() => window.open(value, "_blank")}
                                >
                                    View {isImage ? "Image" : "File"}
                                </Button>
                            </div>
                        );
                        }

                        return (
                            <div key={key} className="text-sm text-gray-700 border-b py-3 flex flex-wrap items-center justify-between">
                                <span className="font-semibold text-slate-600 capitalize">{displayLabel}</span>
                                <span className="text-slate-800 font-medium ml-2">{String(value)}</span>
                            </div>
                        );
                    })}
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🔹 ADD APPLICATION POPUP */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className="sticky top-0 bg-blue-900 p-6 z-10 flex items-center justify-between text-white shadow-lg">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white/10 rounded-lg">
                    <Plus size={20} />
                 </div>
                 <DialogTitle className="text-xl font-bold">New Station Entry</DialogTitle>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => setShowAddForm(false)}>
                 ✕
              </Button>
            </div>
            <div className="p-0">
              <AddApplicationForm currentUser={currentUser} />
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}