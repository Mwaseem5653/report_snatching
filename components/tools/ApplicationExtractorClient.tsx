"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScanText, Loader2, UploadCloud, Download, Trash2, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import AlertModal from "@/components/ui/alert-modal";

export default function ApplicationExtractorClient() {
  const [loading, setLoading] = useState(false);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // 🚀 Custom Alert State
  const [alert, setAlert] = useState({
    isOpen: false,
    title: "",
    description: "",
    type: "info" as any
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (rest of function same)
  };

  const handleExtract = async () => {
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    const files = fileInput?.files;
    
    if (!files || files.length === 0) {
      toast.error("Please upload images or PDFs.");
      return;
    }

    setLoading(true);
    setResultUrl(null);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/tools/extract-application", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setAlert({
            isOpen: true,
            title: res.status === 403 ? "Quota Exceeded" : "AI Error",
            description: data.error || "Failed to extract data from these files.",
            type: res.status === 403 ? "warning" : "error"
        });
        setLoading(false);
        return;
      }

      if (data.results) {
          setAllResults((prev) => [...prev, ...data.results]);
          
          // Refresh Header Credits
          window.dispatchEvent(new Event("refresh-session"));
          
          toast.success(`Processed ${data.results.length} files!`);
      }
      
    } catch (error: any) {
      console.error(error);
      setAlert({
          isOpen: true,
          title: "Connection Error",
          description: "Could not reach the AI extraction server.",
          type: "error"
      });
    } finally {
      setLoading(false);
      if (fileInput) fileInput.value = "";
    }
  };

  const downloadExcel = () => {
    // ... (same)
  };

  const clearResults = () => {
    // ... (same)
  };

  return (
    <div className="w-full space-y-6 pb-20">
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />
      {/* ... previous JSX ... */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
                <ScanText size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">AI Data Extractor</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Handwritten to Digital</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {allResults.length > 0 && (
                <Button 
                    variant="outline" 
                    onClick={clearResults} 
                    className="text-red-600 hover:bg-red-50 border-red-100 rounded-xl px-4 h-11"
                >
                    <Trash2 size={16} className="mr-2" /> Clear
                </Button>
            )}

            <div className="relative">
                <input 
                    id="file-upload"
                    type="file" 
                    accept="image/*,.pdf" 
                    multiple
                    onChange={handleFileChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    disabled={loading}
                />
                <Button 
                    onClick={handleExtract}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-indigo-600/20"
                >
                    {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting...</>
                    ) : (
                        <><Plus size={18} className="mr-2" /> Upload & Extract</>
                    )}
                </Button>
            </div>

            {allResults.length > 0 && (
                <Button 
                    onClick={downloadExcel} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-emerald-600/20"
                >
                    <Download size={18} className="mr-2" /> Download Excel
                </Button>
            )}
        </div>
      </div>

      {/* FULL WIDTH TABLE VIEW */}
      <Card className="shadow-2xl border-slate-200 overflow-hidden rounded-2xl">
        <div className="p-0 overflow-x-auto">
            {allResults.length > 0 ? (
                <Table>
                    <TableHeader className="bg-slate-800 text-white hover:bg-slate-800">
                        <TableRow className="border-slate-700">
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Victim Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Phone No.</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">IMEI Numbers</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Last Num</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Model</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Properties</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Date/Time</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Type</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-300 py-4 px-4">Police Station</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allResults.map((r, i) => (
                            <TableRow key={i} className="hover:bg-indigo-50/30 transition-colors border-slate-100">
                                <TableCell className="font-bold text-slate-800 text-[11px] py-4 px-4 border-r border-slate-50">{r.Name || "—"}</TableCell>
                                <TableCell className="font-bold text-blue-600 text-[11px] px-4 border-r border-slate-50">{r["Phone Number"] || "—"}</TableCell>
                                <TableCell className="font-mono text-slate-500 text-[10px] px-4 border-r border-slate-50 whitespace-nowrap">{r["IMEI Number"] || "—"}</TableCell>
                                <TableCell className="text-[11px] text-slate-600 px-4 border-r border-slate-50">{r["last Num Used"] || "—"}</TableCell>
                                <TableCell className="text-[11px] text-slate-600 px-4 border-r border-slate-50">{r["Mobile Model"] || "—"}</TableCell>
                                <TableCell className="text-[10px] text-slate-500 px-4 border-r border-slate-50 italic">{r["Other Property"] || "—"}</TableCell>
                                <TableCell className="text-[10px] font-medium text-slate-600 px-4 border-r border-slate-50">
                                    <div className="flex flex-col">
                                        <span>{r["Date Of Offence"]}</span>
                                        <span className="text-[9px] text-slate-400">{r["Time Of Offence"]}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="px-4 border-r border-slate-50">
                                    <span className="px-2 py-0.5 bg-indigo-100 rounded text-[9px] font-black uppercase text-indigo-700">
                                        {r.Type || "N/A"}
                                    </span>
                                </TableCell>
                                <TableCell className="font-black text-slate-700 text-[10px] uppercase px-4">{r["Police Station"] || "—"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="p-32 text-center flex flex-col items-center justify-center bg-white">
                    <div className="p-8 bg-slate-50 rounded-full mb-6 border border-dashed border-slate-200">
                        <UploadCloud size={64} className="text-slate-200" />
                    </div>
                    <h3 className="font-black text-lg text-slate-800 uppercase tracking-tighter">No Data Processed</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm">Click the 'Upload & Extract' button above to start reading handwritten applications.</p>
                </div>
            )}
        </div>
      </Card>

      {loading && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
              <div className="bg-white border-2 border-indigo-600 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                  <Loader2 className="text-indigo-600 animate-spin" size={24} />
                  <div>
                      <p className="font-black text-indigo-900 text-xs uppercase tracking-widest">Processing Applications</p>
                      <p className="text-[10px] text-indigo-400 font-bold">Please stay on this page...</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
