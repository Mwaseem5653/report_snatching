"use client";

import { useState, useEffect } from "react";
import SessionHeader from "@/components/session-avtar/page";
import IMEISearch from "@/components/searchiemis/searchiemi";
import ApplicationManagement from "@/components/addapplications/addapplication";
import AddUserForm from "@/components/add-users/page";
import ReportsView from "@/components/reports/ReportsView";
import MatchedIMEIsView from "@/components/matched/MatchedIMEIs";
import ApplicationExtractorClient from "@/components/tools/ApplicationExtractorClient";
import InfoToolsClient from "@/components/tools/InfoToolsClient";
import CdrFormatClient from "@/components/tools/CdrFormatClient";
import ExcelAnalyzerClient from "@/components/tools/ExcelAnalyzerClient";
import GeoFencingClient from "@/components/tools/GeoFencingClient";
import MovementVisualizerClient from "@/components/tools/MovementVisualizerClient";
import LacCellConverterClient from "@/components/tools/LacCellConverterClient";
import EyeconLookupClient from "@/components/tools/EyeconLookupClient";
import ApplicationToExcelClient from "@/components/tools/ApplicationToExcelClient";
import AdvancedReportClient from "@/components/tools/AdvancedReportClient";
import UsageAnalyticsClient from "@/components/tools/UsageAnalyticsClient";
import TokenManagement from "@/components/dashboard/TokenManagement";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  PlusCircle, 
  BarChart3, 
  TrendingUp,
  FileCheck, 
  FileSpreadsheet, 
  ScanText, 
  LayoutGrid, 
  FileCode,
  Wrench,
  ChevronDown,
  MapPin,
  Navigation,
  Cpu,
  Eye,
  FileDown,
  ChevronRight
} from "lucide-react";
import { cn, getApiUrl } from "@/lib/utils";

