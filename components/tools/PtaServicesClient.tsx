"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ShieldCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl, cn } from "@/lib/utils";

const MAX_NUMBERS_DING = 50;
const MAX_NUMBERS_PTA = 100;

export default function PtaServicesClient() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [apiRoute, setApiRoute] = useState<"pta" | "ding">("ding");

  const parsedCount = input.split("\n").map(n => n.trim()).filter(n => n).length;
  const maxAllowed = apiRoute === "ding" ? MAX_NUMBERS_DING : MAX_NUMBERS_PTA;
  const isOverLimit = parsedCount > maxAllowed;

  const handleProcess = async () => {
    const numbers = input.split("\n").map(n => n.trim()).filter(n => n);
    if (numbers.length === 0) {
      toast.error("Please enter at least one number.");
      return;
    }

    if (numbers.length > maxAllowed) {
      toast.error(`Only ${maxAllowed} numbers allowed at once. You entered ${numbers.length}. Please reduce and try again.`);
      return;
    }

    setLoading(true);
    setResults([]);
    setProgressText(`0 / ${numbers.length}`);

    try {
      if (apiRoute === "ding") {
        // Live streaming: each number shows in UI as soon as it resolves
        for (let i = 0; i < numbers.length; i++) {
          const num = numbers[i];
          setProgressText(`${i + 1} / ${numbers.length}`);
          try {
            const res = await fetch(getApiUrl("/api/tools/ding-lookup"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ numbers: [num] }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.results && data.results.length > 0) {
                setResults((prev) => [...prev, data.results[0]]);
              } else {
                setResults((prev) => [...prev, { number: num, operator: "Not Found" }]);
              }
            } else {
              setResults((prev) => [...prev, { number: num, operator: `HTTP ${res.status}` }]);
            }
          } catch {
            setResults((prev) => [...prev, { number: num, operator: "Error" }]);
          }
        }
        toast.success(`All ${numbers.length} numbers identified via Ding Live.`);
      } else {
        // PTA Easyload batch route
        const res = await fetch(getApiUrl("/api/tools/pta-lookup"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numbers }),
        });
        if (!res.ok) throw new Error("Lookup failed");
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        } else {
          const meta = res.headers.get("X-Results");
          if (meta) setResults(JSON.parse(meta));
        }
        toast.success("Operators identified via PTA Easyload.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setProgressText("");
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
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm font-bold">Input Numbers</CardTitle>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg" title="Toggle: Left for PTA Route, Right for Ding Route">
              <span className={cn("text-[10px] font-black uppercase transition-colors", apiRoute === "pta" ? "text-blue-600 font-bold" : "text-slate-400")}>
                PTA
              </span>
              <Switch 
                checked={apiRoute === "ding"} 
                onCheckedChange={(checked) => setApiRoute(checked ? "ding" : "pta")} 
                className="h-3.5 w-7 data-[state=checked]:bg-emerald-600 scale-75" 
              />
              <span className={cn("text-[10px] font-black uppercase transition-colors", apiRoute === "ding" ? "text-emerald-600 font-bold" : "text-slate-400")}>
                Ding
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea 
              placeholder={`Enter numbers (one per line)...\n03001234567\n03451234567`}
              className="min-h-[200px] font-mono text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {/* Live counter */}
            {parsedCount > 0 && (
              <p className={cn("text-xs font-semibold", isOverLimit ? "text-red-500" : "text-slate-400")}>
                {parsedCount} / {maxAllowed} numbers
                {isOverLimit && ` — ⚠️ Limit exceeded! Remove ${parsedCount - maxAllowed} number(s).`}
              </p>
            )}
            <Button 
              onClick={handleProcess} 
              disabled={loading || isOverLimit}
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" />
                  {progressText ? `Processing (${progressText})...` : "Processing..."}
                </>
              ) : (
                <>
                  <Search size={18} className="mr-2"/> Identify Operators
                </>
              )}
            </Button>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
