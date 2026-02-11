"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, Loader2, Download, AlertTriangle, Settings2 } from "lucide-react";
import { toast } from "sonner";
import AlertModal from "@/components/ui/alert-modal";

export default function ExcelAnalyzerClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [topN, setTopN] = useState(15);
  const [eyeconTopN, setEyeconTopN] = useState(5);
  const [enableLookup, setEnableLookup] = useState(false);
  const [enableEyecon, setEnableEyecon] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [session, setSession] = useState<any>(null);

  // 🚀 Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/create-session");
        const data = await res.json();
        if (data.authenticated) {
          setSession(data);
          // Set default limits for officers
          if (data.role === "officer") {
              setEyeconTopN(5);
              setTopN(8);
          }
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    };
    fetchSession();
  }, []);

  // 🚀 Custom Alert State
  const [alert, setAlert] = useState({
    isOpen: false,
    title: "",
    description: "",
    type: "info" as any
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (selected.length > 10) {
          toast.error("Maximum 10 files allowed.");
          return;
      }
      setFiles(selected);
      setResultUrl(null); 
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one Excel file.");
      return;
    }

    const totalGeneralRequired = files.length * 15;
    const totalEyeconRequired = enableEyecon ? (eyeconTopN * files.length) : 0;

    // 🚀 PROACTIVE CHECK: Fetch live session to check tokens before upload
    try {
        const sRes = await fetch("/api/auth/create-session");
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < totalGeneralRequired) {
                setAlert({
                    isOpen: true,
                    title: "Insufficient General Credits",
                    description: `You need ${totalGeneralRequired} general credits (15 per file). Current balance: ${sData.tokens || 0}`,
                    type: "warning"
                });
                return;
            }
            if (enableEyecon && (sData.eyeconTokens || 0) < totalEyeconRequired) {
                setAlert({
                    isOpen: true,
                    title: "Insufficient Eyecon Credits",
                    description: `You need ${totalEyeconRequired} eyecon credits (${eyeconTopN} per file). Current balance: ${sData.eyeconTokens || 0}`,
                    type: "warning"
                });
                return;
            }
        }
    } catch (e) {}

    setLoading(true);
    setResultUrl(null);
    const formData = new FormData();
    files.forEach(f => formData.append("file", f));
    formData.append("top_n", topN.toString());
    formData.append("eyecon_top_n", eyeconTopN.toString());
    formData.append("enable_lookup", enableLookup.toString());
    formData.append("enable_eyecon", enableEyecon.toString());
    formData.append("include_images", includeImages.toString());

    try {
      const res = await fetch("/api/tools/analyze-excel", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type");

      if (!res.ok || contentType?.includes("application/json")) {
        const errData = await res.json();
        setAlert({
            isOpen: true,
            title: res.status === 403 ? "Insufficient Credits" : "Process Error",
            description: errData.error || "An unexpected error occurred during analysis.",
            type: res.status === 403 ? "warning" : "error"
        });
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setResultUrl(url);
      
      // Refresh Header Credits
      window.dispatchEvent(new Event("refresh-session"));
      
      toast.success(`Analysis Complete! Deducted ${totalGeneralRequired} General ${enableEyecon ? `& ${totalEyeconRequired} Eyecon` : ""} tokens.`);
    } catch (error: any) {
      console.error(error);
      setAlert({
          isOpen: true,
          title: "Network Error",
          description: "Could not connect to the processing server.",
          type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ... previous JSX content ... */}
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
           <FileSpreadsheet size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Excel Data Analyzer</h1>
           <p className="text-slate-500">Upload CDRs or Excel sheets to analyze call patterns and fetch details.</p>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Card */}
        <Card className="md:col-span-1 shadow-sm">
           <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                 <Settings2 size={16} /> Configuration
              </CardTitle>
           </CardHeader>
           <CardContent className="space-y-5">
              
              <div className="flex flex-col space-y-3 border p-3 rounded-lg bg-slate-50">
                <div className="flex items-center space-x-2">
                    <Checkbox id="lookup" checked={enableLookup} onCheckedChange={(c) => setEnableLookup(!!c)} />
                    <div className="grid gap-1.5 leading-none">
                        <label htmlFor="lookup" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Check SIM Info
                        </label>
                        <p className="text-[10px] text-muted-foreground">Fetch Name/CNIC/Address</p>
                    </div>
                </div>
                {enableLookup && session?.role !== "officer" && (
                    <div className="pl-6 space-y-1 animate-in slide-in-from-top-1">
                        <Label className="text-[10px] text-slate-500 font-bold uppercase">Top Records Limit</Label>
                        <Input 
                        type="number" 
                        value={topN} 
                        onChange={(e) => setTopN(parseInt(e.target.value) || 15)}
                        min={1} 
                        max={100}
                        className="h-8 text-xs"
                        />
                    </div>
                )}
              </div>

              {(session?.role === "super_admin" || (session?.permissions?.eyecon_access && (session?.role === "admin" || session?.role === "officer"))) && (
                <div className="flex flex-col space-y-3 border p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="eyecon" checked={enableEyecon} onCheckedChange={(c) => setEnableEyecon(!!c)} />
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="eyecon" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Check Eyecon
                            </label>
                            <p className="text-[10px] text-muted-foreground">Fetch Caller ID Name</p>
                        </div>
                    </div>
                    {enableEyecon && (
                        <div className="pl-6 space-y-3 animate-in slide-in-from-top-1">
                            {session?.role !== "officer" && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-500 font-bold uppercase">Eyecon Limit</Label>
                                    <Input 
                                    type="number" 
                                    value={eyeconTopN} 
                                    onChange={(e) => setEyeconTopN(parseInt(e.target.value) || 5)}
                                    min={1} 
                                    max={50}
                                    className="h-8 text-xs"
                                    />
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <Checkbox id="includeImages" checked={includeImages} onCheckedChange={(c) => setIncludeImages(!!c)} />
                                <Label htmlFor="includeImages" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer">Include Photos/Links</Label>
                            </div>
                        </div>
                    )}
                </div>
              )}
           </CardContent>
        </Card>

        {/* Upload Area */}
        <Card className="md:col-span-2 shadow-md border-blue-100 bg-blue-50/30">
           <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 space-y-6 text-center">
              
              {files.length === 0 ? (
                  <div className="relative group cursor-pointer w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-2xl hover:bg-blue-50 transition-colors py-10">
                      <input 
                        type="file" 
                        accept=".xlsx, .csv" 
                        multiple
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                      <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                         <FileSpreadsheet size={40} className="text-blue-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-blue-900">Click to Upload Excel Files</h3>
                      <p className="text-sm text-blue-600/70">Select up to 10 files (.xlsx, .csv)</p>
                  </div>
              ) : (
                  <div className="w-full space-y-6">
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                        <FileSpreadsheet size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">{file.name}</p>
                                        <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} 
                                    className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                                >
                                    ✕
                                </Button>
                            </div>
                        ))}
                      </div>

                      {resultUrl ? (
                          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium">
                                  <div className="p-2 bg-emerald-500 text-white rounded-full">
                                      <Download size={16} />
                                  </div>
                                  Bulk Analysis Complete! Combined report is ready.
                              </div>
                              <a 
                                href={resultUrl} 
                                download={`Analysis_Package_${Date.now()}.zip`}
                                className="w-full h-14 flex items-center justify-center gap-2 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-xl transition-all"
                              >
                                <Download size={20} /> Download Analyzed ZIP
                              </a>
                              <Button variant="outline" onClick={() => { setFiles([]); setResultUrl(null); }} className="w-full h-11 rounded-xl">Analyze New Batch</Button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                            <Button 
                                onClick={handleAnalyze} 
                                disabled={loading}
                                className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl"
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing {files.length} Files...</>
                                ) : (
                                    <><Settings2 className="mr-2 h-5 w-5" /> Start Bulk Analysis</>
                                )}
                            </Button>
                            <Button variant="ghost" onClick={() => setFiles([])} className="text-slate-500">Clear All</Button>
                          </div>
                      )}
                  </div>
              )}

           </CardContent>
        </Card>
      </div>
    </div>
  );
}