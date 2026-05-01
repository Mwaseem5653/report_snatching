"use client";

import { useState, useEffect } from "react";
import SessionHeader from "@/components/session-avtar/page";
import ApplicationExtractorClient from "@/components/tools/ApplicationExtractorClient";
import InfoToolsClient from "@/components/tools/InfoToolsClient";
import SimDetailsV2Client from "@/components/tools/SimDetailsV2Client";
import CdrFormatClient from "@/components/tools/CdrFormatClient";
import LacCellConverterClient from "@/components/tools/LacCellConverterClient";
import EyeconLookupClient from "@/components/tools/EyeconLookupClient";
import ExcelAnalyzerClient from "@/components/tools/ExcelAnalyzerClient";
import GeoFencingClient from "@/components/tools/GeoFencingClient";
import MovementVisualizerClient from "@/components/tools/MovementVisualizerClient";
import RapidApiClient from "@/components/tools/RapidApiClient";
import {
  FileSpreadsheet,
  ScanText,
  LayoutGrid,
  FileCode,
  MapPin,
  Navigation,
  Cpu,
  Eye,
  Globe,
  Shield
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getApiUrl } from "@/lib/utils";

export default function AdvancedToolClient({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<string>("analyzer");
  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    async function refreshSession() {
        const res = await fetch(getApiUrl("/api/auth/create-session"));
        const data = await res.json();
        if (data.authenticated) {
          setSession(data);
          // If the default activeTab is not permitted, switch to first available
          const perms = data.permissions || {};
          const isSuper = data.role === "super_admin";
          const currentTools = [
            { id: "analyzer", key: "excel_analyzer" },
            { id: "geo", key: "geo_fencing" },
            { id: "visualizer", key: "movement_visualizer" },
            { id: "converter", key: "lac_cell_converter" },
            { id: "eyecon", key: "eyecon_lookup" },
            { id: "extractor", key: "ai_extractor" },
            { id: "utilities", key: "info_tools" },
            { id: "simv2", key: "info_tools" },
            { id: "cdr", key: "cdr_generator" },
            { id: "rapidapi", key: "rapid_api" },
          ].filter(t => t && (isSuper || perms[t.key]));
          
          if (currentTools.length > 0 && !currentTools.some(t => t.id === activeTab)) {
            setActiveTab(currentTools[0].id);
          }
        }
    }
    refreshSession();
  }, []);

  const perms = session?.permissions || {};
  const isSuper = session?.role === "super_admin";

  const TOOLS_MENU = [
    { id: "analyzer", label: "Excel Analyzer", icon: FileSpreadsheet, key: "excel_analyzer" },
    { id: "geo", label: "Geo Fencing", icon: MapPin, key: "geo_fencing" },
    { id: "visualizer", label: "Movement Visualizer", icon: Navigation, key: "movement_visualizer" },
    { id: "converter", label: "LAC/Cell Converter", icon: Cpu, key: "lac_cell_converter" },
    { id: "eyecon", label: "Eyecon Lookup", icon: Eye, key: "eyecon_lookup" },
    { id: "extractor", label: "AI Extractor", icon: ScanText, key: "ai_extractor" },
    { id: "utilities", label: "Info Lookup", icon: LayoutGrid, key: "info_tools" },
    { id: "simv2", label: "SIM Details v2", icon: Shield, key: "info_tools" },
    { id: "cdr", label: "CDR Generator", icon: FileCode, key: "cdr_generator" },
    { id: "rapidapi", label: "RapidAPI", icon: Globe, key: "rapid_api" },
  ].filter(t => t && (isSuper || perms[t.key]));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
    <SessionHeader initialSession={session}>        
        <TooltipProvider>
            <nav className="flex flex-col lg:flex-row items-stretch lg:items-center gap-1 p-1 bg-slate-100/50 rounded-2xl lg:rounded-xl border border-slate-200/50 w-full lg:w-auto overflow-hidden">
            {/* Render permitted tools directly */}
            {TOOLS_MENU.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.id;
                return (
                <Tooltip key={tool.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setActiveTab(tool.id)}
                            className={cn(
                            "flex items-center lg:justify-center gap-3 px-4 lg:px-0 h-12 lg:w-12 lg:h-12 rounded-xl transition-all duration-200 shrink-0",
                            isActive 
                                ? "bg-white text-blue-700 shadow-md ring-1 ring-slate-200 lg:scale-105" 
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                            )}
                        >
                            <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="lg:hidden text-sm font-bold">{tool.label}</span>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="hidden lg:block font-bold text-[10px] uppercase tracking-widest bg-[#0a2c4e] text-white border-none py-2 px-3">
                        {tool.label}
                    </TooltipContent>
                </Tooltip>
                );
            })}

            {TOOLS_MENU.length === 0 && (
                <div className="px-4 py-2 text-slate-400 text-xs italic">
                    No tools assigned to your account.
                </div>
            )}
            </nav>
        </TooltipProvider>
    </SessionHeader>

    <main className="flex-1 container mx-auto px-4 pt-4 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {(activeTab === "analyzer" && (isSuper || perms.excel_analyzer)) && <ExcelAnalyzerClient />}
        {(activeTab === "geo" && (isSuper || perms.geo_fencing)) && <GeoFencingClient />}
        {(activeTab === "visualizer" && (isSuper || perms.movement_visualizer)) && <MovementVisualizerClient />}
        {(activeTab === "converter" && (isSuper || perms.lac_cell_converter)) && <LacCellConverterClient />}
        {(activeTab === "eyecon" && (isSuper || perms.eyecon_lookup)) && <EyeconLookupClient />}
        {(activeTab === "extractor" && (isSuper || perms.ai_extractor)) && <ApplicationExtractorClient />}
        {(activeTab === "utilities" && (isSuper || perms.info_tools)) && <InfoToolsClient />}
        {(activeTab === "simv2" && (isSuper || perms.info_tools)) && <SimDetailsV2Client />}
        {(activeTab === "cdr" && (isSuper || perms.cdr_generator)) && <CdrFormatClient />}
        {(activeTab === "rapidapi" && (isSuper || perms.rapid_api)) && <RapidApiClient />}
    </main>
    </div>
  );
}
