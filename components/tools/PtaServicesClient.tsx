"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ShieldCheck, Loader2, Download, Search } from "lucide-react";
import { toast } from "sonner";

export default function PtaServicesClient() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleProcess = async () => {
    const numbers = input.split("\n").map(n => n.trim()).filter(n => n);
    if (numbers.length === 0) {
      toast.error("Please enter at least one number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tools/pta-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers }),
      });

      if (!res.ok) throw new Error("Lookup failed");

      // Extract results from header
      const meta = res.headers.get("X-Results");
      if (meta) setResults(JSON.parse(meta));

      // Handle download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "operator_results.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Operators identified and Excel downloaded.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
           <ShieldCheck size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">PTA Operator Lookup</h1>
           <p className="text-slate-500">Identify mobile operators for multiple numbers and export to Excel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Input Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Enter numbers (one per line)...\n03001234567\n03451234567" 
              className="min-h-[200px] font-mono text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button 
              onClick={handleProcess} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold"
            >
              {loading ? <><Loader2 className="mr-2 animate-spin" /> Processing...</> : <><Search size={18} className="mr-2"/> Identify Operators</>}</Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-sm font-bold">Results Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-y-auto">
            {results.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Number</TableHead>
                    <TableHead className="font-bold">Operator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-2">{r.number}</TableCell>
                      <TableCell className="py-2 font-medium text-blue-600">{r.operator}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">
                Results will appear here.
              </div>
            )}</CardContent>
        </Card>
      </div>
    </div>
  );
}
