"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2, RotateCcw, User, MapPin, Hash, Shield } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/utils";

export default function SimDetailsV2Client() {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!number.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(getApiUrl("/api/tools/sim-details"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: number.trim() }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
        toast.success("Details fetched successfully");
      } else {
        toast.error(data.message || "Search failed");
      }
    } catch (e) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNumber("");
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
           <Shield size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Advanced SIM Lookup (v2)</h1>
           <p className="text-slate-500">Testing new database endpoint for mobile number details.</p>
        </div>
      </div>

      <Card className="shadow-lg border-blue-100">
        <CardHeader>
          <CardTitle className="text-lg">Search Number</CardTitle>
          <CardDescription>Enter a mobile number to retrieve ownership information from the new API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Input 
                placeholder="03001234567" 
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="h-12 border-slate-200 pl-4 focus:ring-blue-500 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={loading || !number.trim()} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold">
              {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset} className="h-12 w-12 p-0 text-slate-400">
              <RotateCcw size={18} />
            </Button>
          </form>

          {result && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4">
               {/* Result Logic - Custom handling based on API response structure */}
               <div className="grid grid-cols-1 gap-4">
                  {Object.entries(result).map(([key, value]) => (
                    <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                           {key.toLowerCase().includes('name') ? <User className="text-blue-500" size={18} /> : 
                            key.toLowerCase().includes('address') ? <MapPin className="text-red-500" size={18} /> :
                            <Hash className="text-slate-400" size={18} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">{key.replace(/_/g, ' ')}</p>
                            <p className="text-sm font-bold text-slate-700">{String(value)}</p>
                        </div>
                    </div>
                  ))}
               </div>
               
               {typeof result === 'string' && (
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-auto max-h-60">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Raw API Response</p>
                   <pre className="text-xs whitespace-pre-wrap">{result}</pre>
                 </div>
               )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