// 🚀 REORDERED TABS AS PER REQUEST
const MAIN_TABS = [
  { id: "add-app", label: "Applications", icon: PlusCircle },
  { id: "search", label: "Search IMEI", icon: Search },
  { id: "matched", label: "Matched", icon: FileCheck },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function SuperAdminDashboard({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<string>("add-app");
  const [session, setSession] = useState(initialSession);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false); // 🚀 Toggle for Advanced Tools list on mobile

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);

    const refreshSession = async () => {
        const res = await fetch(getApiUrl("/api/auth/create-session"));
        const data = await res.json();
        if (data.authenticated) setSession(data);
    };
    refreshSession();

    const handleSwitchTab = (e: any) => {
        if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("switch-tab", handleSwitchTab);
    };
  }, []);

  const perms = session?.permissions || {};
  const isSuper = session?.role === "super_admin";

  const TOOLS_MENU = [
    { id: "app-excel", label: "Application To Excel", icon: FileDown, key: "app_to_excel" },
    // { id: "adv-reports", label: "Advanced Reports", icon: BarChart3, key: "advanced_reports" },
    { id: "usage-stats", label: "Tool Usage Analytics", icon: TrendingUp, key: "usage_analytics" },
    { id: "analyzer", label: "Excel Analyzer", icon: FileSpreadsheet, key: "excel_analyzer" },
    { id: "geo", label: "Geo Fencing", icon: MapPin, key: "geo_fencing" },
    { id: "visualizer", label: "Movement Visualizer", icon: Navigation, key: "movement_visualizer" },
    { id: "converter", label: "LAC/Cell Converter", icon: Cpu, key: "lac_cell_converter" },
    { id: "eyecon", label: "Eyecon Lookup", icon: Eye, key: "eyecon_lookup" },
    { id: "extractor", label: "AI Extractor", icon: ScanText, key: "ai_extractor" },
    { id: "utilities", label: "Info Lookup", icon: LayoutGrid, key: "info_tools" },
    { id: "cdr", label: "CDR Generator", icon: FileCode, key: "cdr_generator" },
  ].filter(t => isSuper || perms[t.key]);

  const isToolActive = TOOLS_MENU.some(t => t.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
    <SessionHeader initialSession={session}>
        <nav className="flex flex-col lg:flex-row items-stretch lg:items-center gap-1 p-1 lg:bg-slate-100/50 rounded-2xl lg:rounded-xl lg:border border-slate-200/50 w-full lg:w-auto">
        {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                "flex items-center gap-3 lg:gap-2 px-4 lg:px-3 py-3 lg:py-1.5 rounded-xl lg:rounded-lg text-sm font-bold lg:font-medium transition-all duration-200",
                isActive 
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
            >
                <Icon size={18} className="lg:w-4 lg:h-4 shrink-0" />
                <span className="inline">{tab.label}</span>
            </button>
            );
        })}

        {/* 🛠️ TOOLS SECTION */}
        {TOOLS_MENU.length > 0 && (
            <>
                {/* 💻 Desktop View: Dropdown Menu */}
                <div className="hidden lg:block">
                    <DropdownMenu>
                        <DropdownMenuTrigger className={cn(
                            "flex items-center justify-between lg:justify-start gap-3 lg:gap-2 px-4 lg:px-3 py-3 lg:py-1.5 rounded-xl lg:rounded-lg text-sm font-bold lg:font-medium transition-all duration-200 outline-none",
                            isToolActive 
                                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" 
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                        )}>
                            <div className="flex items-center gap-3 lg:gap-2">
                                <Wrench size={18} className="lg:w-4 lg:h-4" />
                                <span>Advanced Tools</span>
                            </div>
                            <ChevronDown size={14} className="opacity-50" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            {TOOLS_MENU.map((tool) => {
                                const Icon = tool.icon;
                                return (
                                    <DropdownMenuItem 
                                        key={tool.id} 
                                        onClick={() => setActiveTab(tool.id)}
                                        className={cn("gap-3 py-3 lg:py-2 cursor-pointer", activeTab === tool.id && "bg-slate-100 text-blue-600 font-bold lg:font-medium")}
                                    >
                                        <Icon size={18} className="lg:w-4 lg:h-4" />
                                        {tool.label}
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* 📱 Mobile View: Collapsible Trigger */}
                <div className="lg:hidden">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent Sidebar from closing immediately
                            setMobileToolsOpen(!mobileToolsOpen);
                        }}
                        className={cn(
                            "flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 w-full",
                            isToolActive 
                                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" 
                                : "text-slate-500 hover:bg-slate-100"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Wrench size={18} className="shrink-0" />
                            <span>Advanced Tools</span>
                        </div>
                        <ChevronDown size={16} className={cn("transition-transform duration-300", mobileToolsOpen && "rotate-180")} />
                    </button>

                    {/* 📱 Mobile Nested Tools List */}
                    {mobileToolsOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-100 space-y-1 animate-in slide-in-from-top-2 duration-300">
                            {TOOLS_MENU.map((tool) => {
                                const Icon = tool.icon;
                                const isActive = activeTab === tool.id;
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => setActiveTab(tool.id)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 w-full",
                                            isActive 
                                                ? "text-blue-700 bg-blue-50" 
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon size={16} className="shrink-0" />
                                        <span>{tool.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </>
        )}
        </nav>
    </SessionHeader>

    <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "add-app" && <ApplicationManagement />}
        {activeTab === "search" && <IMEISearch />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "matched" && <MatchedIMEIsView />}
        
        {(activeTab === "app-excel" && (isSuper || perms.app_to_excel)) && <ApplicationToExcelClient />}
        {(activeTab === "adv-reports" && (isSuper || perms.advanced_reports)) && <AdvancedReportClient />}
        {(activeTab === "usage-stats" && (isSuper || perms.usage_analytics)) && <UsageAnalyticsClient />}
        {(activeTab === "analyzer" && (isSuper || perms.excel_analyzer)) && <ExcelAnalyzerClient />}
        {(activeTab === "geo" && (isSuper || perms.geo_fencing)) && <GeoFencingClient />}
        {(activeTab === "visualizer" && (isSuper || perms.movement_visualizer)) && <MovementVisualizerClient />}
        {(activeTab === "converter" && (isSuper || perms.lac_cell_converter)) && <LacCellConverterClient />}
        {(activeTab === "eyecon" && (isSuper || perms.eyecon_lookup)) && <EyeconLookupClient />}
        {(activeTab === "extractor" && (isSuper || perms.ai_extractor)) && <ApplicationExtractorClient />}
        {(activeTab === "utilities" && (isSuper || perms.info_tools)) && <InfoToolsClient />}
        {(activeTab === "cdr" && (isSuper || perms.cdr_generator)) && <CdrFormatClient />}

        {activeTab === "users" && <AddUserForm />}
        {/* 🚀 Permission Check for Token Pool Management */}
        {(activeTab === "tokens" && (isSuper || perms.token_pool)) && <TokenManagement />}
    </main>
    </div>
  );
}
