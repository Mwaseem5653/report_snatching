"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileCode, Play, Eye, Search, Filter, 
  ShieldCheck, Loader2, Zap, LayoutGrid, 
  Trash2, Database, Smartphone,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import AlertModal from "@/components/ui/alert-modal";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { name: "Jazz CDR 6 Month", file: "jazz cdr 6 MONTH.html", operatorKey: "Jazz" },
  { name: "Telenor CDR 6 Month", file: "Telenor 6 month cdr.html", operatorKey: "Telenor" },
  { name: "Zong CDR 6 Month", file: "zong cdr 6 MONTH.html", operatorKey: "Zong" },
  { name: "Ufone Single CDR 1 Year", file: "ufone single cdr 1 year.html", operatorKey: "Ufone" },
  { name: "Ufone Multi CDR 1 Year", file: "ufone 2 or more cdr 1 year.html", operatorKey: "Ufone" },
  { name: "IMEI Format 3 Month", file: "imei format 3 month.html", operatorKey: "All" },
  { name: "IMEI Format 6 Month", file: "imei format 6 month.html", operatorKey: "All" },
];

const OPERATOR_CODES: Record<string, string> = {
    "30": "Jazz", "31": "Zong", "32": "Jazz", "33": "Ufone", 
    "34": "Telenor", "35": "SCO", "36": "Jazz", "37": "Telenor"
};

const formatTo92 = (num: string) => {
    let clean = num.replace(/\D/g, ""); 
    if (clean.length < 10) return num;
    if (clean.startsWith("92") && clean.length === 12) return clean;
    if (clean.startsWith("03") && clean.length === 11) return "92" + clean.substring(1);
    if (clean.startsWith("3") && clean.length === 10) return "92" + clean;
    return clean;
};

