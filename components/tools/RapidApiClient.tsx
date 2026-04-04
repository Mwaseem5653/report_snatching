"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";

export default function RapidApiClient() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">Rapid API Portal</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">External API Hub Access</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 rounded-3xl border-slate-200 shadow-xl overflow-hidden relative bg-white">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Establishing Connection...</p>
          </div>
        )}
        <CardContent className="p-0 h-full w-full">
          <iframe 
            src="https://rapidapi.com/hub" 
            className="w-full h-full border-none"
            onLoad={() => setLoading(false)}
            title="RapidAPI"
          />
        </CardContent>
      </Card>
    </div>
  );
}
