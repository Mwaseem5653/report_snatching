"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Play, Eye, Search, 
  ShieldCheck, Loader2, Zap, LayoutGrid, 
  Trash2, Database, Smartphone, Calendar,
  Copy, Mail, Check, FileText, FileDown, FileSpreadsheet
} from "lucide-react";
import ExcelDataMerger from "@/components/tools/ExcelDataMerger";
import { toast } from "sonner";
import AlertModal from "@/components/ui/alert-modal";
import TokenExpiredModal from "@/components/ui/token-expired-modal";
import { cn, getApiUrl } from "@/lib/utils";
import { 
  generateFilledPerformaDocx, 
  generateFilledPerformaPdf,
  downloadDocxBlob, 
  downloadPdfBlob,
  shareOrAttachPerformaDocx, 
  formatDateDDMMYYYY 
} from "@/lib/docx-performa";
import { 
  CDR_TEMPLATES, 
  CdrDurationPreset,
  CdrTemplateConfig, 
  CdrGeneratedResult, 
  findCdrTemplate,
  extract15DigitIMEIs,
  extract12DigitNumbers
} from "@/lib/cdr-templates";

const OPERATOR_CODES: Record<string, string> = {
    // Jazz (Mobilink legacy)
    "300": "Jazz", "301": "Jazz", "302": "Jazz", "303": "Jazz", "304": "Jazz",
    "305": "Jazz", "306": "Jazz", "307": "Jazz", "308": "Jazz", "309": "Jazz",

    // Zong
    "310": "Zong", "311": "Zong", "312": "Zong", "313": "Zong", "314": "Zong",
    "315": "Zong", "316": "Zong", "317": "Zong", "318": "Zong", "319": "Zong",

    // Warid legacy (now Jazz network)
    "320": "Jazz / Warid", "321": "Jazz / Warid", "322": "Jazz / Warid", "323": "Jazz / Warid", "324": "Jazz / Warid",
    "325": "Jazz / Warid", "326": "Jazz / Warid", "327": "Jazz / Warid", "328": "Jazz / Warid", "329": "Jazz / Warid",

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

export function getOperator(rawNumber: string): string | null {
    let num = rawNumber.replace(/\D/g, "");

    if (num.startsWith("0092")) num = num.slice(4);
    else if (num.startsWith("92")) num = num.slice(2);

    if (num.startsWith("3") && num.length === 10) num = "0" + num;

    if (!/^03\d{9}$/.test(num)) return null;

    const prefix = num.slice(1, 4);
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

interface FormatDurationConfig {
  preset: CdrDurationPreset;
  customDays: number;
}

interface OperatorRowConfig {
  key: "jazz" | "telenor" | "zong" | "ufone" | "imei";
  name: string;
  cdrTemplateId: string;
  locTemplateId?: string;
  idpTemplateId?: string;
  hasLoc: boolean;
  hasIdp: boolean;
  operatorKey: string;
  isImei?: boolean;
}

const OPERATOR_ROWS: OperatorRowConfig[] = [
  { key: "jazz", name: "Jazz / Warid", cdrTemplateId: "jazz", locTemplateId: "loc-jazz", idpTemplateId: "idp-jazz", hasLoc: true, hasIdp: true, operatorKey: "Jazz" },
  { key: "telenor", name: "Telenor", cdrTemplateId: "telenor", locTemplateId: "loc-telenor", idpTemplateId: "idp-telenor", hasLoc: true, hasIdp: true, operatorKey: "Telenor" },
  { key: "zong", name: "Zong", cdrTemplateId: "zong", locTemplateId: "loc-zong", idpTemplateId: "idp-zong", hasLoc: true, hasIdp: true, operatorKey: "Zong" },
  { key: "ufone", name: "Ufone", cdrTemplateId: "ufone", locTemplateId: "loc-ufone", idpTemplateId: "idp-ufone", hasLoc: true, hasIdp: true, operatorKey: "Ufone" },
  { key: "imei", name: "IMEI All Networks", cdrTemplateId: "imei", hasLoc: false, hasIdp: false, operatorKey: "All", isImei: true },
];

const DEFAULT_DURATIONS: Record<string, FormatDurationConfig> = {
  jazz: { preset: "6m", customDays: 170 },
  telenor: { preset: "6m", customDays: 170 },
  zong: { preset: "6m", customDays: 170 },
  ufone: { preset: "1y", customDays: 360 },
  imei: { preset: "6m", customDays: 170 },
};

export interface CombinedCdrOutput {
  title: string;
  html: string;
  text: string;
  cdrCount: number;
  locCount?: number;
  idpCount: number;
  totalNumbers: number;
  numbers?: string[];
  periodDays?: number;
}

export default function CdrFormatClient() {
  const [rawInput, setRawInput] = useState("");
  const [activeToolMode, setActiveToolMode] = useState<"cdr" | "merger">("cdr");
  const [liveApi, setLiveApi] = useState<"none" | "ding" | "checksim">("none");
  const useApiLookup = liveApi !== "none";
  // Defaulted to "ding" live lookup
  const [apiRoute, setApiRoute] = useState<"pta" | "ding">("ding");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [analyzedNumbers, setAnalyzedNumbers] = useState<{ number: string, operator: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Single Unified Combined Output
  const [combinedOutput, setCombinedOutput] = useState<CombinedCdrOutput | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"rendered" | "text" | "html">("rendered");
  const [copied, setCopied] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [selectedPerforma, setSelectedPerforma] = useState<{ p1: boolean; p2: boolean }>({ p1: true, p2: true });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // 20-Set Query List Options (CDR, LOC, OWN, IMEI)
  const [formatViewMode, setFormatViewMode] = useState<"20set" | "operators">("20set");
  const [batch20Options, setBatch20Options] = useState({
    cdr: true,
    loc: true,
    own: true,
    imei: true,
  });
  
  // CDR Checkboxes per operator
  const [selectedCdr, setSelectedCdr] = useState<Record<string, boolean>>({
    jazz: true,
    telenor: true,
    zong: true,
    ufone: true,
    imei: true,
  });

  // LOC Checkboxes in the same row per operator
  const [selectedLoc, setSelectedLoc] = useState<Record<string, boolean>>({
    jazz: false,
    telenor: false,
    zong: false,
    ufone: false,
  });

  // IDP Checkboxes in the same row per operator
  const [selectedIdp, setSelectedIdp] = useState<Record<string, boolean>>({
    jazz: false,
    telenor: false,
    zong: false,
    ufone: false,
  });

  // Individual Separate Date Filter per Operator
  const [formatDurations, setFormatDurations] = useState<Record<string, FormatDurationConfig>>(DEFAULT_DURATIONS);

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

  const getFormatEffectiveDays = (opKey: string) => {
    const config = formatDurations[opKey] || DEFAULT_DURATIONS[opKey] || { preset: "6m", customDays: 170 };
    if (config.preset === "custom") {
      return { days: config.customDays > 0 ? config.customDays : 170, label: `Custom (${config.customDays}d)` };
    }
    switch (config.preset) {
      case "3m": return { days: 90, label: "3M" };
      case "6m": return { days: 170, label: "6M" };
      case "9m": return { days: 270, label: "9M" };
      case "1y": return { days: 360, label: "1Y" };
      default: return { days: 170, label: "6M" };
    }
  };

  const handleDurationPresetChange = (opKey: string, preset: CdrDurationPreset) => {
    setFormatDurations(prev => {
      const current = prev[opKey] || DEFAULT_DURATIONS[opKey] || { preset: "6m", customDays: 180 };
      return {
        ...prev,
        [opKey]: { ...current, preset },
      };
    });
  };

  const handleCustomDaysChange = (opKey: string, days: number) => {
    setFormatDurations(prev => {
      const current = prev[opKey] || DEFAULT_DURATIONS[opKey] || { preset: "custom", customDays: 180 };
      return {
        ...prev,
        [opKey]: { ...current, customDays: days },
      };
    });
  };

  // Extract strict counts
  const operatorCounts = useMemo(() => {
    const rawLines = rawInput.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
    
    // Strict 15-digit IMEIs only
    const validImeis = rawLines.filter(line => line.replace(/\D/g, "").length === 15);

    // Strict 10-12 digit mobile numbers only
    const validPhoneLines = rawLines.filter(line => line.replace(/\D/g, "").length !== 15);

    const list = analyzedNumbers.length > 0 ? analyzedNumbers : validPhoneLines.map(num => {
      const formatted = formatTo92(num);
      const cleanForPrefix = formatted.startsWith("92") ? formatted.substring(2) : formatted;
      const prefix = cleanForPrefix.substring(0, 3);
      const op = OPERATOR_CODES[prefix] || "Unknown";
      return { number: formatted, operator: op };
    });

    const jazzCount = list.filter(item => item.operator.toLowerCase().includes("jazz") || item.operator.toLowerCase().includes("warid")).length;
    const telenorCount = list.filter(item => item.operator.toLowerCase().includes("telenor")).length;
    const zongCount = list.filter(item => item.operator.toLowerCase().includes("zong")).length;
    const ufoneCount = list.filter(item => item.operator.toLowerCase().includes("ufone")).length;

    return {
      jazz: jazzCount,
      telenor: telenorCount,
      zong: zongCount,
      ufone: ufoneCount,
      imei: validImeis.length,
      totalNumbers: list.length,
    };
  }, [rawInput, analyzedNumbers]);

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
      return true;
  };

  const handleAutoFormat = () => {
      const lines = rawInput.split("\n").map(l => l.trim()).filter(l => l);
      const formatted = lines.map(l => {
        const digits = l.replace(/\D/g, "");
        if (digits.length === 15) return digits; // Keep IMEI as 15 digits
        return formatTo92(l);
      }).join("\n");
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
    const rawLines = rawInput.split("\n").map(n => n.trim()).filter(Boolean);
    const numbers = rawLines.filter(line => line.replace(/\D/g, "").length !== 15);
    
    if (numbers.length === 0) {
      if (rawLines.some(line => line.replace(/\D/g, "").length === 15)) {
        toast.info("15-digit IMEIs detected. You can directly generate the IMEI format!");
        return;
      }
      toast.error("Please enter mobile numbers first.");
      return;
    }

    const requiredTokens = numbers.length * 10;
    setLoadingLookup(true);
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setTotalToProcess(numbers.length);
    setCombinedOutput(null);
    setAnalyzedNumbers([]);

    if (liveApi === "none") {
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

    // ── Live API Mode ──────────────────────────────────────────────
    // 1. Checksim Live API
    if (liveApi === "checksim") {
        if (numbers.length > 20) {
            toast.error("Max 20 numbers allowed per request for Checksim Live API.");
            setLoadingLookup(false);
            setIsProcessing(false);
            return;
        }

        try {
            const res = await fetch(getApiUrl("/api/tools/checksim-lookup"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numbers }),
            });
            const data = await res.json();

            if (res.status === 403) {
                setTokenModal({
                    isOpen: true,
                    currentBalance: data.currentBalance || 0,
                    requiredTokens: numbers.length * 10,
                });
                setLoadingLookup(false);
                setIsProcessing(false);
                return;
            }

            if (res.status === 429) {
                toast.error(data.error || "Rate limit active. 5-minute break required after checking 20 numbers.");
                setLoadingLookup(false);
                setIsProcessing(false);
                return;
            }

            if (res.ok && data.success && data.results) {
                const results = data.results.map((r: any) => ({
                    ...r,
                    number: formatTo92(r.number || r.phone || "")
                }));
                setAnalyzedNumbers(results);
                setProcessedCount(numbers.length);
                setProgress(100);
                toast.success(`Checksim Live identification complete! (${results.length} numbers)`);
                window.dispatchEvent(new Event("refresh-session"));
            } else {
                toast.error(data.error || "Checksim lookup failed.");
            }
        } catch (error: any) {
            toast.error("Network error during Checksim lookup: " + error.message);
        }
    } else if (liveApi === "ding") {
        // 2. Ding Live API
        if (numbers.length > 50) {
            toast.error("Max 50 numbers allowed per request for Ding Live API.");
            setLoadingLookup(false);
            setIsProcessing(false);
            return;
        }

        try {
            const res = await fetch(getApiUrl("/api/tools/ding-lookup"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numbers }),
            });
            const data = await res.json();

            if (res.status === 403) {
                setTokenModal({
                    isOpen: true,
                    currentBalance: data.currentBalance || 0,
                    requiredTokens: numbers.length * 10,
                });
                setLoadingLookup(false);
                setIsProcessing(false);
                return;
            }

            if (res.ok && data.success && data.results) {
                const results = data.results.map((r: any) => ({
                    ...r,
                    number: formatTo92(r.number || "")
                }));
                setAnalyzedNumbers(results);
                setProcessedCount(numbers.length);
                setProgress(100);
                toast.success(`Ding Live identification complete! (${results.length} numbers) — ${numbers.length * 10} tokens deducted`);
                window.dispatchEvent(new Event("refresh-session"));
            } else {
                toast.error(data.error || "Ding lookup failed.");
            }
        } catch (error: any) {
            toast.error("Network error during Ding lookup: " + error.message);
        }
    }

    setLoadingLookup(false);
    setIsProcessing(false);
  };

  const getNumbersForOperator = (operatorKey: string, isImei: boolean = false) => {
    const rawLines = rawInput.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
    
    // Strict IMEI filtering: only lines where digit count is strictly 15
    if (isImei) {
      return rawLines.filter(line => line.replace(/\D/g, "").length === 15);
    }

    // Strict phone number filtering: ignore 15-digit IMEIs
    const phoneLines = rawLines.filter(line => line.replace(/\D/g, "").length !== 15);
    const allFormattedInput = phoneLines.map(n => formatTo92(n));

    if (operatorKey === "All") {
        return analyzedNumbers.length > 0 ? analyzedNumbers.map(a => a.number) : allFormattedInput;
    }

    const filtered = analyzedNumbers
        .filter(a => {
            const op = a.operator.toLowerCase();
            const key = operatorKey.toLowerCase();
            return op.includes(key) || key.includes(op);
        })
        .map(a => a.number);

    if (analyzedNumbers.length === 0) {
        const localList = identifyLocal(phoneLines);
        const matched = localList
          .filter(a => {
            const op = a.operator.toLowerCase();
            const key = operatorKey.toLowerCase();
            return op.includes(key) || key.includes(op);
          })
          .map(a => a.number);
        // Sirf matched numbers return karo — agar koi Ufone/Jazz/etc number nahi to empty return karo
        return matched;
    }

    return filtered;
  };

  const handleGenerateSingleRow = async (row: OperatorRowConfig) => {
    const isCdr = selectedCdr[row.key];
    const isLoc = row.hasLoc && selectedLoc[row.key];
    const isIdp = row.hasIdp && selectedIdp[row.key];

    if (!isCdr && !isLoc && !isIdp) {
      toast.error(`Please check CDR, LOC or IDP for ${row.name}`);
      return;
    }

    const inputData = getNumbersForOperator(row.operatorKey, row.isImei);
    if (inputData.length === 0) {
        if (row.isImei) {
          toast.error("Please enter valid 15-digit IMEIs.");
        } else {
          toast.error(`Please enter valid mobile numbers for ${row.name}.`);
        }
        return;
    }

    const countToGen = (isCdr ? 1 : 0) + (isLoc ? 1 : 0) + (isIdp ? 1 : 0);
    const canProceed = await checkTemplateTokens(countToGen);
    if (!canProceed) return;

    const cdrResults: { name: string; result: CdrGeneratedResult }[] = [];
    const locResults: { name: string; result: CdrGeneratedResult }[] = [];
    const idpResults: { name: string; result: CdrGeneratedResult }[] = [];

    // 1. CDR format first
    if (isCdr) {
      const cdrT = findCdrTemplate(row.cdrTemplateId);
      if (cdrT) {
        const { days, label } = getFormatEffectiveDays(row.key);
        const result = cdrT.generate(inputData, { customDays: days, durationLabel: label });
        if (result.totalCount > 0) cdrResults.push({ name: cdrT.name, result });
      }
    }

    // 2. LOC format second (after CDR, before IDP)
    if (isLoc && row.locTemplateId) {
      const locT = findCdrTemplate(row.locTemplateId);
      if (locT) {
        const result = locT.generate(inputData);
        if (result.totalCount > 0) locResults.push({ name: locT.name, result });
      }
    }

    // 3. IDP format third
    if (isIdp && row.idpTemplateId) {
      const idpT = findCdrTemplate(row.idpTemplateId);
      if (idpT) {
        const result = idpT.generate(inputData);
        if (result.totalCount > 0) idpResults.push({ name: idpT.name, result });
      }
    }

    if (cdrResults.length === 0 && locResults.length === 0 && idpResults.length === 0) {
      toast.warning(`No matching numbers found for ${row.name}`);
      return;
    }

    // Compile into ONE Combined Output: CDRs -> LOCs -> IDPs!
    const sectionsHtml: string[] = [];
    const sectionsText: string[] = [];

    if (cdrResults.length > 0) {
      sectionsHtml.push(cdrResults.map(c => c.result.html).join("<br/><br/>"));
      sectionsText.push(cdrResults.map(c => c.result.text.trim()).join("\n\n\n"));
    }

    if (locResults.length > 0) {
      sectionsHtml.push(locResults.map(l => l.result.html).join("<br/><br/>"));
      sectionsText.push(locResults.map(l => l.result.text.trim()).join("\n\n\n"));
    }

    if (idpResults.length > 0) {
      sectionsHtml.push(idpResults.map(i => i.result.html).join("<br/><br/>"));
      sectionsText.push(idpResults.map(i => i.result.text.trim()).join("\n\n\n"));
    }

    const combinedHtml = sectionsHtml.join("<br/><br/><br/><hr style='border:1px dashed #cbd5e1; margin:20px 0;' /><br/>");
    const combinedText = sectionsText.join("\n\n\n\n----------------------------------------\n\n\n\n");

    setCombinedOutput({
      title: `${row.name} Request`,
      html: combinedHtml,
      text: combinedText,
      cdrCount: cdrResults.length,
      locCount: locResults.length,
      idpCount: idpResults.length,
      totalNumbers: cdrResults[0]?.result.totalCount || locResults[0]?.result.totalCount || idpResults[0]?.result.totalCount || 0,
      numbers: inputData,
      periodDays: getFormatEffectiveDays(row.key).days,
    });

    toast.success(`Generated ${row.name} combined output!`);
  };

  const handleGenerateSelected = async () => {
    // 1. Mobile CDRs
    const mobileCdrTasks = OPERATOR_ROWS.filter(r => !r.isImei && selectedCdr[r.key]);
    
    // 2. IMEI CDR
    const imeiCdrTask = OPERATOR_ROWS.find(r => r.isImei && selectedCdr[r.key]);

    // 3. LOCs
    const locTasks = OPERATOR_ROWS.filter(r => r.hasLoc && r.locTemplateId && selectedLoc[r.key]);

    // 4. IDPs
    const idpTasks = OPERATOR_ROWS.filter(r => r.hasIdp && r.idpTemplateId && selectedIdp[r.key]);

    const totalTasks = mobileCdrTasks.length + (imeiCdrTask ? 1 : 0) + locTasks.length + idpTasks.length;
    if (totalTasks === 0) {
      toast.error("Please select at least one CDR, LOC, or IDP format checkbox.");
      return;
    }

    const canProceed = await checkTemplateTokens(totalTasks);
    if (!canProceed) return;

    const generatedMobileCdr: { name: string; result: CdrGeneratedResult }[] = [];
    const generatedImeiCdr: { name: string; result: CdrGeneratedResult }[] = [];
    const generatedLoc: { name: string; result: CdrGeneratedResult }[] = [];
    const generatedIdp: { name: string; result: CdrGeneratedResult }[] = [];

    // Generate Mobile CDRs
    for (const row of mobileCdrTasks) {
      const template = findCdrTemplate(row.cdrTemplateId);
      if (!template) continue;

      const inputData = getNumbersForOperator(row.operatorKey, false);
      if (inputData.length === 0) continue;

      const { days, label } = getFormatEffectiveDays(row.key);
      const result = template.generate(inputData, {
        customDays: days,
        durationLabel: label,
      });

      if (result.totalCount > 0) {
        generatedMobileCdr.push({ name: template.name, result });
      }
    }

    // Generate IMEI CDR only if valid 15-digit IMEIs exist
    if (imeiCdrTask) {
      const template = findCdrTemplate(imeiCdrTask.cdrTemplateId);
      if (template) {
        const inputData = getNumbersForOperator(imeiCdrTask.operatorKey, true);
        if (inputData.length > 0) {
          const { days, label } = getFormatEffectiveDays(imeiCdrTask.key);
          const result = template.generate(inputData, {
            customDays: days,
            durationLabel: label,
          });
          if (result.totalCount > 0) {
            generatedImeiCdr.push({ name: template.name, result });
          }
        }
      }
    }

    // Generate LOCs (after CDR, before IDP)
    for (const row of locTasks) {
      if (!row.locTemplateId) continue;
      const template = findCdrTemplate(row.locTemplateId);
      if (!template) continue;

      const inputData = getNumbersForOperator(row.operatorKey, false);
      if (inputData.length === 0) continue;

      const result = template.generate(inputData);
      if (result.totalCount > 0) {
        generatedLoc.push({ name: template.name, result });
      }
    }

    // Generate IDPs
    for (const row of idpTasks) {
      if (!row.idpTemplateId) continue;
      const template = findCdrTemplate(row.idpTemplateId);
      if (!template) continue;

      const inputData = getNumbersForOperator(row.operatorKey, false);
      if (inputData.length === 0) continue;

      const result = template.generate(inputData);
      if (result.totalCount > 0) {
        generatedIdp.push({ name: template.name, result });
      }
    }

    if (generatedMobileCdr.length === 0 && generatedImeiCdr.length === 0 && generatedLoc.length === 0 && generatedIdp.length === 0) {
      toast.warning("No matching numbers or 15-digit IMEIs found for selected formats.");
      return;
    }

    // Build unified combined document with clean spacing in exact order:
    // 1. Mobile CDRs
    // 2. Space + IMEI (if present)
    // 3. Space + LOCs (if present)
    // 4. Space + IDPs (if present)
    const htmlSections: string[] = [];
    const textSections: string[] = [];

    // Add Mobile CDRs
    if (generatedMobileCdr.length > 0) {
      htmlSections.push(generatedMobileCdr.map(c => c.result.html).join("<br/><br/>"));
      textSections.push(generatedMobileCdr.map(c => c.result.text.trim()).join("\n\n\n"));
    }

    // Add IMEI with clear spacing before it
    if (generatedImeiCdr.length > 0) {
      htmlSections.push(generatedImeiCdr.map(c => c.result.html).join("<br/><br/>"));
      textSections.push(generatedImeiCdr.map(c => c.result.text.trim()).join("\n\n\n"));
    }

    // Add LOCs (after CDR, before IDP)
    if (generatedLoc.length > 0) {
      htmlSections.push(generatedLoc.map(l => l.result.html).join("<br/><br/>"));
      textSections.push(generatedLoc.map(l => l.result.text.trim()).join("\n\n\n"));
    }

    // Add IDPs with clear divider before it
    if (generatedIdp.length > 0) {
      htmlSections.push(generatedIdp.map(i => i.result.html).join("<br/><br/>"));
      textSections.push(generatedIdp.map(i => i.result.text.trim()).join("\n\n\n"));
    }

    const combinedHtml = htmlSections.join("<br/><br/><br/><hr style='border:1px dashed #cbd5e1; margin:24px 0;' /><br/>");
    const combinedText = textSections.join("\n\n\n\n----------------------------------------\n\n\n\n");

    const totalCdrCount = generatedMobileCdr.length + generatedImeiCdr.length;
    const totalNum = generatedMobileCdr.reduce((acc, curr) => acc + curr.result.totalCount, 0) +
                     generatedImeiCdr.reduce((acc, curr) => acc + curr.result.totalCount, 0);

    const titleParts: string[] = [];
    if (totalCdrCount > 0) titleParts.push(`${totalCdrCount} CDR`);
    if (generatedLoc.length > 0) titleParts.push(`${generatedLoc.length} LOC`);
    if (generatedIdp.length > 0) titleParts.push(`${generatedIdp.length} IDP`);

    // Collect all unique processed numbers in order
    const allNumbersProcessed: string[] = [];
    const seenNumbers = new Set<string>();

    [...generatedMobileCdr, ...generatedImeiCdr, ...generatedLoc, ...generatedIdp].forEach(g => {
      g.result.items?.forEach(num => {
        if (!seenNumbers.has(num)) {
          seenNumbers.add(num);
          allNumbersProcessed.push(num);
        }
      });
    });

    // Fallback if items was not populated in result
    if (allNumbersProcessed.length === 0) {
      const rawLines = rawInput.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
      rawLines.forEach(l => {
        const d = l.replace(/\D/g, "");
        if (d.length === 15) {
          allNumbersProcessed.push(d);
        } else if (d.length >= 10) {
          allNumbersProcessed.push(formatTo92(l));
        }
      });
    }

    setCombinedOutput({
      title: `Combined Request (${titleParts.join(" + ")})`,
      html: combinedHtml,
      text: combinedText,
      cdrCount: totalCdrCount,
      locCount: generatedLoc.length,
      idpCount: generatedIdp.length,
      totalNumbers: totalNum,
      numbers: allNumbersProcessed,
      periodDays: 180,
    });

    toast.success(`Generated unified document (${titleParts.join(" + ")})!`);
  };

  const toggleSelectAll = (check: boolean) => {
    const updatedCdr: Record<string, boolean> = {};
    const updatedLoc: Record<string, boolean> = {};
    const updatedIdp: Record<string, boolean> = {};

    OPERATOR_ROWS.forEach(r => {
      updatedCdr[r.key] = check;
      if (r.hasLoc) updatedLoc[r.key] = check;
      if (r.hasIdp) updatedIdp[r.key] = check;
    });

    setSelectedCdr(updatedCdr);
    setSelectedLoc(updatedLoc);
    setSelectedIdp(updatedIdp);
  };

  const totalSelectedCount = useMemo(() => {
    let count = 0;
    OPERATOR_ROWS.forEach(r => {
      if (selectedCdr[r.key]) count++;
      if (r.hasLoc && selectedLoc[r.key]) count++;
      if (r.hasIdp && selectedIdp[r.key]) count++;
    });
    return count;
  }, [selectedCdr, selectedLoc, selectedIdp]);

  const all20SetChecked = batch20Options.cdr && batch20Options.loc && batch20Options.own && batch20Options.imei;
  const toggleAll20Set = () => {
    const next = !all20SetChecked;
    setBatch20Options({ cdr: next, loc: next, own: next, imei: next });
  };

  const handleGenerate20SetList = () => {
    const rawLines = rawInput.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
    const phones: string[] = [];
    const imeis: string[] = [];

    rawLines.forEach(l => {
      const digits = l.replace(/\D/g, "");
      if (digits.length === 15) {
        imeis.push(digits);
      } else if (digits.length >= 10) {
        phones.push(formatTo92(l));
      }
    });

    if (!batch20Options.cdr && !batch20Options.loc && !batch20Options.own && !batch20Options.imei) {
      toast.error("Please select at least one format (CDR, LOC, OWN, or IMEI).");
      return;
    }

    if (phones.length === 0 && imeis.length === 0) {
      toast.error("Please paste mobile numbers or IMEIs in the input box first.");
      return;
    }

    // Chunk in sets of 20 with blank line between sets
    const chunkIn20 = (lines: string[]) => {
      const chunks: string[] = [];
      for (let i = 0; i < lines.length; i += 20) {
        chunks.push(lines.slice(i, i + 20).join("\n"));
      }
      return chunks.join("\n\n");
    };

    const sections: string[] = [];
    let totalCount = 0;

    // 1. OWNERSHIP
    if (batch20Options.own && phones.length > 0) {
      const lines = phones.map(n => `${n} OWNERSHIP`);
      sections.push(chunkIn20(lines));
      totalCount += lines.length;
    }

    // 2. CDR
    if (batch20Options.cdr && phones.length > 0) {
      const lines = phones.map(n => `${n} CDR`);
      sections.push(chunkIn20(lines));
      totalCount += lines.length;
    }

    // 3. LOCATION
    if (batch20Options.loc && phones.length > 0) {
      const lines = phones.map(n => `${n} LOCATION`);
      sections.push(chunkIn20(lines));
      totalCount += lines.length;
    }

    // 4. IMEI / TRACKING
    if (batch20Options.imei && imeis.length > 0) {
      const lines = imeis.map(i => `${i} TRACKING`);
      sections.push(chunkIn20(lines));
      totalCount += lines.length;
    }

    const fullText = sections.join("\n\n");
    setCombinedOutput({
      title: "20-Set Batch Query List",
      text: fullText,
      html: `<pre class="font-mono text-slate-800 leading-relaxed text-[12px] p-4 bg-slate-50 rounded-xl border border-slate-100 select-text">${fullText}</pre>`,
      cdrCount: batch20Options.cdr ? phones.length : 0,
      locCount: batch20Options.loc ? phones.length : 0,
      idpCount: 0,
      totalNumbers: phones.length + imeis.length,
      numbers: [...phones, ...imeis],
    });
    setActiveViewTab("text");
    toast.success(`Generated 20-Set query list (${totalCount} queries in sets of 20)!`);
  };

  const handleCopy = async () => {
    if (!combinedOutput?.text) {
      toast.error("No output content to copy.");
      return;
    }

    try {
      if (combinedOutput.html && typeof ClipboardItem !== "undefined") {
        const textBlob = new Blob([combinedOutput.text], { type: "text/plain" });
        const htmlBlob = new Blob([combinedOutput.html], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob,
          })
        ]);
      } else {
        await navigator.clipboard.writeText(combinedOutput.text);
      }
      setCopied(true);
      toast.success("Complete CDR + IDP content copied (with table formatting)!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(combinedOutput.text);
      setCopied(true);
      toast.success("Complete CDR + IDP content copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!combinedOutput?.text) {
      toast.error("No output content to download.");
      return;
    }

    const allLines = combinedOutput.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    const msisdnLines = allLines.filter(l => l.startsWith("MSISDN|"));
    const imeiLines = allLines.filter(l => l.startsWith("IMEI|"));
    const otherLines = allLines.filter(l => 
      l.startsWith("TPN:") || 
      l.startsWith("PERIOD FROM") || 
      l.startsWith("A;") || 
      l.startsWith("I;") || 
      l.startsWith("TPS:") || 
      l.startsWith("LOC")
    );

    const downloadFile = (text: string, filename: string) => {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    let downloadedAny = false;

    // 1. Download MSISDN file if MSISDN| lines exist
    if (msisdnLines.length > 0) {
      const msisdnText = msisdnLines.join("\n");
      const isSingle = msisdnText.startsWith("MSISDN|All") || (!msisdnText.includes(":") && !msisdnText.includes("\n"));
      const filename = isSingle ? "MSISDN All.txt" : "MSISDN Both.txt";
      downloadFile(msisdnText, filename);
      toast.success(`Downloaded ${filename}`);
      downloadedAny = true;
    }

    // 2. Download IMEI file if IMEI| lines exist (in separate file)
    if (imeiLines.length > 0) {
      const imeiText = imeiLines.join("\n");
      const isSingle = imeiText.startsWith("IMEI|All") || (!imeiText.includes(":") && !imeiText.includes("\n"));
      const filename = isSingle ? "IMEI All.txt" : "IMEI Both.txt";

      if (downloadedAny) {
        setTimeout(() => {
          downloadFile(imeiText, filename);
          toast.success(`Downloaded ${filename}`);
        }, 350);
      } else {
        downloadFile(imeiText, filename);
        toast.success(`Downloaded ${filename}`);
        downloadedAny = true;
      }
    }

    // 3. Fallback for other formats if neither MSISDN| nor IMEI| lines were found
    if (!downloadedAny) {
      const fallbackText = otherLines.length > 0 ? otherLines.join("\n") : allLines.join("\n");
      downloadFile(fallbackText, "CDR_Request.txt");
      toast.success("Downloaded CDR_Request.txt");
    }
  };

  const getActiveNumbersToFill = (): string[] => {
    if (combinedOutput?.numbers && combinedOutput.numbers.length > 0) {
      return combinedOutput.numbers;
    }
    const rawLines = rawInput.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
    const nums: string[] = [];
    rawLines.forEach(l => {
      const d = l.replace(/\D/g, "");
      if (d.length === 15) {
        nums.push(d);
      } else if (d.length >= 10) {
        nums.push(formatTo92(l));
      }
    });
    return nums;
  };

  const handleDownloadDocx = async () => {
    const nums = getActiveNumbersToFill();
    if (nums.length === 0) {
      toast.error("Please enter/process mobile numbers or IMEIs first.");
      return;
    }

    try {
      setGeneratingDocx(true);
      toast.loading("Generating Performa Word Document (.docx)...", { id: "docx-gen" });
      const docxBlob = await generateFilledPerformaDocx(nums, {
        referenceDate: new Date(),
        periodDays: combinedOutput?.periodDays || 180,
      });
      const fileName = `Technical_Assistance_Performa_${formatDateDDMMYYYY(new Date())}.docx`;
      downloadDocxBlob(docxBlob, fileName);
      toast.dismiss("docx-gen");
      toast.success("Word Performa (.docx) with filled numbers & current date downloaded!");
    } catch (err: any) {
      console.error(err);
      toast.dismiss("docx-gen");
      toast.error("Failed to generate DOCX performa: " + (err?.message || "Unknown error"));
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handleDownloadDocxWithType = async (performaType: 1 | 2) => {
    const nums = getActiveNumbersToFill();
    if (nums.length === 0) { toast.error("Please enter/process numbers first."); return; }
    try {
      setGeneratingDocx(true);
      toast.loading(`Generating Performa ${performaType} Word Document...`, { id: "docx-gen" });
      const docxBlob = await generateFilledPerformaDocx(nums, { referenceDate: new Date(), performaType });
      const fileName = `Technical_Assistance_Performa${performaType}_${formatDateDDMMYYYY(new Date())}.docx`;
      downloadDocxBlob(docxBlob, fileName);
      toast.dismiss("docx-gen");
      toast.success(`Performa ${performaType} Word (.docx) downloaded!`);
    } catch (err: any) {
      toast.dismiss("docx-gen");
      toast.error("Failed: " + (err?.message || "Unknown error"));
    } finally { setGeneratingDocx(false); }
  };

  const handleDownloadPdf = async () => {
    const nums = getActiveNumbersToFill();
    if (nums.length === 0) { toast.error("Please enter/process numbers first."); return; }
    try {
      setGeneratingPdf(true);
      toast.loading("Generating PDF Performa...", { id: "pdf-gen" });
      const pdfBlob = await generateFilledPerformaPdf(nums, { referenceDate: new Date() });
      const fileName = `Technical_Assistance_Performa_${formatDateDDMMYYYY(new Date())}.pdf`;
      downloadPdfBlob(pdfBlob, fileName);
      toast.dismiss("pdf-gen");
      toast.success("PDF Performa downloaded!");
    } catch (err: any) {
      toast.dismiss("pdf-gen");
      toast.error("PDF failed: " + (err?.message || "Unknown error"));
    } finally { setGeneratingPdf(false); }
  };

  const handleEmail = async () => {
    if (!combinedOutput?.text) {
      toast.error("No output content to email.");
      return;
    }

    const isWeb = typeof window !== "undefined" && !window.location.protocol.includes("capacitor");
    let mailWindow: Window | null = null;
    if (isWeb) {
      // Synchronously open blank window to bypass popup blocker
      mailWindow = window.open("", "_blank");
    }

    const nums = getActiveNumbersToFill();
    const fileName = `Technical_Assistance_Performa_${formatDateDDMMYYYY(new Date())}.docx`;
    const emailSubject = "Official TECHNICAL ASSISTANCE REQUEST FORM";
    const recipientEmail = "diclandhi1@gmail.com";

    try {
      setGeneratingDocx(true);
      toast.loading("Performa docx generate ho raha hai...", { id: "email-docx" });
      
      const docxBlob = await generateFilledPerformaDocx(nums, {
        referenceDate: new Date(),
        periodDays: combinedOutput?.periodDays || 180,
      });

      toast.dismiss("email-docx");

      // Auto-copy Rich HTML table to clipboard so user can press Ctrl+V in Gmail for a 100% perfect table!
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          if (combinedOutput.html && typeof ClipboardItem !== "undefined") {
            const textBlob = new Blob([combinedOutput.text], { type: "text/plain" });
            const htmlBlob = new Blob([combinedOutput.html], { type: "text/html" });
            await navigator.clipboard.write([
              new ClipboardItem({
                "text/html": htmlBlob,
                "text/plain": textBlob,
              }),
            ]);
          } else {
            await navigator.clipboard.writeText(combinedOutput.text);
          }
        } catch {
          try { await navigator.clipboard.writeText(combinedOutput.text); } catch {}
        }
      }

      // In browser: download docx
      downloadDocxBlob(docxBlob, fileName);

      if (isWeb) {
        const encSubject = encodeURIComponent(emailSubject);
        const encBody = encodeURIComponent(combinedOutput.text.substring(0, 1800));
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(recipientEmail)}&su=${encSubject}&body=${encBody}`;

        if (mailWindow && !mailWindow.closed) {
          mailWindow.location.href = gmailUrl;
        } else {
          window.location.href = `mailto:${recipientEmail}?subject=${encSubject}&body=${encBody}`;
        }
        toast.success("Performa download ho gaya aur Gmail khul gaya hai!", { duration: 7000 });
      } else {
        // In native mobile app (Capacitor Android): Direct file attachment to Gmail app
        await shareOrAttachPerformaDocx(
          docxBlob,
          fileName,
          emailSubject,
          combinedOutput.text
        );
        toast.success("Performa document ready!");
      }
    } catch (err: any) {
      if (mailWindow && !mailWindow.closed) mailWindow.close();
      console.error(err);
      toast.dismiss("email-docx");
      toast.error("Error preparing document: " + (err?.message || "Unknown error"));
    } finally {
      setGeneratingDocx(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3 text-slate-900 pb-16">
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

      {/* 🔹 SUB-TOOL NAVIGATION SWITCHER */}
      <div className="bg-white border border-slate-200 p-1.5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveToolMode("cdr")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-tight transition-all",
              activeToolMode === "cdr"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <FileText size={14} />
            CDR & IDP Formats
          </button>
          <button
            onClick={() => setActiveToolMode("merger")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-tight transition-all",
              activeToolMode === "merger"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <FileSpreadsheet size={14} />
            Multi-Excel Merger
            <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">
              Location & Ownership
            </span>
          </button>
        </div>

        {activeToolMode === "cdr" ? (
          <p className="text-[10px] text-slate-400 font-medium px-2 hidden sm:block">
            Generate formal CDR & IDP Performa documents
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 font-medium px-2 hidden sm:block">
            Consolidate multiple small Excel files into unified Notepad & Excel
          </p>
        )}
      </div>

      {activeToolMode === "merger" ? (
        <ExcelDataMerger
          onExportNumbersToGenerator={(numbers) => {
            setRawInput(prev => {
              const existing = prev ? prev.trim() + "\n" : "";
              return existing + numbers.join("\n");
            });
            setActiveToolMode("cdr");
            toast.success(`${numbers.length} numbers transferred to CDR Generator!`);
          }}
        />
      ) : (
        <>
      {/* 🔹 TOP SECTION: ULTRA-COMPACT 3 BALANCED COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Column 1: Input Area (4 Cols) */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[340px]">
            <CardHeader className="bg-slate-50/80 border-b py-1.5 px-3 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <Smartphone size={13} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-600 tracking-tight">Numbers / IMEIs</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    {sessionInfo.isSuper ? (
                        <>
                            <div className={cn(
                                "flex items-center gap-1 border px-1.5 py-0.5 rounded-lg transition-all",
                                liveApi === "ding" ? "bg-indigo-50 border-indigo-200 shadow-2xs" : "bg-white border-slate-200"
                            )} title="Ding Live Network Lookup">
                                <span className={cn(
                                    "text-[8px] font-black uppercase",
                                    liveApi === "ding" ? "text-indigo-600" : "text-slate-500"
                                )}>Ding</span>
                                <Switch 
                                    checked={liveApi === "ding"} 
                                    onCheckedChange={(checked) => setLiveApi(checked ? "ding" : "none")} 
                                    className="h-3.5 w-7 data-[state=checked]:bg-indigo-600 scale-75 origin-right" 
                                />
                            </div>

                            <div className={cn(
                                "flex items-center gap-1 border px-1.5 py-0.5 rounded-lg transition-all",
                                liveApi === "checksim" ? "bg-indigo-50 border-indigo-200 shadow-2xs" : "bg-white border-slate-200"
                            )} title="Checksim Live API Lookup (Super Admin Only)">
                                <span className={cn(
                                    "text-[8px] font-black uppercase",
                                    liveApi === "checksim" ? "text-indigo-600" : "text-slate-500"
                                )}>Checksim</span>
                                <Switch 
                                    checked={liveApi === "checksim"} 
                                    onCheckedChange={(checked) => setLiveApi(checked ? "checksim" : "none")} 
                                    className="h-3.5 w-7 data-[state=checked]:bg-indigo-600 scale-75 origin-right" 
                                />
                            </div>
                        </>
                    ) : (
                        <div className={cn(
                            "flex items-center gap-1.5 border px-1.5 py-0.5 rounded-lg transition-all",
                            liveApi === "ding" ? "bg-indigo-50 border-indigo-200 shadow-2xs" : "bg-white border-slate-200"
                        )} title="Ding Live Network Lookup">
                            <span className={cn(
                                "text-[8px] font-black uppercase",
                                liveApi === "ding" ? "text-indigo-600" : "text-slate-500"
                            )}>Ding Live</span>
                            <Switch 
                                checked={liveApi === "ding"} 
                                onCheckedChange={(checked) => setLiveApi(checked ? "ding" : "none")} 
                                className="h-3.5 w-7 data-[state=checked]:bg-indigo-600 scale-75 origin-right" 
                            />
                        </div>
                    )}
                    
                    <button 
                        onClick={() => { setRawInput(""); setAnalyzedNumbers([]); setCombinedOutput(null); setSelectedTemplate(""); }}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Clear Input"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-2 space-y-2 flex flex-col flex-1 overflow-hidden">
                <Textarea 
                    value={rawInput} 
                    onChange={(e) => setRawInput(e.target.value)} 
                    onBlur={handleAutoFormat}
                    placeholder="Paste numbers (03001234567...) or 15-digit IMEIs..."
                    className="flex-1 rounded-xl border-slate-200 font-mono text-[10px] leading-tight focus:ring-orange-500 bg-slate-50/20 resize-none p-2"
                />
                <Button 
                    onClick={handleLookup} 
                    disabled={loadingLookup}
                    className={cn(
                        "w-full h-8 rounded-xl font-black uppercase tracking-tight text-[10px] shadow transition-all shrink-0",
                        liveApi !== "none" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-orange-600 hover:bg-orange-700"
                    )}
                >
                    {loadingLookup ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5"/> : <ShieldCheck size={14} className="mr-1.5" />}
                    {liveApi === "checksim" 
                        ? "Live Identify (Checksim Live)" 
                        : liveApi === "ding"
                        ? "Live Identify (Ding Live)"
                        : "Identify Operators"}
                </Button>
            </CardContent>
        </Card>

        {/* Column 2: Operator Results (4 Cols) */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[340px]">
            <CardHeader className="bg-slate-50/80 border-b py-1.5 px-3 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <Database size={13} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-600 tracking-tight">Operator Results</CardTitle>
                </div>
                {(isProcessing || analyzedNumbers.length > 0) && (
                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
                        {analyzedNumbers.length} Found
                    </span>
                )}
            </CardHeader>
            <CardContent className="p-2 flex-1 overflow-hidden flex flex-col gap-1.5">
                {isProcessing && (
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden shrink-0">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                )}

                {analyzedNumbers.length > 0 ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {analyzedNumbers.map((a, i) => (
                                <div key={i} className="flex items-center justify-between px-2 py-1 bg-slate-50/80 rounded-lg border border-slate-100 text-[10px]">
                                    <span className="font-mono font-bold text-slate-700 truncate">{a.number}</span>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0",
                                        a.operator === "Unknown" || a.operator === "Not Found" || a.operator === "Error"
                                            ? "bg-slate-100 text-slate-400 border-slate-200" 
                                            : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                    )}>
                                        {a.operator}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !isProcessing ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-1">
                        <Search size={24} />
                        <p className="text-[9px] font-bold uppercase">No Operators Yet</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 gap-1">
                        <Loader2 className="animate-spin" size={24} />
                        <p className="text-[9px] font-bold uppercase">Identifying...</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Column 3: Formats (Vertical 20-Set Checkboxes / Operator Rows) (4 Cols) */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col h-[340px]">
            <CardHeader className="bg-slate-50/80 border-b py-1.5 px-3 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <LayoutGrid size={13} className="text-slate-500" />
                    <CardTitle className="text-[10px] font-black uppercase text-slate-600 tracking-tight">Available Formats</CardTitle>
                </div>

                {/* View switcher between 20-Set Query and Operators */}
                <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[8px] font-black uppercase">
                    <button
                        onClick={() => setFormatViewMode("20set")}
                        className={cn(
                            "px-2 py-0.5 rounded transition-all flex items-center gap-1",
                            formatViewMode === "20set" ? "bg-white text-indigo-700 shadow-2xs font-black" : "text-slate-500 hover:text-slate-800"
                        )}
                        title="Vertical 20-Set Query List (CDR, LOC, OWN, IMEI)"
                    >
                        <Zap size={9} className="fill-indigo-600 text-indigo-600" />
                        20-Set
                    </button>
                    <button
                        onClick={() => setFormatViewMode("operators")}
                        className={cn(
                            "px-2 py-0.5 rounded transition-all",
                            formatViewMode === "operators" ? "bg-white text-indigo-700 shadow-2xs font-black" : "text-slate-500 hover:text-slate-800"
                        )}
                        title="Operator Performa Documents"
                    >
                        Performa
                    </button>
                </div>
            </CardHeader>
            
            <CardContent className="p-2 flex-1 overflow-hidden flex flex-col gap-1.5">
                {formatViewMode === "20set" ? (
                    <>
                        {/* 📋 VERTICAL 20-SET CHECKBOXES */}
                        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                            {/* Check All */}
                            <div
                                onClick={toggleAll20Set}
                                className={cn(
                                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none",
                                    all20SetChecked
                                        ? "border-indigo-300 bg-indigo-50/60 shadow-2xs"
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Checkbox 
                                        id="chk-20set-all"
                                        checked={all20SetChecked}
                                        onCheckedChange={toggleAll20Set}
                                        className="h-3.5 w-3.5 rounded data-[state=checked]:bg-indigo-600 border-slate-300 shrink-0"
                                    />
                                    <label htmlFor="chk-20set-all" className="cursor-pointer text-[10px] font-black uppercase text-slate-800">
                                        Check All (All Formats)
                                    </label>
                                </div>
                                <span className="text-[8px] font-bold text-indigo-600 uppercase">
                                    {all20SetChecked ? "All Selected" : "Select All"}
                                </span>
                            </div>

                            {/* 1. CDR */}
                            <div
                                onClick={() => setBatch20Options(p => ({ ...p, cdr: !p.cdr }))}
                                className={cn(
                                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none",
                                    batch20Options.cdr
                                        ? "border-indigo-300 bg-white shadow-2xs"
                                        : "border-slate-100 bg-slate-50/50 hover:bg-white"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Checkbox 
                                        id="chk-20set-cdr"
                                        checked={batch20Options.cdr}
                                        onCheckedChange={(c) => setBatch20Options(p => ({ ...p, cdr: !!c }))}
                                        className="h-3.5 w-3.5 rounded data-[state=checked]:bg-indigo-600 border-slate-300 shrink-0"
                                    />
                                    <div>
                                        <label htmlFor="chk-20set-cdr" className="cursor-pointer text-[10px] font-black uppercase text-slate-800 block leading-tight">
                                            CDR
                                        </label>
                                        <span className="text-[8px] font-mono text-slate-400">
                                            92xxxxxxxxxx CDR
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                                    20 / set
                                </span>
                            </div>

                            {/* 2. LOC */}
                            <div
                                onClick={() => setBatch20Options(p => ({ ...p, loc: !p.loc }))}
                                className={cn(
                                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none",
                                    batch20Options.loc
                                        ? "border-emerald-300 bg-white shadow-2xs"
                                        : "border-slate-100 bg-slate-50/50 hover:bg-white"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Checkbox 
                                        id="chk-20set-loc"
                                        checked={batch20Options.loc}
                                        onCheckedChange={(c) => setBatch20Options(p => ({ ...p, loc: !!c }))}
                                        className="h-3.5 w-3.5 rounded data-[state=checked]:bg-emerald-600 border-slate-300 shrink-0"
                                    />
                                    <div>
                                        <label htmlFor="chk-20set-loc" className="cursor-pointer text-[10px] font-black uppercase text-slate-800 block leading-tight">
                                            LOC
                                        </label>
                                        <span className="text-[8px] font-mono text-slate-400">
                                            92xxxxxxxxxx LOCATION
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                                    20 / set
                                </span>
                            </div>

                            {/* 3. OWN */}
                            <div
                                onClick={() => setBatch20Options(p => ({ ...p, own: !p.own }))}
                                className={cn(
                                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none",
                                    batch20Options.own
                                        ? "border-amber-300 bg-white shadow-2xs"
                                        : "border-slate-100 bg-slate-50/50 hover:bg-white"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Checkbox 
                                        id="chk-20set-own"
                                        checked={batch20Options.own}
                                        onCheckedChange={(c) => setBatch20Options(p => ({ ...p, own: !!c }))}
                                        className="h-3.5 w-3.5 rounded data-[state=checked]:bg-amber-600 border-slate-300 shrink-0"
                                    />
                                    <div>
                                        <label htmlFor="chk-20set-own" className="cursor-pointer text-[10px] font-black uppercase text-slate-800 block leading-tight">
                                            OWN
                                        </label>
                                        <span className="text-[8px] font-mono text-slate-400">
                                            92xxxxxxxxxx OWNERSHIP
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                                    20 / set
                                </span>
                            </div>

                            {/* 4. IMEI */}
                            <div
                                onClick={() => setBatch20Options(p => ({ ...p, imei: !p.imei }))}
                                className={cn(
                                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none",
                                    batch20Options.imei
                                        ? "border-purple-300 bg-white shadow-2xs"
                                        : "border-slate-100 bg-slate-50/50 hover:bg-white"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Checkbox 
                                        id="chk-20set-imei"
                                        checked={batch20Options.imei}
                                        onCheckedChange={(c) => setBatch20Options(p => ({ ...p, imei: !!c }))}
                                        className="h-3.5 w-3.5 rounded data-[state=checked]:bg-purple-600 border-slate-300 shrink-0"
                                    />
                                    <div>
                                        <label htmlFor="chk-20set-imei" className="cursor-pointer text-[10px] font-black uppercase text-slate-800 block leading-tight">
                                            IMEI
                                        </label>
                                        <span className="text-[8px] font-mono text-slate-400">
                                            xxxxxxxxxxxxxxx TRACKING
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono bg-purple-50 text-purple-700 border border-purple-100 shrink-0">
                                    20 / set
                                </span>
                            </div>
                        </div>

                        {/* 🚀 Action Button */}
                        <Button 
                            onClick={handleGenerate20SetList}
                            className="w-full h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-tight text-[10px] shadow-sm shrink-0 mt-auto"
                        >
                            <Zap size={12} className="mr-1 fill-white" />
                            Build 20-Set Query Output
                        </Button>
                    </>
                ) : (
                    <>
                        {/* 📋 Single Row per Operator with CDR Checkbox, Count, Date Filter & IDP Checkbox */}
                        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                            {OPERATOR_ROWS.map((row) => {
                                const count = operatorCounts[row.key as keyof typeof operatorCounts] || 0;
                                const isCdrChecked = !!selectedCdr[row.key];
                                const isLocChecked = !!selectedLoc[row.key];
                                const isIdpChecked = !!selectedIdp[row.key];
                                const durationConfig = formatDurations[row.key] || DEFAULT_DURATIONS[row.key] || { preset: "6m", customDays: 180 };

                                return (
                                    <div
                                        key={row.key}
                                        className={cn(
                                            "flex items-center justify-between px-2 py-1 rounded-xl border transition-all gap-1.5",
                                            isCdrChecked || isLocChecked || isIdpChecked
                                                ? "border-indigo-200 bg-white shadow-xs" 
                                                : "border-slate-100 bg-slate-50/50 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        {/* Left: CDR Checkbox + Operator Name */}
                                        <div className="flex items-center gap-1.5 min-w-[72px] flex-1">
                                            <Checkbox 
                                                id={`chk-cdr-${row.key}`}
                                                checked={isCdrChecked} 
                                                onCheckedChange={(c) => setSelectedCdr(prev => ({ ...prev, [row.key]: !!c }))}
                                                className="h-3.5 w-3.5 rounded data-[state=checked]:bg-indigo-600 border-slate-300 shrink-0"
                                            />
                                            <label htmlFor={`chk-cdr-${row.key}`} className="cursor-pointer text-[10px] font-black uppercase text-slate-800 truncate select-none">
                                                {row.name.replace(" / Warid", "").replace(" All Networks", "")}
                                            </label>
                                        </div>

                                        {/* Count Badge */}
                                        <span className={cn(
                                            "text-[9px] font-black px-1.5 py-0.2 rounded font-mono shrink-0",
                                            count > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {count}
                                        </span>

                                        {/* Date Dropdown for CDR */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <div className="w-[74px]">
                                                <Select 
                                                    value={durationConfig.preset} 
                                                    onValueChange={(val: CdrDurationPreset) => handleDurationPresetChange(row.key, val)}
                                                >
                                                    <SelectTrigger className="h-6 text-[9px] font-bold uppercase rounded-lg border-slate-200 bg-slate-50 px-1 py-0">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="3m" className="text-[9px] uppercase font-bold">3M</SelectItem>
                                                        <SelectItem value="6m" className="text-[9px] uppercase font-bold">6M</SelectItem>
                                                        <SelectItem value="9m" className="text-[9px] uppercase font-bold">9M</SelectItem>
                                                        <SelectItem value="1y" className="text-[9px] uppercase font-bold">1Y</SelectItem>
                                                        <SelectItem value="custom" className="text-[9px] uppercase font-bold text-orange-600">Custom</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Input
                                                  type="number"
                                                  min={1}
                                                  max={3650}
                                                  value={durationConfig.customDays}
                                                  onChange={(e) => handleCustomDaysChange(row.key, parseInt(e.target.value) || 0)}
                                                  className={cn(
                                                      "h-6 text-[9px] font-mono font-bold px-1 py-0 rounded border-orange-300 bg-orange-50/50 text-center",
                                                      "transition-all duration-500 ease-out overflow-hidden origin-right",
                                                      durationConfig.preset === "custom"
                                                          ? "w-12 opacity-100 scale-100 ml-1"
                                                          : "w-0 opacity-0 scale-90 ml-0 px-0 pointer-events-none border-0"
                                                  )}
                                                  placeholder="d"
                                                  tabIndex={durationConfig.preset !== "custom" ? -1 : 0}
                                              />
                                        </div>

                                        {/* LOC Checkbox in the same row */}
                                        {row.hasLoc ? (
                                            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-lg shrink-0">
                                                <Checkbox 
                                                    id={`chk-loc-${row.key}`}
                                                    checked={isLocChecked} 
                                                    onCheckedChange={(c) => setSelectedLoc(prev => ({ ...prev, [row.key]: !!c }))}
                                                    className="h-3 w-3 rounded data-[state=checked]:bg-emerald-600 border-slate-300"
                                                />
                                                <label htmlFor={`chk-loc-${row.key}`} className="cursor-pointer text-[8px] font-black uppercase text-emerald-700 select-none">
                                                    LOC
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="w-[42px] shrink-0"></div>
                                        )}

                                        {/* IDP Checkbox in the same row */}
                                        {row.hasIdp ? (
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-lg shrink-0">
                                                <Checkbox 
                                                    id={`chk-idp-${row.key}`}
                                                    checked={isIdpChecked} 
                                                    onCheckedChange={(c) => setSelectedIdp(prev => ({ ...prev, [row.key]: !!c }))}
                                                    className="h-3 w-3 rounded data-[state=checked]:bg-purple-600 border-slate-300"
                                                />
                                                <label htmlFor={`chk-idp-${row.key}`} className="cursor-pointer text-[8px] font-black uppercase text-purple-700 select-none">
                                                    IDP
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="w-[42px] shrink-0"></div>
                                        )}

                                        {/* Quick Play Button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleGenerateSingleRow(row)}
                                            className="h-6 w-6 p-0 rounded-lg text-indigo-600 hover:bg-indigo-50 shrink-0"
                                            title={`Generate ${row.name}`}
                                        >
                                            <Play size={10} className="fill-indigo-600" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 🚀 Compact Batch Action Button */}
                        <Button 
                            onClick={handleGenerateSelected}
                            className="w-full h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-tight text-[10px] shadow-sm shrink-0 mt-auto"
                        >
                            <Zap size={12} className="mr-1 fill-white" />
                            Build Unified Document ({totalSelectedCount})
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
      </div>

      {/* 🔹 BOTTOM SECTION: SINGLE COMBINED PREVIEW DOCUMENT (CDR ON TOP + IMEI (IF 15 DIGITS) + IDP DIRECTLY BELOW) */}
      <Card className="border-slate-200 rounded-2xl overflow-hidden shadow-xl flex flex-col bg-white min-h-[600px]">
          <div className="bg-white border-b border-slate-100 py-2.5 px-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Eye size={16} />
                  </div>
                  <div>
                      <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">Unified Document Output</CardTitle>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                        {combinedOutput 
                          ? `${combinedOutput.cdrCount} CDR Format(s) + ${combinedOutput.idpCount} IDP Format(s) in One Master Document`
                          : "Awaiting generation"}
                      </p>
                  </div>
              </div>

              {/* Action Buttons: Tab View, Copy All, Send Email */}
              {combinedOutput && (
                  <div className="flex items-center gap-2">
                      <div className="flex bg-slate-200/50 p-0.5 rounded-xl text-[9px] font-black uppercase">
                          <button
                            onClick={() => setActiveViewTab("rendered")}
                            className={`px-2 py-1 rounded-lg transition-all ${
                              activeViewTab === "rendered" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                            }`}
                          >
                            Document
                          </button>
                          <button
                            onClick={() => setActiveViewTab("text")}
                            className={`px-2 py-1 rounded-lg transition-all ${
                              activeViewTab === "text" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                            }`}
                          >
                            Plain Text
                          </button>
                          <button
                            onClick={() => setActiveViewTab("html")}
                            className={`px-2 py-1 rounded-lg transition-all ${
                              activeViewTab === "html" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                            }`}
                          >
                            HTML
                          </button>
                      </div>

                      <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all gap-1.5 px-3 bg-white"
                      >
                        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-500" />}
                        {copied ? "Copied All" : "Copy All"}
                      </Button>

                      <Button
                        onClick={handleDownloadTxt}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-[10px] font-black uppercase border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 transition-all gap-1.5 px-3"
                        title="Download .txt file"
                      >
                        <FileText size={12} className="text-emerald-600" />
                        Download TXT
                      </Button>

                      {/* Performa Toggle + Download Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-slate-400">Performa:</span>

                        {/* P-1 Toggle */}
                        <button
                          type="button"
                          onClick={() => setSelectedPerforma(prev => ({ ...prev, p1: !prev.p1 }))}
                          className={`h-6 px-2.5 rounded-full text-[9px] font-black uppercase transition-all border ${
                            selectedPerforma.p1
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-400"
                          }`}
                          title="Toggle Performa 1"
                        >
                          P-1
                        </button>

                        {/* P-2 Toggle */}
                        <button
                          type="button"
                          onClick={() => setSelectedPerforma(prev => ({ ...prev, p2: !prev.p2 }))}
                          className={`h-6 px-2.5 rounded-full text-[9px] font-black uppercase transition-all border ${
                            selectedPerforma.p2
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-400"
                          }`}
                          title="Toggle Performa 2"
                        >
                          P-2
                        </button>

                        {selectedPerforma.p1 && (
                          <Button
                            onClick={() => handleDownloadDocxWithType(1)}
                            disabled={generatingDocx}
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl text-[10px] font-black uppercase border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all gap-1.5 px-3"
                            title="Download Performa 1 Word (.docx)"
                          >
                            {generatingDocx ? <Loader2 size={12} className="animate-spin text-blue-600" /> : <FileDown size={12} className="text-blue-600" />}
                            P-1 Word
                          </Button>
                        )}

                        {selectedPerforma.p2 && (
                          <Button
                            onClick={() => handleDownloadDocxWithType(2)}
                            disabled={generatingDocx}
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl text-[10px] font-black uppercase border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-all gap-1.5 px-3"
                            title="Download Performa 2 Word (.docx)"
                          >
                            {generatingDocx ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : <FileDown size={12} className="text-indigo-600" />}
                            P-2 Word
                          </Button>
                        )}

                        <Button
                          onClick={handleDownloadPdf}
                          disabled={generatingPdf}
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-[10px] font-black uppercase border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 hover:border-rose-400 transition-all gap-1.5 px-3"
                          title="Download PDF Performa"
                        >
                          {generatingPdf ? <Loader2 size={12} className="animate-spin text-rose-600" /> : <FileDown size={12} className="text-rose-600" />}
                          PDF
                        </Button>
                      </div>

                      <Button
                        onClick={handleEmail}
                        disabled={generatingDocx}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all gap-1.5 px-3 bg-white"
                      >
                        {generatingDocx ? (
                          <Loader2 size={12} className="animate-spin text-indigo-600" />
                        ) : (
                          <Mail size={12} className="text-slate-500 hover:text-indigo-600" />
                        )}
                        Send via Email
                      </Button>
                  </div>
              )}
          </div>
          
          <div className="flex-1 bg-slate-100/50 overflow-auto custom-scrollbar p-6">
              {combinedOutput ? (
                  <div className="w-[900px] min-h-[550px] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.06)] rounded-2xl border border-slate-200 overflow-hidden mx-auto p-8 font-mono text-[13px] leading-relaxed text-slate-800 select-text">
                      {activeViewTab === "rendered" && (
                        <div
                          className="prose max-w-none text-slate-900 font-mono tracking-tight"
                          dangerouslySetInnerHTML={{ __html: combinedOutput.html }}
                        />
                      )}

                      {activeViewTab === "text" && (
                        <pre className="whitespace-pre-wrap font-mono text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {combinedOutput.text}
                        </pre>
                      )}

                      {activeViewTab === "html" && (
                        <pre className="whitespace-pre-wrap font-mono text-[11px] text-emerald-400 bg-slate-900 p-4 rounded-xl border border-slate-800">
                          {combinedOutput.html}
                        </pre>
                      )}
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center p-16 text-center opacity-30 gap-4">
                      <div className="p-6 bg-slate-200 rounded-full animate-pulse">
                        <Zap size={48} className="text-slate-400" />
                      </div>
                      <div className="space-y-1">
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Awaiting Command</h3>
                          <p className="text-[10px] font-bold uppercase">Select desired CDR and IDP checkboxes in the operator rows and click 'Build Unified Document'</p>
                      </div>
                  </div>
              )}
          </div>
      </Card>
        </>
      )}
    </div>
  );
}
