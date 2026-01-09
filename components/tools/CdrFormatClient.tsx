"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, Play, Eye, Search, Filter, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = [
  { name: "Jazz CDR 6 Month", file: "jazz cdr 6 MONTH.html", operatorKey: "Jazz" },
  { name: "Telenor CDR 6 Month", file: "Telenor 6 month cdr.html", operatorKey: "Telenor" },
  { name: "Zong CDR 6 Month", file: "zong cdr 6 MONTH.html", operatorKey: "Zong" },
  { name: "Ufone Single CDR 1 Year", file: "ufone single cdr 1 year.html", operatorKey: "Ufone" },
  { name: "Ufone Multi CDR 1 Year", file: "ufone 2 or more cdr 1 year.html", operatorKey: "Ufone" },
  { name: "IMEI Format 3 Month", file: "imei format 3 month.html", operatorKey: "All" },
  { name: "IMEI Format 6 Month", file: "imei format 6 month.html", operatorKey: "All" },
];

export default function CdrFormatClient() {
  // Step 1: Input
  const [rawInput, setRawInput] = useState("");
  const [loadingLookup, setLoadingLookup] = useState(false);
  
  // Step 2: Data
  const [analyzedNumbers, setAnalyzedNumbers] = useState<{ number: string, operator: string }[]>([]);
  
  // Step 3: Generation
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // --- HANDLER: Identify Operators ---
  const handleLookup = async () => {
    const numbers = rawInput.split("\n").map(n => n.trim()).filter(n => n);
    if (numbers.length === 0) {
      toast.error("Please enter numbers first.");
      return;
    }

    setLoadingLookup(true);
    setAnalyzedNumbers([]); // Clear previous
    setPreviewHtml(null);

    try {
        const res = await fetch("/api/tools/pta-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numbers }),
        });

        if (!res.ok) throw new Error("Lookup failed");

        // The API returns Excel binary but also 'X-Results' header with JSON data
        const meta = res.headers.get("X-Results");
        if (meta) {
            setAnalyzedNumbers(JSON.parse(meta));
            toast.success("Operators identified successfully!");
        } else {
            toast.error("No data received from lookup.");
        }
    } catch (error) {
        toast.error("Failed to identify operators.");
    } finally {
        setLoadingLookup(false);
    }
  };

  // --- HANDLER: Generate HTML ---
  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    const templateConfig = TEMPLATES.find(t => t.file === selectedTemplate);
    if (!templateConfig) return;

    // Filter Numbers based on Template
    let numbersToInject: string[] = [];
    
    if (templateConfig.operatorKey === "All") {
        // For IMEI/All, use all numbers entered
        numbersToInject = analyzedNumbers.length > 0 
            ? analyzedNumbers.map(a => a.number) 
            : rawInput.split("\n").map(n => n.trim()).filter(n => n);
    } else {
        // For specific operators, filter from analyzed results
        if (analyzedNumbers.length === 0) {
            toast.warning("Please 'Identify Operators' first to filter correctly.");
            return;
        }
        numbersToInject = analyzedNumbers
            .filter(a => a.operator.toLowerCase().includes(templateConfig.operatorKey.toLowerCase()))
            .map(a => a.number);
        
        if (numbersToInject.length === 0) {
            toast.warning(`No ${templateConfig.operatorKey} numbers found in the list.`);
            return;
        }
    }

    try {
      const res = await fetch(`/templates/cdr/${selectedTemplate}`);
      if (!res.ok) throw new Error("Failed to load template");
      
      let html = await res.text();
      const regex = /(<textarea[^>]*id=["']formatinput["'][^>]*>)([\s\S]*?)(<\/textarea>)/i;
      
      const payload = numbersToInject.join("\n");

      if (!regex.test(html)) {
          toast.warning("Template structure mismatch. Attempting generic injection.");
      }

      const injectedHtml = html.replace(regex, (match, start, content, end) => {
          return `${start}${payload}${end}`;
      });

      const script = `
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                if (typeof changeFormat === 'function') {
                    changeFormat();
                }
            }, 500);
          });
        </script>
      `;
      
      setPreviewHtml(injectedHtml + script);
      toast.success(`Generated for ${numbersToInject.length} numbers!`);

    } catch (err) {
      toast.error("Error loading template");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-orange-100 text-orange-700 rounded-xl">
           <FileCode size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">CDR Generator</h1>
           <p className="text-slate-500">Identify operators and generate official CDR requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input & Analysis */}
        <div className="lg:col-span-4 space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Search size={16}/> Step 1: Input Data
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea 
                        value={rawInput} 
                        onChange={(e) => setRawInput(e.target.value)} 
                        placeholder="Enter Phone Numbers (0300...)"
                        className="min-h-[150px] font-mono text-sm"
                    />
                    <Button 
                        onClick={handleLookup} 
                        disabled={loadingLookup}
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                    >
                        {loadingLookup ? <Loader2 className="mr-2 animate-spin"/> : <ShieldCheck className="mr-2" size={16}/>} 
                        Identify Operators
                    </Button>
                </CardContent>
            </Card>

            {analyzedNumbers.length > 0 && (
                <Card className="max-h-[400px] overflow-hidden flex flex-col">
                    <CardHeader className="py-3 bg-slate-50 border-b">
                        <CardTitle className="text-xs font-bold uppercase text-slate-500">Identified Numbers</CardTitle>
                    </CardHeader>
                    <div className="overflow-y-auto p-0 flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2 h-8 text-xs">Number</TableHead>
                                    <TableHead className="py-2 h-8 text-xs">Operator</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyzedNumbers.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="py-1.5 text-xs font-mono">{r.number}</TableCell>
                                        <TableCell className="py-1.5 text-xs font-bold text-blue-600">{r.operator}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}
        </div>

        {/* RIGHT COLUMN: Generation & Preview */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            <Card>
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800">
                        <Filter size={16}/> Step 2: Generate Format
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select CDR Template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATES.map(t => (
                                        <SelectItem key={t.file} value={t.file}>
                                            {t.name} {t.operatorKey !== "All" && `(${t.operatorKey} Only)`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleGenerate} className="h-11 px-8 bg-orange-600 hover:bg-orange-700 font-bold">
                            <Play size={18} className="mr-2" /> Generate
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="flex-1 min-h-[500px] flex flex-col overflow-hidden border-orange-100 shadow-md">
                <CardHeader className="bg-orange-50/50 border-b py-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800">
                        <Eye size={16} /> Live Template Preview
                    </CardTitle>
                </CardHeader>
                <div className="flex-1 bg-white relative">
                    {previewHtml ? (
                        <iframe 
                            srcDoc={previewHtml}
                            className="w-full h-full border-0 absolute inset-0"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                            <FileCode size={48} className="mb-4 opacity-20" />
                            <p>Select a template to view the generated request.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}