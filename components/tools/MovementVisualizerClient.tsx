"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Navigation,
  Upload,
  Loader2,
  Activity,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Monitor
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/uploadHelper";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const MapView = dynamic(() => import("./MapView"), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center font-bold text-blue-400 italic">Booting Tactical Map...</div>
});

export default function MovementVisualizerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<any[]>([]); 
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(true);
  
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setSpeed] = useState(5); // Default to 5x for better visual feel

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAllData([]);
      setSelectedDate("");
      setCurrentMinute(0);
    }
  };

  const uploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { secure_url, public_id } = await uploadFileToStorage(file, "movement-analysis");
      const formData = new FormData();
      formData.append("url", secure_url);
      const res = await fetch("/api/tools/analyze-movement", { method: "POST", body: formData });
      const result = await res.json();
      if (public_id) deleteFileFromStorage(public_id);
      if (result.success) {
        setAllData(result.movements);
        const dates = Array.from(new Set(result.movements.map((m: any) => m.displayTime.split(" ")[0]))).sort();
        if (dates.length > 0) setSelectedDate(dates[0] as string);
        toast.success("Tactical Data Loaded.");
      }
    } catch (err: any) { toast.error("Analysis failed."); } finally { setLoading(false); }
  };

  const dayData = useMemo(() => {
    if (!selectedDate) return [];
    return allData.filter(m => m.displayTime.startsWith(selectedDate));
  }, [allData, selectedDate]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentMinute((prev) => (prev >= 1439 ? (setIsPlaying(false), 1439) : prev + playSpeed));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl"><Monitor size={20} /></div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">Movement Visualizer</h1>
        </div>

        <div className="flex items-center gap-4">
            {allData.length > 0 ? (
                <div className="flex items-center gap-3 bg-slate-50 p-1 pl-4 rounded-xl border">
                    <span className="text-[10px] font-black uppercase text-slate-400">Target Date</span>
                    <Select value={selectedDate} onValueChange={(v) => { setSelectedDate(v); setCurrentMinute(0); setIsPlaying(false); }}>
                        <SelectTrigger className="w-40 h-9 border-none bg-transparent font-bold shadow-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>{Array.from(new Set(allData.map(m => m.displayTime.split(" ")[0]))).sort().map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => {
                        setAllData([]);
                        setSelectedDate("");
                        setCurrentMinute(0);
                        setIsPlaying(false);
                    }} className="text-red-500 hover:bg-red-50 h-9 w-9 p-0"><RotateCcw size={16} /></Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Input type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="h-9 text-xs w-48" />
                    <Button onClick={uploadAndAnalyze} disabled={!file || loading} size="sm" className="bg-slate-900 h-9 font-bold px-4">
                        {loading ? <Loader2 className="animate-spin" /> : "Load CDR"}
                    </Button>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        
        {/* Collapsible Sidebar */}
        <div className={cn("transition-all duration-300 flex flex-col gap-4", showSidebar ? "w-80" : "w-0 opacity-0 overflow-hidden")}>
            <Card className="flex-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
                <CardHeader className="bg-slate-50 border-b p-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500">Timeline Logs</CardTitle>
                    <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">{dayData.length} Points</div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 space-y-3">
                        {dayData.map((point, idx) => {
                            const pMin = (new Date(point.displayTime).getHours() * 60) + new Date(point.displayTime).getMinutes();
                            const isCurrent = currentMinute >= pMin && (idx === dayData.length-1 || currentMinute < (new Date(dayData[idx+1].displayTime).getHours()*60 + new Date(dayData[idx+1].displayTime).getMinutes()));
                            return (
                                <div key={idx} className={cn("pl-3 border-l-2 py-1 transition-all", isCurrent ? "border-red-500 bg-red-50/50 scale-[1.02]" : currentMinute > pMin ? "border-blue-600" : "border-slate-100 opacity-40")}>
                                    <p className="text-[10px] font-black text-slate-900">{point.displayTime.split(" ")[1]}</p>
                                    <p className="text-[10px] font-medium text-slate-500 leading-tight truncate">{point.address}</p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Map Container */}
        <div className="flex-1 rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative bg-slate-100">
            <MapView data={dayData} currentTime={currentMinute} selectedDate={selectedDate} />

            {/* Sidebar Toggle */}
            <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur shadow-lg border p-2 rounded-xl hover:bg-white transition-all"
            >
                {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>

            {/* Floating Info */}
            <div className="absolute top-4 right-4 z-10">
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 w-48">
                    <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                        <span className="text-[10px] font-black uppercase text-blue-400">Current Time</span>
                        <span className="text-lg font-black tracking-tighter tabular-nums">{formatTime(currentMinute)}</span>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">Operational Date</p>
                    <p className="text-xs font-bold text-slate-200">{selectedDate || "N/A"}</p>
                </div>
            </div>

            {/* 🚀 Moveable Floating Tactical Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4">
                <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-[2rem] border border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-6">
                    <Button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={cn("w-12 h-12 rounded-full shadow-lg shrink-0", isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700")}
                    >
                        {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} className="ml-1" />}
                    </Button>

                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <span>00:00</span>
                            <span className="text-blue-400">24H Tactical Timeline</span>
                            <span>23:59</span>
                        </div>
                        <input 
                            type="range" min="0" max="1439" step="1"
                            value={currentMinute} 
                            onChange={(e) => { setCurrentMinute(parseInt(e.target.value)); setIsPlaying(false); }}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div className="flex flex-col items-center gap-1 shrink-0 bg-slate-800 p-2 rounded-xl border border-slate-700">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Speed</span>
                        <select 
                            value={playSpeed} 
                            onChange={(e) => setSpeed(parseInt(e.target.value))}
                            className="bg-transparent text-blue-400 text-[10px] font-black outline-none cursor-pointer"
                        >
                            <option value={1}>1x</option>
                            <option value={15}>15x</option>
                            <option value={30}>30x</option>
                            <option value={60}>60x</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
