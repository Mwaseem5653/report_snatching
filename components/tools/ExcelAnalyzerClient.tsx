"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, Loader2, Download, AlertTriangle, Settings2, Terminal, Cpu, Clock, Layers, CheckCircle2, Zap, Trash2, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/uploadHelper";
import AlertModal from "@/components/ui/alert-modal";
import TokenExpiredModal from "@/components/ui/token-expired-modal";
import { cn, getApiUrl } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import JSZip from "jszip";

export default function ExcelAnalyzerClient() {
  const [files, setFiles] = useState<File[]>([]); 
  const uploadedPublicIds = useRef<string[]>([]); 
  const [loading, setLoading] = useState(false);

  const [liveLog, setLiveLog] = useState<string>("SYSTEM INITIALIZED...\nREADY FOR INPUT.");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const addLog = (msg: string) => {
    setLiveLog(prev => `${prev}\n[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveLog]);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [topN, setTopN] = useState(15);
  const [eyeconTopN, setEyeconTopN] = useState(5);
  const [enableLookup, setEnableLookup] = useState(false);
  const [enableEyecon, setEnableEyecon] = useState(false);
  const [enableIntel, setEnableIntel] = useState(true);
  const [includeImages, setIncludeImages] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(getApiUrl("/api/auth/create-session"));
        const data = await res.json();
        if (data.authenticated) {
          setSession(data);
          if (data.role !== "admin" && data.role !== "super_admin") {
              setEyeconTopN(5);
              if (data.role === "officer") setTopN(8);
          }
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    };
    fetchSession();
  }, []);

  const [alert, setAlert] = useState({
    isOpen: false,
    title: "",
    description: "",
    type: "info" as any
  });
  const [tokenModal, setTokenModal] = useState({ isOpen: false, currentBalance: 0, requiredTokens: 0, toolName: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (selected.length > 10) {
          toast.error("Maximum 10 files allowed.");
          return;
      }
      setFiles(selected);
      setResultUrl(null);
      setCurrentStep(0);
      setTotalSteps(0);
      uploadedPublicIds.current.forEach(publicId => deleteFileFromStorage(publicId)); 
      uploadedPublicIds.current = [];
      addLog(`SELECTED ${selected.length} FILES. READY TO ANALYZE.`);
    }
  };

  const handleClearAll = async () => {
    addLog("CLEARING ALL. DELETING TEMPORARY SUPABASE FILES...");
    try {
        await Promise.all(uploadedPublicIds.current.map(pid => deleteFileFromStorage(pid)));
        uploadedPublicIds.current = [];
    } catch (e) {
        console.error("Cleanup error:", e);
    }
    setFiles([]);
    setResultUrl(null);
    setCurrentStep(0);
    setTotalSteps(0);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one Excel file.");
      return;
    }

    const totalGeneralRequired = files.length * 30;
    const totalEyeconRequired = enableEyecon ? (eyeconTopN * files.length) : 0;

    try {
        const sRes = await fetch(getApiUrl("/api/auth/create-session"));
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < totalGeneralRequired) {
                setTokenModal({ isOpen: true, currentBalance: sData.tokens || 0, requiredTokens: totalGeneralRequired, toolName: "Excel Analyzer" });
                return;
            }
            if (enableEyecon && (sData.eyeconTokens || 0) < totalEyeconRequired) {
                setAlert({ isOpen: true, title: "Insufficient Eyecon Credits", description: `You need ${totalEyeconRequired} eyecon credits (${eyeconTopN} per file). Current balance: ${sData.eyeconTokens || 0}`, type: "warning" });
                return;
            }
        }
    } catch (e) {}

    setLoading(true);
    setResultUrl(null);
    setCurrentStep(0);
    setTotalSteps(files.length); 
    
    addLog("INITIALIZING EXCEL ENGINE...");
    const zip = new JSZip();
    let processedCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            addLog(`UPLOADING: ${file.name} [${i + 1}/${files.length}]`);
            const supabaseResponse = await uploadFileToStorage(file, "excel-analyzer");
            const cloudinaryUrl = supabaseResponse.secure_url;
            const cloudinaryPublicId = supabaseResponse.public_id;
            uploadedPublicIds.current.push(cloudinaryPublicId);

            addLog(`ANALYZING: ${file.name}...`);
            const formData = new FormData();
            formData.append(`cloudinaryUrls[0]`, cloudinaryUrl);
            formData.append(`cloudinaryPublicIds[0]`, cloudinaryPublicId);
            formData.append(`fileNames[0]`, file.name);
            formData.append("top_n", topN.toString());
            formData.append("eyecon_top_n", eyeconTopN.toString());
            formData.append("enable_lookup", enableLookup.toString());
            formData.append("enable_eyecon", enableEyecon.toString());
            formData.append("enable_intel", enableIntel.toString());
            formData.append("include_images", includeImages.toString());

            const res = await fetch(getApiUrl("/api/tools/analyze-excel"), {
                method: "POST",
                body: formData,
            });

            await deleteFileFromStorage(cloudinaryPublicId);
            uploadedPublicIds.current = uploadedPublicIds.current.filter(id => id !== cloudinaryPublicId);

            if (!res.ok) {
                const errData = await res.json();
                addLog(`ERROR ANALYZING ${file.name}: ${errData.error || "Unknown error"}`);
                continue;
            }

            const blob = await res.blob();
            const outFileName = file.name.split('.').slice(0, -1).join('.') + "_Analyzed.xlsx";
            
            let addedToZip = false;
            if (blob.type === "application/zip") {
                const incomingZip = await JSZip.loadAsync(blob);
                const firstFile = Object.values(incomingZip.files)[0];
                if (firstFile) {
                    const fileData = await firstFile.async("blob");
                    zip.file(outFileName, fileData);
                    addedToZip = true;
                } else {
                    addLog(`ERROR: API returned an empty result for ${file.name}`);
                }
            } else {
                zip.file(outFileName, blob);
                addedToZip = true;
            }
            
            if (addedToZip) {
                processedCount++;
                setCurrentStep(processedCount); 
                addLog(`SUCCESS: ${file.name} ANALYZED AND BUNDLED.`);
                window.dispatchEvent(new Event("refresh-session"));
            }
        } catch (error: any) {
            addLog(`FATAL ERROR ON ${file.name}: ${error.message}`);
        }
    }

    if (processedCount > 0) {
        addLog(`FINALIZING ZIP PACKAGE...`);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(zipBlob);
        setResultUrl(url);
        setCurrentStep(files.length);
        addLog("ALL TASKS COMPLETED. DOWNLOAD READY.");
        toast.success(`Analysis Complete! Processed ${processedCount} files.`);
    } else {
        addLog("ERROR: NO FILES WERE SUCCESSFULLY PROCESSED.");
        toast.error("Analysis Failed.");
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    const fileName = `Analysis_Package_${Date.now()}.zip`;

    if (Capacitor.isNativePlatform()) {
        try {
            toast.loading("Preparing for mobile download...");
            const response = await fetch(resultUrl);
            const blob = await response.blob();
            
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache
                });
                await Share.share({
                    title: 'Download Excel Results',
                    url: savedFile.uri,
                    dialogTitle: 'Save Analysis Package'
                });
                toast.dismiss();
            };
        } catch (err) {
            toast.error("Mobile download failed");
        }
    } else {
        const a = document.createElement("a");
        a.href = resultUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-100px)] flex flex-col space-y-4 overflow-y-auto lg:overflow-hidden pb-10 lg:pb-0 custom-scrollbar">
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />
      <TokenExpiredModal
        isOpen={tokenModal.isOpen}
        onClose={() => setTokenModal({ ...tokenModal, isOpen: false })}
        currentBalance={tokenModal.currentBalance}
        requiredTokens={tokenModal.requiredTokens}
        toolName={tokenModal.toolName}
      />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
                <FileSpreadsheet size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Excel Analyzer <span className="text-emerald-600 text-sm">PRO</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bulk Pattern Analysis</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {files.length > 0 && !loading && (
                <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-slate-400 hover:text-red-500 p-2">
                    <Trash2 size={18} />
                </Button>
            )}
            {!loading ? (
                <Button onClick={handleAnalyze} disabled={files.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-6 font-black shadow-lg shadow-emerald-600/20 uppercase tracking-tight">
                    {resultUrl ? "Restart Analysis" : "Start Analysis"}
                </Button>
            ) : (
                <div className="flex items-center gap-2 px-4 h-10 bg-slate-100 rounded-xl">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Processing...</span>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:overflow-hidden">
          
          {/* LEFT: STATUS & LOGS */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-[250px] lg:h-full lg:overflow-hidden">
              <Card className={cn("border-0 text-white overflow-hidden rounded-3xl shrink-0 transition-all duration-500", loading ? "bg-emerald-600 shadow-lg" : "bg-slate-900")}>
                  <CardContent className="p-5">
                      <div className="flex justify-between items-center mb-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Batch Progress</p>
                          <h2 className="text-3xl font-black tracking-tighter">{totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0}%</h2>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-white h-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-white/60 mt-2">
                          <span>{currentStep} of {totalSteps} Steps</span>
                          {loading && <Loader2 size={12} className="animate-spin" />}
                      </div>
                  </CardContent>
              </Card>

              <Card className="flex-1 bg-slate-950 border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[150px] lg:min-h-0">
                  <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 shrink-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Terminal size={12} /> Console</p>
                  </div>
                  <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1 custom-scrollbar">
                      {liveLog.split('\n').map((line, i) => (
                          <div key={i} className={cn("flex gap-2", line.includes("ERROR") ? "text-red-400" : line.includes("SUCCESS") ? "text-emerald-400" : line.includes("PROCESSING") ? "text-blue-400" : "text-slate-500")}>
                              <span className="opacity-20 shrink-0">{String(i + 1).padStart(3, '0')}</span>
                              <span className="break-all">{line}</span>
                          </div>
                      ))}
                  </div>
              </Card>
          </div>

          {/* RIGHT: MAIN UPLOAD & SETTINGS */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 lg:overflow-hidden">
              {/* Settings Column */}
              <div className="md:col-span-1 flex flex-col min-h-fit">
                <Card className="flex-1 shadow-sm border-slate-200 rounded-3xl overflow-hidden flex flex-col">
                    <CardHeader className="pb-3 shrink-0 border-b border-slate-50">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><Settings2 size={14} /> Analysis Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-y-visible p-3 md:p-6 space-y-4">
                        <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-4">
                            {/* SIM Lookup */}
                            <div className={cn("flex flex-col space-y-2 border p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 border-slate-100 transition-all", enableLookup ? "ring-2 ring-emerald-500/20 shadow-sm" : "")}>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="lookup" checked={enableLookup} onCheckedChange={(c) => setEnableLookup(!!c)} />
                                    <div className="grid gap-0.5 leading-none">
                                        <label htmlFor="lookup" className="text-[9px] md:text-[11px] font-black uppercase cursor-pointer text-slate-700">SIM Info</label>
                                        <p className="hidden md:block text-[9px] text-slate-400 font-bold uppercase">Owner Details</p>
                                    </div>
                                </div>
                                {enableLookup && (
                                    <div className="md:pl-6 space-y-1 animate-in slide-in-from-top-1 col-span-1 md:col-auto">
                                        <Label className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase">Limit</Label>
                                        <Input type="number" value={topN} onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            if (session?.role === "super_admin") setTopN(val);
                                            else setTopN(val > 50 ? 50 : val);
                                        }} className="h-6 md:h-8 text-[9px] md:text-[11px] font-black rounded-lg border-slate-200 bg-white" />
                                    </div>
                                )}
                            </div>

                            {/* Intel Report */}
                            <div className={cn("flex flex-col space-y-2 border p-2 md:p-3 rounded-xl md:rounded-2xl bg-indigo-50/30 border-indigo-100 transition-all", enableIntel ? "ring-2 ring-indigo-500/20 shadow-sm" : "")}>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="intel" checked={enableIntel} onCheckedChange={(c) => setEnableIntel(!!c)} />
                                    <div className="grid gap-0.5 leading-none">
                                        <label htmlFor="intel" className="text-[9px] md:text-[11px] font-black uppercase cursor-pointer text-indigo-700">Intel</label>
                                        <p className="hidden md:block text-[9px] text-indigo-400 font-bold uppercase">Summary</p>
                                    </div>
                                </div>
                            </div>

                            {/* Eyecon Lookup */}
                            {(session?.role === "super_admin" || session?.permissions?.eyecon_access) && (
                                <div className={cn("flex flex-col space-y-2 border p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 border-slate-100 transition-all", enableEyecon ? "ring-2 ring-indigo-500/20 shadow-sm" : "")}>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="eyecon" checked={enableEyecon} onCheckedChange={(c) => setEnableEyecon(!!c)} />
                                        <div className="grid gap-0.5 leading-none">
                                            <label htmlFor="eyecon" className="text-[9px] md:text-[11px] font-black uppercase cursor-pointer text-slate-700">Eyecon</label>
                                            <p className="hidden md:block text-[9px] text-slate-400 font-bold uppercase">Caller ID</p>
                                        </div>
                                    </div>
                                    {enableEyecon && (
                                        <div className="md:pl-6 space-y-2 animate-in slide-in-from-top-1 col-span-1 md:col-auto">
                                            <div className="space-y-1">
                                                <Label className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase">Limit</Label>
                                                <Input type="number" value={eyeconTopN} onChange={(e) => setEyeconTopN(parseInt(e.target.value) || 5)} className="h-6 md:h-8 text-[9px] md:text-[11px] font-black rounded-lg border-slate-200 bg-white" disabled={session?.role === "officer" || session?.role === "advanced_tool"} />
                                            </div>
                                            <div className="flex items-center space-x-1 md:space-x-2">
                                                <Checkbox id="includeImages" checked={includeImages} onCheckedChange={(c) => setIncludeImages(!!c)} />
                                                <Label htmlFor="includeImages" className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase cursor-pointer">Photo</Label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
              </div>

              {/* Upload Column */}
              <div className="md:col-span-2 flex flex-col min-h-[300px]">
                <Card className="flex-1 shadow-md border-emerald-100 bg-emerald-50/10 rounded-3xl overflow-hidden flex flex-col relative">
                    <CardContent className="flex-1 flex flex-col h-full p-6 overflow-hidden">
                        {files.length === 0 ? (
                            <div className="relative flex-1 flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-3xl hover:bg-emerald-50/50 transition-colors group">
                                <input type="file" accept=".xlsx, .csv" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <div className="p-5 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform text-emerald-500"><FileSpreadsheet size={48} /></div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Drop Excel Files</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Maximum 20 CDRs / Reports</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar content-start">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-emerald-200 transition-colors shrink-0 min-h-[45px]">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={14} /></div>
                                                <div className="text-left overflow-hidden">
                                                    <p className="font-black text-slate-700 text-[10px] uppercase truncate max-w-[180px]">{file.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            {!loading && <Button variant="ghost" size="sm" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-8 w-8 p-0">✕</Button>}
                                        </div>
                                    ))}
                                </div>
                                
                                {resultUrl && (
                                    <div className="shrink-0 pt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-4 bg-emerald-600 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-600/20">
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <CheckCircle2 size={32} className="shrink-0 text-emerald-200" />
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tight leading-none">Process Complete</p>
                                                    <p className="text-[10px] opacity-80 font-bold uppercase mt-1">Reports Analyzed & Combined</p>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={handleDownload}
                                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-emerald-700 px-6 h-12 rounded-xl font-black uppercase text-xs shadow-md hover:bg-slate-50 transition-colors"
                                            >
                                                <Download size={18} /> Download Results (ZIP)
                                            </Button>
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
    </div>
  );
}
