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
  CheckCircle2, Copy, Mail
} from "lucide-react";
import { toast } from "sonner";
import AlertModal from "@/components/ui/alert-modal";
import TokenExpiredModal from "@/components/ui/token-expired-modal";
import { cn, getApiUrl } from "@/lib/utils";

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
    // Jazz (Mobilink legacy)
    "300": "Jazz", "301": "Jazz", "302": "Jazz", "303": "Jazz", "304": "Jazz",
    "305": "Jazz", "306": "Jazz", "307": "Jazz", "308": "Jazz", "309": "Jazz",

    // Zong
    "310": "Zong", "311": "Zong", "312": "Zong", "313": "Zong", "314": "Zong",
    "315": "Zong", "316": "Zong", "317": "Zong", "318": "Zong", "319": "Zong",

    // Jazz (Warid legacy, ab Jazz mein merge ho chuka)
    "320": "Jazz", "321": "Jazz", "322": "Jazz", "323": "Jazz", "324": "Jazz",
    "325": "Jazz", "326": "Jazz", "327": "Jazz", "328": "Jazz", "329": "Jazz",

    // Ufone
    "330": "Ufone", "331": "Ufone", "332": "Ufone", "333": "Ufone", "334": "Ufone",
    "335": "Ufone", "336": "Ufone", "337": "Ufone", "338": "Ufone", "339": "Ufone",

    // Telenor
    "340": "Telenor", "341": "Telenor", "342": "Telenor", "343": "Telenor", "344": "Telenor",
    "345": "Telenor", "346": "Telenor", "347": "Telenor", "348": "Telenor", "349": "Telenor",

    // SCO (AJK / Gilgit-Baltistan only)
    "355": "SCO",

    // Zong (extra block)
    "370": "Zong", "371": "Zong",
};

/**
 * Kisi bhi Pakistani mobile number se operator detect karo.
 * Accepts: 03001234567, 3001234567, +923001234567, 00923001234567, 923001234567
 */
