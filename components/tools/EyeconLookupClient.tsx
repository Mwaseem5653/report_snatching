"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Copy, 
  RotateCcw, 
  Eye, 
  Loader2, 
  User, 
  ExternalLink,
  Facebook, 
  Image as ImageIcon,
  CheckCircle2,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EyeconResult {
  number: string;
  name: string;
  image: string;
  facebook: string;
}

export default function EyeconLookupClient() {
  const [inputNumbers, setInputNumbers] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EyeconResult[]>([]);

  const handleLookup = async () => {
    const numbers = inputNumbers
      .split(/[\n,]/)
      .map(n => n.trim().replace(/\D/g, ""))
      .filter(n => n.length >= 10);

    if (numbers.length === 0) {
      toast.error("Please enter at least one valid mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tools/lookup/eyecon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers }),
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        toast.success(`Lookup complete. Found ${data.results.length} results.`);
      } else {
        toast.error(data.error || "Lookup failed");
      }
    } catch (err) {
      toast.error("An error occurred during lookup");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    const text = results.map(r => `${r.number}\t${r.name}\t${r.image}\t${r.facebook}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("All data copied (Excel format)");
  };

  const handleReset = () => {
    setInputNumbers("");
    setResults([]);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 overflow-hidden">
      {/* 🔹 HEADER AREA (Fixed height) */}
      <div className="shrink-0 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                <Eye size={24} />
            </div>
            <div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">Identity Identifier</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bulk Investigation Suite</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="rounded-xl font-bold text-slate-500 border-slate-200 h-9 text-xs">
                <RotateCcw size={14} className="mr-2" /> Reset
            </Button>
            <Button onClick={handleLookup} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg h-9 px-6 text-xs transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : <Search size={14} className="mr-2" />} 
                {loading ? "SEARCHING..." : "START LOOKUP"}
            </Button>
        </div>
      </div>

      {/* 🔹 MAIN CONTENT GRID (Fills remaining height) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        
        {/* 🔹 INPUT SECTION */}
        <Card className="lg:col-span-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
          <CardHeader className="bg-slate-50 border-b p-3 shrink-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
              <Plus size={12} className="text-blue-600" /> Target Numbers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col gap-3 min-h-0">
            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 shrink-0">
                <p className="text-[9px] text-blue-700 font-bold uppercase tracking-tight leading-none">
                    Enter numbers (Line by line)
                </p>
            </div>
            <Textarea 
                value={inputNumbers}
                onChange={(e) => setInputNumbers(e.target.value)}
                placeholder="03001234567&#10;03129876543"
                className="flex-1 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs p-3 focus:bg-white transition-all resize-none custom-scrollbar outline-none focus-visible:ring-1 focus-visible:ring-blue-500 shadow-inner"
            />
          </CardContent>
        </Card>

        {/* 🔹 RESULTS TABLE SECTION */}
        <Card className="lg:col-span-3 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
          <CardHeader className="bg-slate-50 border-b p-3 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <CardTitle className="text-[10px] font-black uppercase text-slate-500">Live Investigation Results</CardTitle>
            </div>
            <Button onClick={handleCopyAll} disabled={results.length === 0} size="sm" variant="outline" className="text-emerald-600 border-emerald-100 hover:bg-emerald-50 rounded-lg h-7 font-black text-[9px] uppercase">
              <Copy size={12} className="mr-1" /> Copy Table Data
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar">
                {results.length > 0 ? (
                    <Table>
                        <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <TableRow className="hover:bg-transparent border-slate-200 h-8">
                                <TableHead className="w-10 text-center text-[9px] font-black uppercase text-slate-400">#</TableHead>
                                <TableHead className="w-28 text-[9px] font-black uppercase text-slate-400">Number</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400">Identified Names</TableHead>
                                <TableHead className="w-28 text-[9px] font-black uppercase text-slate-400">Image</TableHead>
                                <TableHead className="w-28 text-[9px] font-black uppercase text-slate-400">Social</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.map((res, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50 group transition-colors h-9">
                                    <TableCell className="text-center font-mono text-[9px] text-slate-300 border-r border-slate-50 p-2">{idx + 1}</TableCell>
                                    <TableCell className="font-black text-blue-600 text-[11px] tabular-nums border-r border-slate-50 p-2">{res.number}</TableCell>
                                    <TableCell className="p-2">
                                        <div className="flex flex-wrap gap-1">
                                            {res.name.split("|").map((name, i) => (
                                                <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold text-slate-600 border border-slate-200">
                                                    {name.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-l border-slate-50 p-2">
                                        {res.image ? (
                                            <a 
                                                href={res.image} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center justify-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold text-[9px] uppercase bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                            >
                                                <ImageIcon size={10} /> Photo
                                            </a>
                                        ) : (
                                            <span className="text-[9px] text-slate-300 font-bold uppercase italic block text-center">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="border-l border-slate-50 p-2">
                                        {res.facebook ? (
                                            <a 
                                                href={res.facebook} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center justify-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-[9px] uppercase bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                            >
                                                <Facebook size={10} /> Profile
                                            </a>
                                        ) : (
                                            <span className="text-[9px] text-slate-300 font-bold uppercase italic block text-center">N/A</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 opacity-50 py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                            <User size={32} strokeWidth={1} />
                        </div>
                        <p className="font-bold uppercase tracking-[0.2em] text-[9px]">Awaiting Lookup Commands</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
