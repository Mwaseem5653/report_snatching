"use client";

import { useState, useEffect } from "react";
import SessionHeader from "@/components/session-avtar/page";
import ApplicationExtractorClient from "@/components/tools/ApplicationExtractorClient";
import InfoToolsClient from "@/components/tools/InfoToolsClient";
import CdrFormatClient from "@/components/tools/CdrFormatClient";
import LacCellConverterClient from "@/components/tools/LacCellConverterClient";
import EyeconLookupClient from "@/components/tools/EyeconLookupClient";
import ExcelAnalyzerClient from "@/components/tools/ExcelAnalyzerClient";
import GeoFencingClient from "@/components/tools/GeoFencingClient";
import MovementVisualizerClient from "@/components/tools/MovementVisualizerClient";
import {
  FileSpreadsheet,
  ScanText,
  LayoutGrid,
  FileCode,
  MapPin,
  Navigation,
  Cpu,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdvancedToolClient({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<string>("analyzer");
  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    async function refreshSession() {
        const res = await fetch("/api/auth/create-session");
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
            { id: "cdr", key: "cdr_generator" },
          ].filter(t => isSuper || perms[t.key]);
          
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
    { id: "cdr", label: "CDR Generator", icon: FileCode, key: "cdr_generator" },
  ].filter(t => isSuper || perms[t.key]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
    <SessionHeader initialSession={session}>        
        <nav className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
        {/* Render permitted tools directly */}
        {TOOLS_MENU.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === tool.id;
            return (
            <button
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
            >
                <Icon size={16} />
                <span className="hidden lg:inline">{tool.label}</span>
            </button>
            );
        })}

        {TOOLS_MENU.length === 0 && (
            <div className="px-4 py-2 text-slate-400 text-xs italic">
                No tools assigned to your account.
            </div>
        )}
        </nav>
    </SessionHeader>

    <main className="flex-1 container mx-auto px-4 pt-4 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {(activeTab === "analyzer" && (isSuper || perms.excel_analyzer)) && <ExcelAnalyzerClient />}
        {(activeTab === "geo" && (isSuper || perms.geo_fencing)) && <GeoFencingClient />}
        {(activeTab === "visualizer" && (isSuper || perms.movement_visualizer)) && <MovementVisualizerClient />}
        {(activeTab === "converter" && (isSuper || perms.lac_cell_converter)) && <LacCellConverterClient />}
        {(activeTab === "eyecon" && (isSuper || perms.eyecon_lookup)) && <EyeconLookupClient />}
        {(activeTab === "extractor" && (isSuper || perms.ai_extractor)) && <ApplicationExtractorClient />}
        {(activeTab === "utilities" && (isSuper || perms.info_tools)) && <InfoToolsClient />}
        {(activeTab === "cdr" && (isSuper || perms.cdr_generator)) && <CdrFormatClient />}
    </main>
    </div>
  );
}
