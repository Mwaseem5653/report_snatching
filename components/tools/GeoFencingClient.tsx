"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, Download, History, Clock, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AlertModal from "@/components/ui/alert-modal";

export default function GeoFencingClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [fromTime, setFromTime] = useState("12:00");
  const [fromPeriod, setFromPeriod] = useState("AM");
  const [toTime, setToTime] = useState("11:59");
  const [toPeriod, setToPeriod] = useState("PM");
  const [includeB, setIncludeB] = useState(true);

  const [alert, setAlert] = useState({ isOpen: false, title: "", description: "", type: "info" as any });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultUrl(null);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      toast.error("Please upload a CDR file first.");
      return;
    }

    setLoading(true);
    setResultUrl(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fromTime", fromTime);
    formData.append("fromPeriod", fromPeriod);
    formData.append("toTime", toTime);
    formData.append("toPeriod", toPeriod);
    formData.append("includeB", includeB.toString());

    try {
      const res = await fetch("/api/tools/geo-fencing", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        setAlert({
            isOpen: true,
            title: res.status === 403 ? "Insufficient Credits" : "Process Error",
            description: errData.error || "An unexpected error occurred.",
            type: "warning"
        });
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setResultUrl(url);
      window.dispatchEvent(new Event("refresh-session"));
      toast.success("Analysis Complete!");
    } catch (error: any) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />

      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
           <MapPin size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Geo Fencing Analyzer</h1>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">CDR Movement & Sequence Tracker</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Configuration */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2rem] border-slate-200 shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                        <Clock size={16} className="text-blue-600" /> Time Window
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">From Time</Label>
                            <div className="flex gap-2">
                                <Input type="text" value={fromTime} onChange={(e) => setFromTime(e.target.value)} placeholder="09:00" className="rounded-xl h-11" />
                                <Select value={fromPeriod} onValueChange={setFromPeriod}>
                                    <SelectTrigger className="w-24 rounded-xl h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">To Time</Label>
                            <div className="flex gap-2">
                                <Input type="text" value={toTime} onChange={(e) => setToTime(e.target.value)} placeholder="05:00" className="rounded-xl h-11" />
                                <Select value={toPeriod} onValueChange={setToPeriod}>
                                    <SelectTrigger className="w-24 rounded-xl h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <Checkbox id="incB" checked={includeB} onCheckedChange={(v) => setIncludeB(!!v)} />
                        <Label htmlFor="incB" className="text-xs font-bold text-blue-900 cursor-pointer">Analyze B-Number Movement</Label>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right: Upload & Action */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[2rem] border-slate-200 shadow-xl min-h-[400px] flex flex-col bg-white overflow-hidden">
                <CardContent className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
                    {!file ? (
                        <div className="relative group cursor-pointer w-full max-w-md">
                            <input type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 group-hover:border-blue-400 group-hover:bg-blue-50/50 transition-all duration-300">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-white transition-transform shadow-sm">
                                    <UploadCloud size={40} className="text-slate-300 group-hover:text-blue-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Upload CDR Document</h3>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">XLSX or CSV Format Only</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4 text-left">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 truncate">{file.name}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-red-500 hover:bg-red-50 rounded-full h-8 w-8 p-0">✕</Button>
                            </div>

                            {resultUrl ? (
                                <div className="space-y-3">
                                    <a href={resultUrl} download={`Geo_Fencing_Report_${Date.now()}.xlsx`} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-xl shadow-emerald-600/20 transition-all active:scale-95">
                                        <Download size={24} /> Download Report
                                    </a>
                                    <Button variant="outline" onClick={() => { setFile(null); setResultUrl(null); }} className="w-full h-12 rounded-2xl font-bold">New Analysis</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Button onClick={handleProcess} disabled={loading} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all">
                                        {loading ? <><Loader2 className="mr-2 animate-spin" /> Processing Data...</> : <><History className="mr-2" /> Start Analysis</>}
                                    </Button>
                                    <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left">
                                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-800 font-medium leading-relaxed">System will analyze movement patterns and sequences for all numbers active within the {fromTime} {fromPeriod} to {toTime} {toPeriod} window.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

function UploadCloud(props: any) {
    return (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M12 12v9" />
        <path d="m16 16-4-4-4 4" />
      </svg>
    )
}