export default function CdrFormatClient() {
  const [rawInput, setRawInput] = useState("");
  const [useApiLookup, setUseApiLookup] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [analyzedNumbers, setAnalyzedNumbers] = useState<{ number: string, operator: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previews, setPreviews] = useState<{ name: string, html: string }[]>([]);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const [alert, setAlert] = useState({ isOpen: false, title: "", description: "", type: "info" as any });

  const handleAutoFormat = () => {
      const lines = rawInput.split("\n").map(l => l.trim()).filter(l => l);
      const formatted = lines.map(l => formatTo92(l)).join("\n");
      setRawInput(formatted);
  };

  const identifyLocal = (numbers: string[]) => {
      return numbers.map(num => {
          const formatted = formatTo92(num);
          const cleanForPrefix = formatted.startsWith("92") ? formatted.substring(2) : formatted;
          const prefix = cleanForPrefix.substring(0, 2);
          const operator = OPERATOR_CODES[prefix] || "Unknown";
          return { number: formatted, operator };
      });
  };

  const handleLookup = async () => {
    const numbers = rawInput.split("\n").map(n => n.trim()).filter(n => n);
    if (numbers.length === 0) {
      toast.error("Please enter numbers first.");
      return;
    }

    setLoadingLookup(true);
    setPreviews([]);

    if (!useApiLookup) {
        const results = identifyLocal(numbers);
        setAnalyzedNumbers(results);
        setLoadingLookup(false);
        toast.success("Operators identified (Standard Mode)");
        return;
    }

    try {
        const res = await fetch("/api/tools/pta-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numbers }),
        });
        const data = await res.json();
        
        if (res.status === 403) {
            setAlert({
                isOpen: true,
                title: "Insufficient Credits",
                description: data.error || "You do not have enough credits.",
                type: "warning"
            });
            return;
        }

        if (!res.ok) throw new Error(data.error || "Lookup failed");
        
        if (data.success && data.results) {
            const results = data.results.map((r: any) => ({
                ...r,
                number: formatTo92(r.number)
            }));
            setAnalyzedNumbers(results);
            toast.success("Operators identified (Live API)");
            window.dispatchEvent(new Event("refresh-session"));
        } else {
            toast.error("Failed to identify operators.");
        }
    } catch (error: any) {
        toast.error(error.message || "Failed to identify operators.");
    } finally {
        setLoadingLookup(false);
    }
  };

  const fetchInjectedHtml = async (templateFile: string, operatorKey: string) => {
    try {
        const res = await fetch(`/templates/cdr/${templateFile}`);
        if (!res.ok) return null;
        
        let html = await res.text();
        const regex = /(<textarea[^>]*id=["']formatinput["'][^>]*>)([\s\S]*?)(<\/textarea>)/i;
        
        let numbersToInject: string[] = [];
        const allFormattedInput = rawInput.split("\n").map(n => formatTo92(n.trim())).filter(n => n);

        if (operatorKey === "All") {
            numbersToInject = analyzedNumbers.length > 0 ? analyzedNumbers.map(a => a.number) : allFormattedInput;
        } else {
            // Robust matching: Check if operator name contains the key or vice versa
            numbersToInject = analyzedNumbers
                .filter(a => {
                    const op = a.operator.toLowerCase();
                    const key = operatorKey.toLowerCase();
                    return op.includes(key) || key.includes(op);
                })
                .map(a => a.number);
            
            if (analyzedNumbers.length === 0) {
                numbersToInject = allFormattedInput;
            }
        }

        const payload = numbersToInject.join("\n");
        const injectedHtml = html.replace(regex, (match, start, content, end) => `${start}${payload}${end}`);
        const script = `
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(function() { if (typeof changeFormat === 'function') { changeFormat(); } }, 500);
            });
          </script>
        `;
        return injectedHtml + script;
    } catch (e) { return null; }
  };

  const handleGenerate = async (templateFile: string) => {
    setViewMode("single");
    setSelectedTemplate(templateFile);
    const config = TEMPLATES.find(t => t.file === templateFile);
    if (!config) return;

    const html = await fetchInjectedHtml(templateFile, config.operatorKey);
    if (html) {
        setPreviews([{ name: config.name, html }]);
        toast.success(`Generated ${config.name}`);
    }
  };

  const handleGenerateAll = async () => {
    if (analyzedNumbers.length === 0) {
        toast.error("Please identify operators first.");
        return;
    }

    setViewMode("all");
    const activeTemplates = TEMPLATES.filter(t => 
        t.operatorKey !== "All" && 
        analyzedNumbers.some(a => {
            const op = a.operator.toLowerCase();
            const key = t.operatorKey.toLowerCase();
            return op.includes(key) || key.includes(op);
        })
    );

    if (activeTemplates.length === 0) {
        toast.warning("No specific operators identified to auto-generate.");
        return;
    }

    const generated = [];
    for (const t of activeTemplates) {
        const html = await fetchInjectedHtml(t.file, t.operatorKey);
        if (html) generated.push({ name: t.name, html });
    }
    setPreviews(generated);
    toast.success(`Generated ${generated.length} templates!`);
  };

  const hasDataForOperator = (opKey: string) => {
      if (opKey === "All") return rawInput.trim().length > 0;
      return analyzedNumbers.some(a => {
          const op = a.operator.toLowerCase();
          const key = opKey.toLowerCase();
          return op.includes(key) || key.includes(op);
      });
  };

  return (
    <div className="flex flex-col space-y-4 text-slate-900 pb-20">
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />
      
      {/* 🔹 TOP SECTION: INPUT, RESULTS & FORMATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Column 1: Input Area */}
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-slate-50/50 border-b py-2 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Smartphone size={14} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Mobile Numbers</CardTitle>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/50 border border-slate-200 px-2 py-1 rounded-xl">
                        <span className="text-[8px] font-black uppercase text-slate-400">Live API</span>
                        <Switch 
                            checked={useApiLookup} 
                            onCheckedChange={setUseApiLookup} 
                            className="h-4 w-8 data-[state=checked]:bg-indigo-600 scale-75 origin-right" 
                        />
                    </div>
                    <button 
                        onClick={() => { setRawInput(""); setAnalyzedNumbers([]); setPreviews([]); setSelectedTemplate(""); }}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3 flex flex-col flex-1">
                <Textarea 
                    value={rawInput} 
                    onChange={(e) => setRawInput(e.target.value)} 
                    onBlur={handleAutoFormat}
                    placeholder="Paste numbers here..."
                    className="flex-1 rounded-2xl border-slate-200 font-mono text-[10px] leading-tight focus:ring-orange-500 bg-slate-50/20"
                />
                <Button 
                    onClick={handleLookup} 
                    disabled={loadingLookup}
                    className={cn(
                        "w-full h-12 rounded-2xl font-black uppercase tracking-tight text-[11px] shadow-lg transition-all",
                        useApiLookup ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20" : "bg-orange-600 hover:bg-orange-700 shadow-orange-600/20"
                    )}
                >
                    {loadingLookup ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <ShieldCheck size={16} className="mr-2" />}
                    {useApiLookup ? "Live API Identification" : "Identify Operators"}
                </Button>
            </CardContent>
        </Card>

        {/* Column 2: Identification Results */}
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-slate-50/50 border-b py-2 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Operator Results</CardTitle>
                </div>
                {analyzedNumbers.length > 0 && (
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
                        {analyzedNumbers.length} Found
                    </span>
                )}
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-hidden">
                {analyzedNumbers.length > 0 ? (
                    <div className="h-full overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                        {analyzedNumbers.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-indigo-300 hover:bg-white transition-all">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        a.operator === "Unknown" || a.operator === "Not Found" ? "bg-slate-300" : "bg-emerald-500"
                                    )}></div>
                                    <span className="text-[11px] font-mono font-bold text-slate-700">{a.number}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                                    a.operator === "Unknown" || a.operator === "Not Found" 
                                        ? "bg-slate-100 text-slate-400 border-slate-200" 
                                        : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                )}>
                                    {a.operator}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 gap-2">
                        <Search size={40} />
                        <p className="text-[10px] font-black uppercase">No Data Identified</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Column 3: Available Formats */}
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-slate-50/50 border-b py-2 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid size={14} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Available Formats</CardTitle>
                </div>
                {analyzedNumbers.length > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleGenerateAll}
                        className="h-6 text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-2 rounded-full border border-indigo-100"
                    >
                        <Zap size={10} className="mr-1 fill-indigo-600" /> Auto Build All
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-hidden">
                <div className="grid grid-cols-2 gap-2 h-full content-start overflow-y-auto pr-1 custom-scrollbar">
                    {TEMPLATES.map((t) => {
                        const active = hasDataForOperator(t.operatorKey);
                        const isSelected = selectedTemplate === t.file && viewMode === "single";
                        return (
                            <button
                                key={t.file}
                                onClick={() => handleGenerate(t.file)}
                                className={cn(
                                    "relative px-3 py-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 group overflow-hidden",
                                    isSelected 
                                        ? "bg-indigo-600 border-indigo-600 shadow-md ring-2 ring-indigo-600 ring-offset-1" 
                                        : active 
                                            ? "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                                            : "bg-slate-50 border-slate-100 hover:bg-white hover:border-orange-200"
                                )}
                            >
                                <FileCode size={18} className={cn(isSelected ? "text-white" : active ? "text-indigo-600" : "text-slate-400")} />
                                <span className={cn("text-[10px] font-black uppercase tracking-tight leading-tight", isSelected ? "text-white" : active ? "text-indigo-700" : "text-slate-600")}>
                                    {t.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 🔹 BOTTOM SECTION: LIVE PREVIEW */}
      <Card className="border-slate-200 rounded-[1.5rem] overflow-hidden shadow-2xl flex flex-col bg-white min-h-[800px]">
          <div className="bg-white border-b border-slate-100 p-4 shrink-0 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Eye size={18} />
                  </div>
                  <div>
                      <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Live Template View</CardTitle>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 italic">Official Document Preview</p>
                  </div>
              </div>

              <div className="flex items-center gap-2">
                  <div className="w-64">
                      <Select value={selectedTemplate} onValueChange={handleGenerate}>
                          <SelectTrigger className="h-10 text-[10px] font-black uppercase rounded-xl border-slate-200 bg-slate-50/50">
                              <SelectValue placeholder="Manual Template Select" />
                          </SelectTrigger>
                          <SelectContent>
                              {TEMPLATES.map(t => (
                                  <SelectItem key={t.file} value={t.file} className="text-[10px] uppercase font-bold">{t.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  {selectedTemplate && (
                      <Button 
                          size="sm" 
                          onClick={() => handleGenerate(selectedTemplate)} 
                          className="h-10 rounded-xl bg-orange-600 hover:bg-orange-700 font-black uppercase text-[10px] px-6 shadow-lg shadow-orange-600/20"
                      >
                          <Play size={12} className="mr-1 fill-white" /> Refresh View
                      </Button>
                  )}
              </div>
          </div>
          
          <div className="flex-1 bg-slate-100/50 overflow-auto custom-scrollbar p-2">
              {previews.length > 0 ? (
                  <div className="flex flex-col items-center gap-12 min-w-max mx-auto">
                      {previews.map((prev, idx) => (
                          <div key={idx} className="relative w-[900px] h-[1500px] bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] rounded-sm border border-slate-200 overflow-hidden group shrink-0">
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600 z-20"></div>
                              <div className="absolute top-6 right-6 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                  {prev.name}
                              </div>
                              <iframe 
                                  srcDoc={prev.html}
                                  className="w-full h-full border-0 absolute inset-0"
                                  sandbox="allow-scripts allow-same-origin allow-forms"
                              />
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 gap-6">
                      <div className="p-8 bg-slate-200 rounded-full animate-pulse">
                        <Zap size={80} className="text-slate-400" />
                      </div>
                      <div className="space-y-2">
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Awaiting Command</h3>
                          <p className="text-xs font-bold uppercase tracking-tight">Identify operators or select a template above to generate view</p>
                      </div>
                  </div>
              )}
          </div>
      </Card>
    </div>
  );
}
