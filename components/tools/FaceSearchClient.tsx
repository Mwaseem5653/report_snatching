"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  RotateCcw, 
  ImageIcon, 
  Loader2, 
  User, 
  ExternalLink,
  Facebook, 
  Instagram,
  Twitter,
  Linkedin,
  Github,
  Globe,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn, getApiUrl } from "@/lib/utils";
import TokenExpiredModal from "@/components/ui/token-expired-modal";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FaceSearchResult {
  platform: string;
  url: string;
  confidence?: number;
  thumbnail?: string;
}

export default function FaceSearchClient() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FaceSearchResult[]>([]);
  const [tokenModal, setTokenModal] = useState({ isOpen: false, currentBalance: 0, requiredTokens: 0, toolName: "" });
  const [useApi, setUseApi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResults([]);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSearch = async () => {
    if (!selectedImage) {
      toast.error("Please select a face image first");
      return;
    }

    setLoading(true);
    try {
        // Check for session/tokens first
        const sRes = await fetch(getApiUrl("/api/auth/create-session"));
        const sData = await sRes.json();
        
        if (sData.authenticated && sData.role !== "super_admin") {
            const currentTokens = sData.faceSearchTokens || 0;
            if (currentTokens < 30) {
                setTokenModal({ 
                    isOpen: true, 
                    currentBalance: currentTokens, 
                    requiredTokens: 30, 
                    toolName: "Face Social Search" 
                });
                setLoading(false);
                return;
            }
        }

        const formData = new FormData();
        formData.append("image", selectedImage);

        const endpoint = useApi ? "/api/tools/lookup/face-search-api" : "/api/tools/lookup/face-search";

        const res = await fetch(getApiUrl(endpoint), {
            method: "POST",
            body: formData,
        });

        if (res.status === 403) {
            const errData = await res.json();
            setTokenModal({ 
                isOpen: true, 
                currentBalance: errData.currentBalance || 0, 
                requiredTokens: 30, 
                toolName: "Face Social Search" 
            });
            setLoading(false);
            return;
        }

        const data = await res.json();

        if (data.success) {
            setResults(data.results);
            window.dispatchEvent(new Event("refresh-session"));
            toast.success(`Search complete. Found ${data.results.length} matches.`);
        } else {
            toast.error(data.error || "Search failed");
        }
    } catch (err) {
        toast.error("An error occurred during face search");
    } finally {
        setLoading(false);
    }
  };

  const handleReset = () => {
    handleRemoveImage();
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("facebook")) return <Facebook size={14} className="text-blue-600" />;
    if (p.includes("instagram")) return <Instagram size={14} className="text-pink-600" />;
    if (p.includes("twitter") || p.includes("x.com")) return <Twitter size={14} className="text-sky-500" />;
    if (p.includes("linkedin")) return <Linkedin size={14} className="text-blue-700" />;
    if (p.includes("github")) return <Github size={14} className="text-slate-800" />;
    return <Globe size={14} className="text-slate-400" />;
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 overflow-hidden">
      <TokenExpiredModal
        isOpen={tokenModal.isOpen}
        onClose={() => setTokenModal({ ...tokenModal, isOpen: false })}
        currentBalance={tokenModal.currentBalance}
        requiredTokens={tokenModal.requiredTokens}
        toolName={tokenModal.toolName}
      />

      {/* HEADER AREA */}
      <div className="shrink-0 flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                <ImageIcon size={24} />
            </div>
            <div>
                <h1 className="text-md md:text-lg font-black text-slate-800 tracking-tight uppercase leading-none">Face Investigator</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Social Media Identity Search</p>
            </div>
        </div>
        <div className="flex items-center justify-center gap-4 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2 border border-slate-200 px-3 py-1.5 rounded-xl bg-slate-50">
                <Switch checked={useApi} onCheckedChange={setUseApi} id="api-mode" />
                <label htmlFor="api-mode" className="text-[10px] md:text-xs font-bold text-slate-500 cursor-pointer uppercase tracking-widest">
                    Search From API
                </label>
            </div>
            <Button variant="outline" onClick={handleReset} className="flex-1 md:flex-none rounded-xl font-bold text-slate-500 border-slate-200 h-9 text-[10px] md:text-xs">
                <RotateCcw size={14} className="mr-2" /> Reset
            </Button>
            <Button onClick={handleSearch} disabled={loading || !selectedImage} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg h-9 px-4 md:px-6 text-[10px] md:text-xs transition-all active:scale-95 whitespace-nowrap">
                {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : <Search size={14} className="mr-2" />} 
                {loading ? "SEARCHING..." : "START FACE SEARCH"}
            </Button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        
        {/* INPUT SECTION (Image Upload) */}
        <Card className="lg:col-span-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
          <CardHeader className="bg-slate-50 border-b p-3 shrink-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
              <Upload size={12} className="text-indigo-600" /> Face Image
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col gap-4 min-h-0">
            <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 shrink-0">
                <p className="text-[9px] text-indigo-700 font-bold uppercase tracking-tight leading-none text-center">
                    Upload a clear face photo
                </p>
            </div>
            
            <div 
                className={cn(
                    "flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all",
                    imagePreview ? "border-indigo-500 bg-slate-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
            >
                {imagePreview ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                        />
                        <button 
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div 
                        className="cursor-pointer flex flex-col items-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                            <Upload size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Click to upload</p>
                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">JPG, PNG (Max 5MB)</p>
                        </div>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                />
            </div>
          </CardContent>
        </Card>

        {/* RESULTS SECTION */}
        <Card className="lg:col-span-3 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
          <CardHeader className="bg-slate-50 border-b p-3 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", results.length > 0 ? "bg-emerald-500" : "bg-slate-300")}></div>
                <CardTitle className="text-[10px] font-black uppercase text-slate-500">Social Discovery Results</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar p-4 bg-slate-50/30">
                {results.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {results.map((res, idx) => (
                            <a 
                                key={idx}
                                href={res.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative"
                            >
                                {/* Match Percentage Badge */}
                                <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200/50 shadow-sm flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-emerald-700">{res.confidence ? `${res.confidence}%` : "Probable"}</span>
                                </div>
                                
                                {/* Platform Icon Badge */}
                                <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg border border-slate-200/50 shadow-sm flex items-center justify-center">
                                    {getPlatformIcon(res.platform)}
                                </div>

                                {/* Image Area */}
                                <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                    {res.thumbnail ? (
                                        <img src={res.thumbnail} alt="Match" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <User size={32} className="text-slate-300" />
                                    )}
                                    
                                    <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/20 transition-colors duration-300 flex items-center justify-center">
                                        <div className="bg-white text-indigo-600 rounded-full p-2.5 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                                            <ExternalLink size={18} />
                                        </div>
                                    </div>
                                </div>

                                {/* Details Area at Bottom */}
                                <div className="p-3 border-t border-slate-100 flex flex-col justify-center">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate flex items-center gap-1.5">
                                        {res.platform} 
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Match Found</span>
                                    </p>
                                    <p className="text-[10px] font-bold text-indigo-600 truncate mt-0.5 group-hover:underline">
                                        Click to view profile &rarr;
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 opacity-50 py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                            <User size={32} strokeWidth={1} />
                        </div>
                        <div className="text-center">
                            <p className="font-bold uppercase tracking-[0.2em] text-[9px]">Awaiting Face Scan</p>
                            <p className="text-[8px] font-bold mt-1 uppercase">Upload a photo to begin investigation</p>
                        </div>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