export function getOperator(rawNumber: string): string | null {
    // sirf digits rakho
    let num = rawNumber.replace(/\D/g, "");

    // country code normalize karo -> local "03XXXXXXXXX" format mein le aao
    if (num.startsWith("0092")) num = num.slice(4);
    else if (num.startsWith("92")) num = num.slice(2);

    if (num.startsWith("3") && num.length === 10) num = "0" + num; // "3001234567" -> "03001234567"

    if (!/^03\d{9}$/.test(num)) return null; // invalid number

    const prefix = num.slice(1, 4); // "0" ke baad 3 digits nikal lo, e.g. "300"
    return OPERATOR_CODES[prefix] ?? null;
}

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
  const [tokenModal, setTokenModal] = useState({ isOpen: false, currentBalance: 0, requiredTokens: 0 });
  const [sessionInfo, setSessionInfo] = useState<{ isSuper: boolean, tokens: number }>({ isSuper: true, tokens: 999999 });
  
  // Progress States
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);

  useEffect(() => {
      const fetchSession = async () => {
          try {
              const res = await fetch(getApiUrl("/api/auth/create-session"));
              const data = await res.json();
              if (data.authenticated) {
                  setSessionInfo({
                      isSuper: data.role === "super_admin",
                      tokens: data.tokens || 0
                  });
              }
          } catch(e) {}
      };
      fetchSession();
      window.addEventListener("refresh-session", fetchSession);
      return () => window.removeEventListener("refresh-session", fetchSession);
  }, []);

  const checkTemplateTokens = async (templateCount: number) => {
      const requiredTokens = templateCount * 5;
      
      if (!sessionInfo.isSuper && sessionInfo.tokens < requiredTokens) {
          setTokenModal({
              isOpen: true,
              currentBalance: sessionInfo.tokens,
              requiredTokens,
          });
          return false;
      }

      try {
          const sRes = await fetch(getApiUrl("/api/auth/create-session"));
          const sData = await sRes.json();
          if (sData.authenticated && sData.role !== "super_admin") {
              if ((sData.tokens || 0) < requiredTokens) {
                  setTokenModal({
                      isOpen: true,
                      currentBalance: sData.tokens || 0,
                      requiredTokens,
                  });
                  return false;
              }
          }
      } catch (e) {}

      return true;
  };

  const handleAutoFormat = () => {
      const lines = rawInput.split("\n").map(l => l.trim()).filter(l => l);
      const formatted = lines.map(l => formatTo92(l)).join("\n");
      setRawInput(formatted);
  };

  const identifyLocal = (numbers: string[]) => {
      return numbers.map(num => {
          const formatted = formatTo92(num);
          const cleanForPrefix = formatted.startsWith("92") ? formatted.substring(2) : formatted;
          const prefix = cleanForPrefix.substring(0, 3);
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

    const requiredTokens = numbers.length * (useApiLookup ? 20 : 10);

    // 🚀 PROACTIVE TOKEN CHECK
    try {
        const sRes = await fetch(getApiUrl("/api/auth/create-session"));
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < requiredTokens) {
                setTokenModal({
                    isOpen: true,
                    currentBalance: sData.tokens || 0,
                    requiredTokens,
                });
                return;
            }
        }
    } catch (e) {}

    setLoadingLookup(true);
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setTotalToProcess(numbers.length);
    setPreviews([]);
    setAnalyzedNumbers([]); // Clear previous results for fresh lookup

    if (!useApiLookup) {
        // Standard Mode (Local) - Process all at once since it's instant
        try {
            const deductRes = await fetch(getApiUrl("/api/tools/cdr-token"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: numbers.length }),
            });
            const deductData = await deductRes.json();

            if (deductRes.status === 403) {
                setTokenModal({
                    isOpen: true,
                    currentBalance: deductData.currentBalance || 0,
                    requiredTokens,
                });
                setLoadingLookup(false);
                setIsProcessing(false);
                return;
            }

            const results = identifyLocal(numbers);
            setAnalyzedNumbers(results);
            setProcessedCount(numbers.length);
            setProgress(100);
            setLoadingLookup(false);
            setIsProcessing(false);
            toast.success(`Operators identified — ${requiredTokens} tokens deducted`);
            window.dispatchEvent(new Event("refresh-session"));
        } catch (e) {
            toast.error("Could not verify tokens.");
            setLoadingLookup(false);
            setIsProcessing(false);
        }
        return;
    }

    // Live API Mode - Sequential processing for real-time progress
    let completedResults: { number: string, operator: string }[] = [];
    
    for (let i = 0; i < numbers.length; i++) {
        const currentNum = numbers[i];
        try {
            const res = await fetch(getApiUrl("/api/tools/pta-lookup"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numbers: [currentNum] }), // One by one
            });
            const data = await res.json();
            
            if (res.status === 403) {
                setTokenModal({
                    isOpen: true,
                    currentBalance: data.currentBalance || 0,
                    requiredTokens: (numbers.length - i) * 20, // remaining
                });
                break;
            }

            if (res.ok && data.success && data.results) {
                const result = {
                    ...data.results[0],
                    number: formatTo92(data.results[0].number)
                };
                completedResults = [...completedResults, result];
                setAnalyzedNumbers(prev => [...prev, result]);
            } else {
                setAnalyzedNumbers(prev => [...prev, { number: formatTo92(currentNum), operator: "Error" }]);
            }
        } catch (error) {
            setAnalyzedNumbers(prev => [...prev, { number: formatTo92(currentNum), operator: "Failed" }]);
        }

        // Update progress
        const nextCount = i + 1;
        setProcessedCount(nextCount);
        setProgress(Math.round((nextCount / numbers.length) * 100));

        // Add a small delay between requests to stay safe, unless it's the last one
        if (i < numbers.length - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    setLoadingLookup(false);
    setIsProcessing(false);
    toast.success("Live identification complete!");
    window.dispatchEvent(new Event("refresh-session"));
  };

  const fetchInjectedHtml = async (templateFile: string, operatorKey: string) => {
    try {
        const res = await fetch(getApiUrl(`/templates/cdr/${templateFile}`));
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
        const injectedHtml = html.replace(regex, (match, start, content, end) => {
            const disabledStart = start.replace("<textarea", "<textarea disabled readonly ");
            return `${disabledStart}${payload}${end}`;
        });
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
    const config = TEMPLATES.find(t => t.file === templateFile);
    if (!config) return;

    const canProceed = await checkTemplateTokens(1);
    if (!canProceed) return;

    setViewMode("single");
    setSelectedTemplate(templateFile);

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

    const canProceed = await checkTemplateTokens(activeTemplates.length);
    if (!canProceed) return;

    setViewMode("all");
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

  const handleCopyTemplateText = (idx: number) => {
    const iframe = document.getElementById(`iframe-preview-${idx}`) as HTMLIFrameElement;
    if (!iframe) {
      toast.error("Template preview not found.");
      return;
    }

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        toast.error("Could not access template document.");
        return;
      }

      const formatOutput = doc.getElementById("formatoutput");
      if (!formatOutput) {
        toast.error("Template output element not found.");
        return;
      }

      // innerText preserves standard layout and line breaks of <br/> elements
      const text = formatOutput.innerText || formatOutput.textContent || "";
      if (!text.trim()) {
        toast.error("Template output is empty. Make sure input numbers are provided.");
        return;
      }

      navigator.clipboard.writeText(text);
      toast.success("Template text copied to clipboard! You can paste it into your email.");
    } catch (e) {
      console.error("Error copying template text:", e);
      toast.error("Failed to copy template content.");
    }
  };

  const handleEmailTemplateText = (idx: number, templateName: string) => {
    const iframe = document.getElementById(`iframe-preview-${idx}`) as HTMLIFrameElement;
    if (!iframe) {
      toast.error("Template preview not found.");
      return;
    }

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        toast.error("Could not access template document.");
        return;
      }

      const formatOutput = doc.getElementById("formatoutput");
      if (!formatOutput) {
        toast.error("Template output element not found.");
        return;
      }

      const text = formatOutput.innerText || formatOutput.textContent || "";
      if (!text.trim()) {
        toast.error("Template output is empty.");
        return;
      }

      // Check for URL length limits (approx 2000 chars is safe for most browsers/apps)
      if (text.length > 1800) {
        toast.info("Content is too large for automatic email. Please use the 'Copy Content' button and paste it manually.", {
            duration: 6000
        });
        // Auto-copy as a convenience if it's too big
        navigator.clipboard.writeText(text);
        return;
      }

      const subject = encodeURIComponent(templateName);
      const body = encodeURIComponent(text);

      // We'll try to open Gmail Compose directly as it's the most common browser-based email
      // This is much more reliable than mailto: for users who don't have a local mail app.
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=&su=${subject}&body=${body}`;
      
      const newWindow = window.open(gmailUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback to mailto if popup blocked or Gmail failed
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        toast.success("Attempting to open mail app...");
      } else {
        toast.success("Opening Gmail Compose...");
      }

    } catch (e) {
      console.error("Error opening email:", e);
      toast.error("Failed to prepare email draft.");
    }
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
      <TokenExpiredModal
        isOpen={tokenModal.isOpen}
        onClose={() => setTokenModal({ ...tokenModal, isOpen: false })}
        currentBalance={tokenModal.currentBalance}
        requiredTokens={tokenModal.requiredTokens}
        toolName="CDR Generator"
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

        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-slate-50/50 border-b py-2 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Operator Results</CardTitle>
                </div>
                {(isProcessing || analyzedNumbers.length > 0) && (
                    <div className="flex items-center gap-2">
                        {isProcessing && (
                            <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase animate-pulse">
                                Processing {processedCount}/{totalToProcess}
                            </span>
                        )}
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
                            {analyzedNumbers.length} Found
                        </span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-hidden flex flex-col gap-3">
                {isProcessing && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                )}

                {analyzedNumbers.length > 0 ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                        {analyzedNumbers.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-indigo-300 hover:bg-white transition-all">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        a.operator === "Unknown" || a.operator === "Not Found" || a.operator === "Error" || a.operator === "Failed" ? "bg-slate-300" : "bg-emerald-500"
                                    )}></div>
                                    <span className="text-[11px] font-mono font-bold text-slate-700">{a.number}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                                    a.operator === "Unknown" || a.operator === "Not Found" || a.operator === "Error" || a.operator === "Failed"
                                        ? "bg-slate-100 text-slate-400 border-slate-200" 
                                        : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                )}>
                                    {a.operator}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : !isProcessing ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 gap-2">
                        <Search size={40} />
                        <p className="text-[10px] font-black uppercase">No Data Identified</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 gap-2">
                        <Loader2 className="animate-spin" size={40} />
                        <p className="text-[10px] font-black uppercase">Starting Identification...</p>
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
                          <div key={idx} className="flex flex-col w-[900px] h-[1560px] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.05)] rounded-2xl border border-slate-200 overflow-hidden shrink-0">
                              {/* Beautiful Action Header Bar */}
                              <div className="h-14 bg-slate-50 border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
                                  <div className="flex items-center gap-2.5">
                                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                      <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                                          {prev.name}
                                      </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                      {/* Copy Button */}
                                      <Button
                                          onClick={() => handleCopyTemplateText(idx)}
                                          variant="outline"
                                          size="sm"
                                          className="h-8 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all gap-1.5 px-3 bg-white"
                                      >
                                          <Copy size={12} className="text-slate-500 group-hover:text-emerald-600" />
                                          Copy Content
                                      </Button>

                                      {/* Email Button */}
                                      <Button
                                          onClick={() => handleEmailTemplateText(idx, prev.name)}
                                          variant="outline"
                                          size="sm"
                                          className="h-8 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all gap-1.5 px-3 bg-white"
                                      >
                                          <Mail size={12} className="text-slate-500 group-hover:text-indigo-600" />
                                          Send via Email
                                      </Button>
                                  </div>
                              </div>

                              {/* Document iframe */}
                              <div className="flex-1 relative bg-white">
                                  <iframe 
                                      id={`iframe-preview-${idx}`}
                                      srcDoc={prev.html}
                                      className="w-full h-full border-0 absolute inset-0"
                                      sandbox="allow-scripts allow-same-origin allow-forms"
                                  />
                              </div>
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
