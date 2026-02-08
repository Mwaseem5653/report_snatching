"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
        if (!res.ok) throw new Error("Lookup failed");
        const meta = res.headers.get("X-Results");
        if (meta) {
            const results = JSON.parse(meta).map((r: any) => ({
                ...r,
                number: formatTo92(r.number)
            }));
            setAnalyzedNumbers(results);
            toast.success("Operators identified (Live API)");
        }
    } catch (error) {
        toast.error("Failed to identify operators.");
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
            numbersToInject = analyzedNumbers
                .filter(a => a.operator.toLowerCase().includes(operatorKey.toLowerCase()))
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
        analyzedNumbers.some(a => a.operator.toLowerCase().includes(t.operatorKey.toLowerCase()))
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
      return analyzedNumbers.some(a => a.operator.toLowerCase().includes(opKey.toLowerCase()));
  };

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col space-y-2 overflow-hidden text-slate-900 ">
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        
        {/* 🔹 LEFT: INPUT & QUICK BUTTONS */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
            {/* Input Card with Integrated Controls */}
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden shrink-0">
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
                <CardContent className="p-3 space-y-2">
                    <Textarea 
                        value={rawInput} 
                        onChange={(e) => setRawInput(e.target.value)} 
                        onBlur={handleAutoFormat}
                        placeholder="Paste numbers here..."
                        className="min-h-[150px] max-h-[150px] rounded-2xl border-slate-200 font-mono text-[10px] leading-tight focus:ring-orange-500 bg-slate-50/20"
                    />
                    <Button 
                        onClick={handleLookup} 
                        disabled={loadingLookup}
                        className={cn(
                            "w-full h-10 rounded-2xl font-black uppercase tracking-tight text-[10px]",
                            useApiLookup ? "bg-indigo-600 hover:bg-indigo-700" : "bg-orange-600 hover:bg-orange-700"
                        )}
                    >
                        {loadingLookup ? <Loader2 className="animate-spin mr-2 h-3 w-3"/> : <ShieldCheck size={14} className="mr-2" />}
                        Identify Operators
                    </Button>
                </CardContent>
            </Card>

            {/* Operator Groups */}
            <Card className="flex-1 border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col bg-white min-h-0">
                <CardHeader className="bg-slate-50/50 border-b py-3 px-5 flex flex-row items-center justify-between shrink-0">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                        <LayoutGrid size={12} /> Available Formats
                    </CardTitle>
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
                <div className="flex-1 p-3 overflow-hidden">
                    <div className="grid grid-cols-3 grid-rows-2 h-full gap-2">
                        {TEMPLATES.filter(t => t.operatorKey !== "All").map((t) => {
                            const active = hasDataForOperator(t.operatorKey);
                            const isSelected = selectedTemplate === t.file && viewMode === "single";
                            return (
                                <button
                                    key={t.file}
                                    onClick={() => handleGenerate(t.file)}
                                    className={cn(
                                        "relative px-2 py-2 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 group overflow-hidden h-full",
                                        isSelected 
                                            ? "bg-emerald-600 border-emerald-600 shadow-md ring-2 ring-emerald-600 ring-offset-1" 
                                            : active 
                                                ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                                : "bg-slate-50 border-slate-100 hover:bg-white hover:border-orange-200"
                                    )}
                                >
                                    <FileCode size={14} className={cn(isSelected ? "text-white" : active ? "text-emerald-600" : "text-slate-400")} />
                                    <span className={cn("text-[9px] font-black uppercase tracking-tighter leading-tight text-center", isSelected ? "text-white" : active ? "text-emerald-700" : "text-slate-600")}>
                                        {t.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </div>

        {/* 🔹 RIGHT: LIVE PREVIEW AREA */}
        <div className="lg:col-span-8 overflow-hidden h-full">
            <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col bg-white">
                <div className="bg-white border-b border-slate-100 p-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Eye size={18} />
                        </div>
                        <div className="hidden sm:block">
                            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Live Template View</CardTitle>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 italic">Official Document Preview</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* MANUAL TEMPLATE PICKER */}
                        <div className="w-48">
                            <Select value={selectedTemplate} onValueChange={handleGenerate}>
                                <SelectTrigger className="h-9 text-[10px] font-black uppercase rounded-xl border-slate-200 bg-slate-50/50">
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
                                className="h-9 rounded-xl bg-orange-600 hover:bg-orange-700 font-black uppercase text-[10px] px-4"
                            >
                                <Play size={12} className="mr-1 fill-white" /> Refresh
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 bg-slate-200/50 overflow-auto custom-scrollbar p-6">
                    {previews.length > 0 ? (
                        <div className="flex flex-col items-center gap-8 min-w-max mx-auto">
                            {previews.map((prev, idx) => (
                                <div key={idx} className="relative w-[900px] h-[1500px] bg-white shadow-2xl rounded-sm border border-slate-300 overflow-hidden group shrink-0">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 z-20"></div>
                                    <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
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
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-30 gap-4">
                            <Zap size={64} className="text-slate-300 animate-pulse" />
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Awaiting Command</h3>
                                <p className="text-[10px] font-bold">Identify operators or select a template to generate view</p>
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
