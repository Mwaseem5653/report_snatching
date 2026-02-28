"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Monitor, 
  Calendar, 
  Video, 
  VideoOff, 
  ChevronLeft, 
  ChevronRight, 
  Loader2 
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
    loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center font-bold text-blue-400 italic text-center p-10">Initializing Map...</div>
});

export default function MovementVisualizerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<any[]>([]); 
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(true);
  
  const [fromTime, setFromTime] = useState("12:00");
  const [fromPeriod, setFromPeriod] = useState("AM");
  const [toTime, setToTime] = useState("11:59");
  const [toPeriod, setToPeriod] = useState("PM");

  const [currentMinute, setCurrentMinute] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setSpeed] = useState(5);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const timeToMinutes = (timeStr: string, period: string) => {
    const parts = (timeStr || "00:00").split(":");
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    let hours = h % 12;
    if (period === "PM") hours += 12;
    return (hours * 60) + m;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const availableDates = useMemo(() => {
    if (!allData || allData.length === 0) return [];
    return Array.from(new Set(allData.map(m => m.displayTime.split(" ")[0]))).sort();
  }, [allData]);

  const windowMinutes = useMemo(() => ({
    start: timeToMinutes(fromTime, fromPeriod),
    end: timeToMinutes(toTime, toPeriod)
  }), [fromTime, fromPeriod, toTime, toPeriod]);

  const dayData = useMemo(() => {
    if (!selectedDate || !allData) return [];
    return allData.filter(m => m.displayTime.startsWith(selectedDate));
  }, [allData, selectedDate]);

  const filteredDayData = useMemo(() => {
    if (!selectedDate || dayData.length === 0) return [];
    const dayStart = new Date(selectedDate).getTime();
    const startTs = dayStart + (windowMinutes.start * 60 * 1000);
    const endTs = dayStart + (windowMinutes.end * 60 * 1000);
    return dayData.filter(m => m.timestamp >= startTs && m.timestamp <= endTs);
  }, [dayData, windowMinutes, selectedDate]);

  useEffect(() => {
    setCurrentMinute(windowMinutes.start);
  }, [windowMinutes.start, selectedDate]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentMinute((prev) => (prev >= windowMinutes.end ? (setIsPlaying(false), windowMinutes.end) : prev + playSpeed));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, windowMinutes.end]);

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
        if (dates.length > 0) setSelectedDate(dates[0]);
        toast.success("Tactical Data Loaded.");
      }
    } catch (err: any) { toast.error("Analysis failed."); } finally { setLoading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
        video: { displaySurface: "browser", preferCurrentTab: true },
        audio: false 
      });

      // 🚀 Detect best supported format (mp4 preference)
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264') 
        ? 'video/mp4;codecs=h264' 
        : 'video/webm;codecs=vp9';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && recordedChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Movement_${selectedDate}.${extension}`;
        a.click();
        stream.getTracks().forEach((t: any) => t.stop());
        setIsRecording(false);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { toast.error("Recording failed."); }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      
      {/* 🔹 HEADER */}
      <div className="bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Monitor size={18} /></div>
            <div>
                <h1 className="text-md font-black text-slate-800 tracking-tight uppercase leading-none">Movement visualizer</h1>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">Tactical Analysis Suite</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
            {allData.length > 0 && (
                <div className="flex items-center gap-3 bg-slate-50 p-1 pl-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 border-r pr-3 border-slate-200">
                        <Calendar size={14} className="text-blue-600" />
                        <Select value={selectedDate} onValueChange={(v) => { setSelectedDate(v); setIsPlaying(false); }}>
                            <SelectTrigger className="w-36 h-7 border-none bg-transparent font-black text-xs shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 z-[10001]">
                                {availableDates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-1 px-3 border-r border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase">From</span>
                        <Input value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="w-12 h-6 text-[10px] font-bold p-0 bg-transparent border-none shadow-none text-center tabular-nums" />
                        <Select value={fromPeriod} onValueChange={setFromPeriod}>
                            <SelectTrigger className="w-12 h-6 text-[9px] font-black border-none bg-blue-100 text-blue-700 uppercase p-1"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1 px-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase">To</span>
                        <Input value={toTime} onChange={(e) => setToTime(e.target.value)} className="w-12 h-6 text-[10px] font-bold p-0 bg-transparent border-none shadow-none text-center tabular-nums" />
                        <Select value={toPeriod} onValueChange={setToPeriod}>
                            <SelectTrigger className="w-12 h-6 text-[9px] font-black border-none bg-indigo-100 text-indigo-700 uppercase p-1"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                {!allData.length ? (
                    <div className="flex items-center gap-2">
                        <Input type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="h-10 text-xs w-48 rounded-xl bg-slate-50" />
                        <Button onClick={uploadAndAnalyze} disabled={!file || loading} size="sm" className="bg-slate-900 h-10 font-black px-6 rounded-xl text-xs">
                            {loading ? <Loader2 className="animate-spin" /> : "START ANALYSIS"}
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button onClick={isRecording ? () => mediaRecorderRef.current?.stop() : startRecording} variant={isRecording ? "destructive" : "outline"} size="sm" className="h-9 rounded-xl font-bold gap-2">
                            {isRecording ? <VideoOff size={16} /> : <Video size={16} />} {isRecording ? "Stop" : "Record"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setAllData([]); setSelectedDate(""); setCurrentMinute(0); setIsPlaying(false); }} className="h-9 w-9 rounded-xl font-bold text-red-600 border-red-100 p-0 shadow-sm">
                            <RotateCcw size={16} />
                        </Button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        <div className={cn("transition-all duration-300 flex flex-col gap-4 shrink-0", showSidebar ? "w-80" : "w-0 opacity-0 overflow-hidden")}>
            <Card className="flex-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
                <CardHeader className="bg-slate-50 border-b p-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500">Timeline Logs</CardTitle>
                    <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">{filteredDayData.length} Records</div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 space-y-3">
                        {filteredDayData.map((point, idx) => {
                            const pMin = (new Date(point.displayTime).getHours() * 60) + new Date(point.displayTime).getMinutes();
                            const isCurrent = currentMinute >= pMin && (idx === filteredDayData.length-1 || currentMinute < (new Date(filteredDayData[idx+1].displayTime).getHours()*60 + new Date(filteredDayData[idx+1].displayTime).getMinutes()));
                            return (
                                <div key={idx} className={cn("pl-3 border-l-2 py-1 transition-all", isCurrent ? "border-red-500 bg-red-50/50 scale-[1.02]" : currentMinute > pMin ? "border-blue-600" : "border-slate-100 opacity-40")}>
                                    <p className="text-[10px] font-black text-slate-900">{point.displayTime.split(" ")[1]}</p>
                                    <p className="text-[10px] font-medium text-slate-500 leading-tight">{point.address}</p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="flex-1 rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative bg-slate-100">
            <MapView data={dayData} currentTime={currentMinute} selectedDate={selectedDate} />

            <button onClick={() => setShowSidebar(!showSidebar)} className="absolute top-4 left-4 z-[9999] bg-white shadow-xl border p-2 rounded-xl hover:bg-slate-50 transition-all">
                {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>

            {/* Tactical Clock */}
            <div className="absolute top-4 right-4 z-[9999]">
                <div className="bg-slate-900/95 backdrop-blur text-white px-4 py-2 rounded-xl shadow-2xl border border-white/10 flex items-center gap-4">
                    <div className="flex flex-col items-center border-r border-white/10 pr-3">
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-red-500 rounded-full animate-ping"></div>
                            <span className="text-[7px] font-black uppercase text-blue-400">TRACKING</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">{formatTime(currentMinute).split(' ')[1]}</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter tabular-nums leading-none">
                        {formatTime(currentMinute).split(' ')[0]}
                    </span>
                </div>
            </div>

            {/* 🚀 SLIM FIXED BOTTOM PILL BAR: Centered & Absolute Bottom */}
            {allData.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-xl">
                    <div className="bg-slate-900/95 backdrop-blur-3xl px-5 py-2 rounded-full border border-white/10 flex items-center gap-4 shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                        <Button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={cn("w-9 h-9 rounded-full shadow-lg shrink-0 border border-white/10 transition-all active:scale-95", isPlaying ? "bg-amber-500" : "bg-blue-600")}
                        >
                            {isPlaying ? <Pause fill="white" size={16} /> : <Play fill="white" size={16} className="ml-0.5" />}
                        </Button>

                        <div className="flex-1 flex flex-col gap-0.5">
                            <input 
                                type="range" min={windowMinutes.start} max={windowMinutes.end} step="1"
                                value={currentMinute} 
                                onChange={(e) => { setCurrentMinute(parseInt(e.target.value)); setIsPlaying(false); }}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter tabular-nums px-0.5">
                                <span>{formatTime(windowMinutes.start).split(' ')[0]}</span>
                                <span className="text-blue-400 font-bold tracking-[0.2em]">{formatTime(currentMinute)}</span>
                                <span>{formatTime(windowMinutes.end).split(' ')[0]}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded-xl border border-slate-700 shrink-0">
                            <span className="text-[7px] font-black text-slate-500 uppercase">Warp</span>
                            <select value={playSpeed} onChange={(e) => setSpeed(parseInt(e.target.value))} className="bg-transparent text-blue-400 text-[10px] font-black outline-none cursor-pointer">
                                <option value={1}>1x</option><option value={15}>15x</option><option value={30}>30x</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
