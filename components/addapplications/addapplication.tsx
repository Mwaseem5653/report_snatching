"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription
} from "@/components/ui/dialog";
import { updateApplication } from "@/lib/applicationApi";
import { Search, Plus, Filter, RotateCcw, FileText, ChevronRight, CheckCircle2, ClipboardList, History, X, Smartphone, MapPin, User, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

function DetailRow({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  return (
    <div className="text-sm text-gray-700 border-b border-slate-100 py-3 flex flex-wrap items-center justify-between group">
      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
        {Icon && <Icon size={12} className="text-slate-300" />}
        {label}:
      </span>
      <span className="text-slate-800 ml-2 font-bold">{value ? value : "—"}</span>
    </div>
  );
}

export default function ApplicationManagement({ officerUid }: { officerUid?: string }) {
  const [applications, setApplications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(officerUid ? "processed" : "pending");
  const [filterPeriod, setFilterPeriod] = useState<string>("15days");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionData, setCompletionData] = useState({ finalNote: "", processDetails: "" });

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch("/api/auth/create-session");
      const data = await res.json();
      if (data.authenticated) setCurrentUser(data);
    }
    fetchSession();
  }, []);

  const handleSearch = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { 
          status: filterStatus === "all" ? "all" : filterStatus, 
          period: filterPeriod 
      };
      
      if (searchQuery.trim()) {
          params.search = searchQuery.trim();
          params.period = "all";
      }

      const res = await fetch(`/api/applications?${new URLSearchParams(params).toString()}`);
      const data = await res.json();
      let apps = data.applications || [];

      if (officerUid) {
          apps = apps.filter((app: any) => app.processedBy?.uid === officerUid);
      }

      setApplications(apps);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) handleSearch();
  }, [currentUser, filterStatus, filterPeriod, officerUid]);

  const handleClear = () => {
    setSearchQuery("");
    setFilterStatus(officerUid ? "all" : "pending");
    setFilterPeriod("15days");
  };

  const handleUpdateStatus = async (app: any, newStatus: string, comments?: string, processDetails?: string) => {
    try {
      const res = await updateApplication({
        ...app,
        status: newStatus,
        comments: comments || app.comments,
        processDetails: processDetails || app.processDetails,
        // Backend handles current user from token, but we pass these for completeness/safety
        officerInfo: {
            name: currentUser?.name,
            mobile: currentUser?.mobile,
            uid: currentUser?.uid
        }
      });
      if (res.success) {
        alert("✅ Application updated successfully!");
        setSelectedApp(null);
        setShowCompleteDialog(false);
        setCompletionData({ finalNote: "", processDetails: "" });
        handleSearch();
      }
    } catch { alert("Update failed!"); }
  };

  const formatAppDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    try {
        // Handle Firestore Timestamp {_seconds, _nanoseconds} or {seconds, nanoseconds}
        if (dateVal.seconds || dateVal._seconds) {
            const s = dateVal.seconds || dateVal._seconds;
            return new Date(s * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        // Handle JS Date or ISO String
        const date = new Date(dateVal);
        return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return "N/A";
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* 🔹 FILTER BAR */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20} /></div>
              <div className="hidden sm:block">
                  <h2 className="text-lg font-bold text-slate-800">Applications</h2>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Management Portal</p>
              </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400 h-4 w-4" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="pl-9 border-slate-200 rounded-xl bg-slate-50/50 h-10 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[130px] rounded-xl h-10 border-slate-200 bg-slate-50/50 text-xs font-bold"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                          {officerUid ? (
                              <>
                                  <SelectItem value="all">All My Cases</SelectItem>
                                  <SelectItem value="processed">My In-Process</SelectItem>
                                  <SelectItem value="complete">My Completed</SelectItem>
                              </>
                          ) : (
                              <>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processed">In Process</SelectItem>
                                  <SelectItem value="complete">Completed</SelectItem>
                              </>
                          )}
                      </SelectContent>
                  </Select>

                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                      <SelectTrigger className="w-[130px] rounded-xl h-10 border-slate-200 bg-slate-50/50 text-xs font-bold"><SelectValue placeholder="Period" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="15days">15 Days</SelectItem>
                          <SelectItem value="1month">1 Month</SelectItem>
                          <SelectItem value="6months">6 Months</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              <Button onClick={handleSearch} className="bg-blue-600 text-white rounded-xl h-10 px-6 font-semibold" disabled={loading}>{loading ? "..." : "Search"}</Button>
              <Button onClick={handleClear} variant="ghost" className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0"><RotateCcw size={18} /></Button>
              <div className="w-px h-6 bg-slate-200 mx-1"></div>
              <Button onClick={() => setShowAddForm(true)} className="bg-emerald-600 text-white rounded-xl h-10 px-4 font-semibold"><Plus size={18} className="mr-1" /> New</Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && applications.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100"></div>)
        ) : applications.length > 0 ? (
          applications.map((app) => (
            <div key={app.id} onClick={() => setSelectedApp(app)} className="group bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:shadow-xl transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><FileText size={20} /></div>
                <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", app.status === "pending" ? "bg-amber-100 text-amber-700" : app.status === "processed" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>{app.status}</span>
              </div>
              <p className="font-bold text-slate-800 truncate uppercase tracking-tight">{app.applicantName}</p>
              <p className="text-[10px] text-blue-600 font-mono mt-1 font-bold">IMEI: {app.imei1}</p>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                 <span>{app.ps || "Sindh Police"}</span>
                 <ChevronRight size={14} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <FileText className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <p className="text-slate-500 font-medium font-black uppercase tracking-widest text-xs">No applications found.</p>
          </div>
        )}
      </div>

      {selectedApp && (
        <Dialog open={true} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-[2rem] p-0 border-0 shadow-2xl overflow-x-hidden !top-[50%] !translate-y-[-50%] flex flex-col">
            <button 
                onClick={() => setSelectedApp(null)}
                className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
                <X size={20} />
            </button>

            <div className="bg-[#0a2c4e] p-8 md:p-10 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><FileText size={200} /></div>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20", selectedApp.status === "pending" ? "bg-amber-500" : selectedApp.status === "processed" ? "bg-blue-500" : "bg-emerald-500")}>
                            {selectedApp.status}
                        </span>
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Case ID: {selectedApp.id}</span>
                    </div>
                    <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-1">
                        {selectedApp.applicantName}
                    </DialogTitle>
                    <p className="text-blue-200 text-sm font-medium italic">Application submitted on {formatAppDate(selectedApp.createdAt)}</p>
                </DialogHeader>
            </div>

            <div className="p-8 md:p-10 space-y-10 bg-white flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                  <div className="col-span-full mb-2"><h4 className="text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"><User size={14}/> Applicant & Jurisdiction</h4></div>
                  <DetailRow label="Applicant Name" value={selectedApp.applicantName} icon={User} />
                  <DetailRow label="Mobile Number" value={selectedApp.applicantMobile} />
                  <DetailRow label="CNIC Number" value={selectedApp.cnic} />
                  <DetailRow label="City" value={selectedApp.city} icon={MapPin} />
                  <DetailRow label="District" value={selectedApp.district} />
                                    <DetailRow label="Police Station" value={selectedApp.ps} />
                                    
                                    <div className="col-span-full mt-6 mb-2 border-t border-slate-50 pt-6"><h4 className="text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"><Smartphone size={14}/> Device & Incident Details</h4></div>
                                    <DetailRow label="Mobile Model" value={selectedApp.mobileModel} icon={Smartphone} />    
                                    <DetailRow label="IMEI 1" value={selectedApp.imei1} />
                                    <DetailRow label="IMEI 2" value={selectedApp.imei2} />
                                    <DetailRow label="Crime Category" value={selectedApp.crimeHead} />
                                    <DetailRow label="Offence Date" value={formatAppDate(selectedApp.offenceDate)} />
                                    <DetailRow label="Offence Time" value={selectedApp.offenceTime} />
                                    <DetailRow label="Offence Address" value={selectedApp.offenceAddress} icon={MapPin} />                    <DetailRow label="Last Num Used" value={selectedApp.lastNumUsed} />
                  <DetailRow label="Other Lost Property" value={selectedApp.otherLostProperty} />
                  
                  <div className="col-span-full mt-6 mb-4 border-t border-slate-50 pt-6"><h4 className="text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle2 size={14}/> Attachments & Evidence</h4></div>
                  <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedApp.pictureUrl && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Smartphone size={18}/></div>
                                  <div><p className="text-[10px] font-black uppercase text-slate-400">Box Picture</p><p className="text-xs font-bold text-slate-700">Image Attached</p></div>
                              </div>
                              <Button variant="outline" size="sm" className="rounded-lg h-8 text-[10px] font-black uppercase" onClick={() => window.open(selectedApp.pictureUrl, "_blank")}>View</Button>
                          </div>
                      )}
                      {selectedApp.attachmentUrl && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><FileText size={18}/></div>
                                  <div><p className="text-[10px] font-black uppercase text-slate-400">Attested Form</p><p className="text-xs font-bold text-slate-700">Document Attached</p></div>
                              </div>
                              <Button variant="outline" size="sm" className="rounded-lg h-8 text-[10px] font-black uppercase" onClick={() => window.open(selectedApp.attachmentUrl, "_blank")}>View</Button>
                          </div>
                      )}
                  </div>

                  <div className="col-span-full mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Incident Description</p>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed italic">"{selectedApp.note || "No description provided."}"</p>
                  </div>
              </div>

              {(selectedApp.status === "complete" || selectedApp.comments) && (
                <section className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ShieldCheck size={20} className="text-emerald-600" /> Case Resolution Summary
                        </h3>
                        {selectedApp.completedBy && (
                            <div className="text-right">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Resolved By</p>
                                <p className="text-xs font-bold text-slate-700">{selectedApp.completedBy.name} ({selectedApp.completedBy.buckle})</p>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Investigation & Process Details</p>
                            <div className="bg-white p-5 rounded-2xl border border-emerald-100/50 shadow-sm text-sm text-slate-700 font-medium leading-relaxed line-clamp-none whitespace-pre-wrap">
                                {selectedApp.processDetails || "Standard procedure followed."}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Officer's Closing Remarks</p>
                            <div className="bg-white p-5 rounded-2xl border border-emerald-100/50 shadow-sm text-sm font-bold text-slate-800 italic">
                                "{selectedApp.comments || "Case closed successfully."}"
                            </div>
                        </div>
                    </div>
                </section>
              )}

              {currentUser?.role === "officer" && selectedApp.status !== "complete" && (
                <div className="p-8 bg-[#0a2c4e]/5 rounded-[1.5rem] border border-[#0a2c4e]/10 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Activity size={24}/></div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Official Action</p>
                            <p className="text-sm font-bold text-slate-700">Update status to proceed</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        {selectedApp.status === "pending" && <Button onClick={() => handleUpdateStatus(selectedApp, "processed")} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg px-8 h-12 font-bold uppercase text-[11px] tracking-widest">Mark as Processed</Button>}
                        {selectedApp.status === "processed" && <Button onClick={() => setShowCompleteDialog(true)} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg px-8 h-12 font-bold uppercase text-[11px] tracking-widest">Mark as Solved</Button>}
                    </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-emerald-600 p-8 text-center text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ClipboardList size={100} /></div>
                <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4"><ClipboardList size={32} /></div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Complete Investigation</DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs">Document the final outcome and recovery process.</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Process Details (Public Info)</Label>
                    <Textarea value={completionData.processDetails} onChange={(e) => setCompletionData({...completionData, processDetails: e.target.value})} placeholder="Describe investigation..." className="rounded-2xl border-slate-200 min-h-[120px]" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Officer's Closing Note</Label>
                    <Input value={completionData.finalNote} onChange={(e) => setCompletionData({...completionData, finalNote: e.target.value})} placeholder="Remarks..." className="rounded-xl border-slate-200 h-12 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="ghost" onClick={() => setShowCompleteDialog(false)} className="rounded-xl h-12 font-bold text-slate-500">Cancel</Button>
                    <Button onClick={() => handleUpdateStatus(selectedApp, "complete", completionData.finalNote, completionData.processDetails)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-emerald-600/20">Submit & Close</Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-0 shadow-2xl relative !top-[50%] !translate-y-[-50%] flex flex-col">
            <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><X size={20} /></button>
            <div className="sticky top-0 bg-[#0a2c4e] p-6 z-10 text-white shadow-xl shrink-0">
              <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-3"><Plus /> New Application</DialogTitle>
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
