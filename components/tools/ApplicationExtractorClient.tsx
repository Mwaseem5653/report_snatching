"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ScanText, Loader2, Download, Trash2, 
  StopCircle, Plus, Terminal, Cpu, Clock, 
  Layers, CheckCircle2, Zap
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import AlertModal from "@/components/ui/alert-modal";
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/uploadHelper";
import { cn } from "@/lib/utils";

type ExtendedFile = File & {
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  pageCount?: number; // Store page count once fetched
};

export default function ApplicationExtractorClient() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const uploadedPublicIds = useRef<string[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [liveLog, setLiveLog] = useState<string>("SYSTEM INITIALIZED...\nREADY FOR INPUT.");
  const [currentRawFeed, setCurrentRawFeed] = useState<string>("");
  const [filesPerMinute, setFilesPerMinute] = useState(20);
  const [cooldown, setCooldown] = useState(0);
  const [alert, setAlert] = useState({ isOpen: false, title: "", description: "", type: "info" as any });
  const stopRequested = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveLog]);

  // Cooldown timer
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const addLog = (msg: string) => {
    setLiveLog(prev => `${prev}\n[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      setAllResults([]);
      setCurrentStep(0);
      setTotalSteps(0);
      setCooldown(0);
      uploadedPublicIds.current = []; // Clear public IDs when new files are selected
      addLog(`SELECTED ${selected.length} FILES. READY TO ANALYZE.`);
    }
  };

  const getPageCount = async (cloudinaryRef: { url: string, publicId: string }) => {
    const formData = new FormData();
    formData.append("cloudinaryUrl", cloudinaryRef.url);
    formData.append("action", "count");
    // Also send publicId for potential deletion on the server-side if counting fails
    formData.append("cloudinaryPublicId", cloudinaryRef.publicId);

    const res = await fetch("/api/tools/extract-application", { method: "POST", body: formData });
    if (!res.ok) {
        let errorBody;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            errorBody = await res.json();
        } else {
            errorBody = await res.text();
        }
        // Client-side toast for user feedback
        toast.error(`Error ${res.status}: ${typeof errorBody === 'object' ? (errorBody.error || errorBody.message || "An unknown error occurred.") : errorBody}`);
        // Consider server-side deletion of the temporary Cloudinary file here if count fails
        // For now, rely on `clearAll` or `handleStop` to delete client-side managed publicIds
        throw new Error("Failed to get page count.");
    }
    const data = await res.json();
    return data.pageCount || 1;
  };

  const processPage = async (cloudinaryRef: { url: string, publicId: string }, page: number): Promise<any> => {
    const formData = new FormData();
    formData.append("cloudinaryUrl", cloudinaryRef.url);
    formData.append("cloudinaryPublicId", cloudinaryRef.publicId); // Send publicId for backend deletion
    formData.append("action", "process");
    formData.append("page", page.toString());

    const res = await fetch("/api/tools/extract-application", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errorBody;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
          errorBody = await res.json(); // Try to parse as JSON if content-type says so
      } else {
          errorBody = await res.text(); // Otherwise, read as plain text
      }

      if (res.status === 429) return { status: 429 }; // This needs to be handled before throwing
      if (res.status === 403) {
          setAlert({
              isOpen: true,
              title: "Insufficient Credits",
              description: typeof errorBody === 'object' ? (errorBody.error || "You do not have enough credits to perform this action.") : errorBody,
              type: "warning"
          });
          throw new Error("INSUFFICIENT_CREDITS");
      }
      // General error for anything not 2xx, 429, or 403
      throw new Error(typeof errorBody === 'object' ? (errorBody.error || "AI EXTRACTION FAILED") : errorBody);
    }
    return await res.json();
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleStartExtraction = async () => {
    if (files.length === 0) {
      toast.error("Please select files first.");
      return;
    }

    // 🚀 PROACTIVE CHECK
    try {
        const sRes = await fetch("/api/auth/create-session");
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < 5) {
                setAlert({
                    isOpen: true,
                    title: "Insufficient Credits",
                    description: `You need at least 5 credits to start AI extraction. Current balance: ${sData.tokens || 0}`,
                    type: "warning"
                });
                return;
            }
        }
    } catch (e) {}

    setLoading(true);
    stopRequested.current = false;
    setAllResults([]);
    setCurrentRawFeed("");
    
    addLog("INITIALIZING PDF & IMAGE ENGINE...");
    
    addLog("ENGINE READY. UPLOADING FILES TO SUPABASE...");
    let total = 0;
    const uploadedFiles: ExtendedFile[] = [];

    for (const file of files) {
        if (stopRequested.current) break; // Allow stopping during initial upload
        addLog(`UPLOADING: ${file.name}`);
        try {
            const supabaseResponse = await uploadFileToStorage(file, "application-extractor");
            const extendedFile: ExtendedFile = {
                ...file,
                cloudinaryUrl: supabaseResponse.secure_url,
                cloudinaryPublicId: supabaseResponse.public_id,
            };
            uploadedFiles.push(extendedFile);
            uploadedPublicIds.current.push(supabaseResponse.public_id); // Track for deletion
            
            const count = await getPageCount({ url: extendedFile.cloudinaryUrl!, publicId: extendedFile.cloudinaryPublicId! });
            extendedFile.pageCount = count; // Store page count with the file
            total += count;
            addLog(`UPLOADED & COUNTED: ${file.name} (${count} pages)`);
        } catch (error: any) {
            addLog(`ERROR UPLOADING ${file.name}: ${error.message}`);
            toast.error(`Failed to upload ${file.name}: ${error.message}`);
            stopRequested.current = true; // Stop processing further files on upload error
            break;
        }
    }

    setFiles(uploadedFiles); // Update state with Supabase info
    if (stopRequested.current) {
        setLoading(false);
        addLog("INITIAL UPLOAD HALTED DUE TO ERROR.");
        return;
    }

    setTotalSteps(total);
    addLog(`ALL FILES UPLOADED. TOTAL PAYLOAD: ${total} PAGES/IMAGES.`);

    const delay = Math.floor(60000 / filesPerMinute);
    let stepCount = 0;

    // --- Main Processing Loop ---
    for (let fIdx = 0; fIdx < uploadedFiles.length; fIdx++) {
      if (stopRequested.current) break;
      
      const file = uploadedFiles[fIdx]; // Use the uploadedFiles with cloudinary info
      const pages = file.pageCount || 1; // Use stored page count
      
      for (let p = 1; p <= pages; p++) {
          if (stopRequested.current) break;
          
          stepCount++;
          setCurrentStep(stepCount);
          addLog(`PROCESSING: ${file.name} (PAGE ${p}/${pages})`);

          let success = false;
          let attempts = 0;

          while (!success && !stopRequested.current && attempts < 2) {
              try {
                const data = await processPage({ url: file.cloudinaryUrl!, publicId: file.cloudinaryPublicId! }, p);
                
                if (data.status === 429) {
                    addLog("!! RATE LIMIT HIT !! COOLING DOWN...");
                    setCooldown(45);
                    await sleep(45000);
                    setCooldown(0);
                    attempts++;
                    continue;
                }

                if (data.results) {
                  setAllResults((prev) => [...prev, ...data.results]);
                  addLog(`SUCCESS: EXTRACTED ${data.results.length} APPLICATIONS.`);
                  if (data.raw) {
                      setCurrentRawFeed(data.raw);
                  }
                  window.dispatchEvent(new Event("refresh-session"));
                  success = true;
                }
              } catch (error: any) {
                if (error.message === "INSUFFICIENT_CREDITS") {
                    stopRequested.current = true;
                    break;
                }
                addLog(`ERROR ON ${file.name}: ${error.message}`);
                break;
              }
          }

          if (!stopRequested.current && stepCount < total) {
              await sleep(delay);
          }
      }
      // Delete from Supabase after ALL pages of THIS file are processed
      if (file.cloudinaryPublicId) {
          deleteFileFromStorage(file.cloudinaryPublicId);
          uploadedPublicIds.current = uploadedPublicIds.current.filter(id => id !== file.cloudinaryPublicId);
      }
    }

    setLoading(false);
    addLog(stopRequested.current ? "PROCESSING HALTED BY USER." : "ALL TASKS COMPLETED SUCCESSFULLY.");
    toast.success(stopRequested.current ? "Stopped. Partial data saved." : "All applications processed!");
  };

  const handleStop = async () => { // Make async to await deletion
    stopRequested.current = true;
    addLog("STOP SIGNAL RECEIVED. DELETING TEMPORARY SUPABASE FILES...");
    // Delete all currently tracked uploaded files
    await Promise.all(uploadedPublicIds.current.map(publicId => deleteFileFromStorage(publicId)));
    uploadedPublicIds.current = []; // Clear the tracking array
    addLog("TEMPORARY SUPABASE FILES DELETED.");
  };

  const downloadExcel = async () => {
    if (allResults.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Extracted Data");

    // Define columns (Excluding Time Of Offence)
    const columns = [
        { header: "Victim Name", key: "Name", width: 25 },
        { header: "Phone Number", key: "Phone Number", width: 20 },
        { header: "IMEI Numbers", key: "IMEI Number", width: 35 },
        { header: "Last Num Used", key: "last Num Used", width: 20 },
        { header: "Mobile Model", key: "Mobile Model", width: 25 },
        { header: "Other Property", key: "Other Property", width: 30 },
        { header: "Date Of Offence", key: "Date Of Offence", width: 20 },
        { header: "Incident Type", key: "Type", width: 15 },
        { header: "Police Station", key: "Police Station", width: 25 }
    ];

    worksheet.columns = columns;

    // Add rows
    allResults.forEach(result => {
        worksheet.addRow({
            "Name": result.Name ? " " + result.Name : " None",
            "Phone Number": result["Phone Number"] ? " " + result["Phone Number"] : " None",
            "IMEI Number": result["IMEI Number"] ? " " + result["IMEI Number"] : " None",
            "last Num Used": result["last Num Used"] ? " " + result["last Num Used"] : " None",
            "Mobile Model": result["Mobile Model"] ? " " + result["Mobile Model"] : " None",
            "Other Property": result["Other Property"] ? " " + result["Other Property"] : " None",
            "Date Of Offence": result["Date Of Offence"] ? " " + result["Date Of Offence"] : " None",
            "Type": result.Type ? " " + result.Type : " None",
            "Police Station": result["Police Station"] ? " " + result["Police Station"] : " None"
        });
    });

    // Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F81BD' } // Blue
        };
        cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' } // White
        };
        cell.alignment = { horizontal: 'center' };
    });

    // Global Alignment
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
    });

    // Generate and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AI_Extracted_Report_${Date.now()}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const clearAll = async () => { // Make async to await deletion
    addLog("CLEARING ALL. DELETING TEMPORARY SUPABASE FILES...");
    await Promise.all(uploadedPublicIds.current.map(publicId => deleteFileFromStorage(publicId)));
    uploadedPublicIds.current = []; // Clear the tracking array
    addLog("TEMPORARY SUPABASE FILES DELETED.");

    setFiles([]);
    setAllResults([]);
    setCurrentStep(0);
    setTotalSteps(0);
    setCooldown(0);
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col space-y-4 overflow-hidden">
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />
      
      {/* HEADER SECTION (Compact) */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                <ScanText size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">AI Extractor <span className="text-indigo-600 text-sm">PRO</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Serial Processing</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                <span className="text-[8px] font-black text-slate-400 uppercase">Speed</span>
                <input 
                    type="number" 
                    value={filesPerMinute}
                    onChange={(e) => setFilesPerMinute(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-8 bg-transparent border-0 focus:ring-0 text-sm font-black text-slate-800 p-0"
                    disabled={loading}
                />
            </div>

            <div className="relative">
                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={loading} />
                <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 border-slate-200 hover:bg-slate-50 font-bold shadow-sm">
                    <Plus size={16} className="mr-2" /> Load
                </Button>
            </div>

            {!loading ? (
                <Button size="sm" onClick={handleStartExtraction} disabled={files.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-black shadow-lg shadow-indigo-600/20 uppercase tracking-tight">
                    Start AI
                </Button>
            ) : (
                <Button size="sm" onClick={handleStop} variant="destructive" className="rounded-xl h-10 px-6 font-black shadow-lg shadow-red-600/20 uppercase tracking-tight">
                    Terminate
                </Button>
            )}

            {allResults.length > 0 && (
                <Button size="sm" onClick={downloadExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-6 font-black shadow-lg shadow-emerald-600/20 uppercase tracking-tight">
                    Export ({allResults.length})
                </Button>
            )}

            <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-400 hover:text-red-500 p-2">
                <Trash2 size={18} />
            </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 overflow-hidden">
          
          {/* LEFT: STATUS & LOGS (Compact) */}
          <div className="xl:col-span-1 flex flex-col gap-4 overflow-hidden">
              
              {/* PROGRESS CARD (Compact) */}
              <Card className={cn(
                  "border-0 text-white overflow-hidden rounded-3xl shrink-0 transition-all duration-500",
                  loading ? "bg-indigo-600 shadow-lg" : "bg-slate-900"
              )}>
                  <CardContent className="p-5">
                      <div className="flex justify-between items-center mb-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Task Progress</p>
                          <h2 className="text-3xl font-black tracking-tighter">
                              {totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0}%
                          </h2>
                      </div>

                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-white h-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                            style={{ width: `${totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0}%` }}
                          />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-white/60 mt-2">
                          <span>{currentStep} of {totalSteps} Tasks</span>
                          {loading && <Loader2 size={12} className="animate-spin" />}
                      </div>
                  </CardContent>
              </Card>

              {/* COOLDOWN (Floating) */}
              {cooldown > 0 && (
                  <div className="bg-amber-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-pulse shrink-0 shadow-lg shadow-amber-200">
                      <Clock size={20} className="shrink-0" />
                      <p className="font-black uppercase text-[10px]">Retry in {cooldown}s</p>
                  </div>
              )}

              {/* TERMINAL LOGS (Flex-grow to fill) */}
              <Card className="flex-1 bg-slate-950 border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0">
                  <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 shrink-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Terminal size={12} /> System Console
                      </p>
                  </div>
                  <div 
                    ref={scrollRef}
                    className="flex-1 p-4 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1 custom-scrollbar"
                  >
                      {liveLog.split('\n').map((line, i) => (
                          <div key={i} className={cn(
                              "flex gap-2",
                              line.includes("ERROR") ? "text-red-400" : 
                              line.includes("SUCCESS") ? "text-emerald-400" : 
                              line.includes("PROCESSING") ? "text-blue-400" : "text-slate-500"
                          )}>
                              <span className="opacity-20 shrink-0">{String(i + 1).padStart(3, '0')}</span>
                              <span className="break-all">{line}</span>
                          </div>
                      ))}
                  </div>
              </Card>
          </div>

          {/* RIGHT: LIVE AI FEED (Full Width Expanded) */}
          <div className="xl:col-span-3 overflow-hidden">
              <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col bg-white">
                  <div className="bg-white border-b border-slate-100 p-4 shrink-0 flex justify-between items-center">
                      <div>
                          <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Live AI Extraction Feed</CardTitle>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 italic">Direct transcription from document analysis</p>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-indigo-50 rounded-lg flex items-center gap-2 border border-indigo-100">
                              <Zap size={12} className="text-indigo-600 fill-indigo-600" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase">Records: {allResults.length}</span>
                          </div>
                          {loading && (
                              <div className="flex items-center gap-2">
                                  <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                  </span>
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Analyzing...</span>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-serif text-sm leading-relaxed text-slate-700 bg-slate-50/30 whitespace-pre-wrap">
                      {currentRawFeed || (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                              <Layers size={64} className="text-slate-300" />
                              <div className="space-y-1">
                                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Awaiting AI Sequence</h3>
                                  <p className="text-[10px] font-bold">Start processing to see live document extraction</p>
                              </div>
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      </div>
    </div>
  );
}
