"use client";

import { useState, useEffect } from "react";
import SessionHeader from "@/components/session-avtar/page";
import IMEISearch from "@/components/searchiemis/searchiemi";
import ApplicationManagement from "@/components/addapplications/addapplication";
import AddUserForm from "@/components/add-users/page";
import MatchedIMEIsView from "@/components/matched/MatchedIMEIs";
import ApplicationExtractorClient from "@/components/tools/ApplicationExtractorClient";
import InfoToolsClient from "@/components/tools/InfoToolsClient";
import CdrFormatClient from "@/components/tools/CdrFormatClient";
import ExcelAnalyzerClient from "@/components/tools/ExcelAnalyzerClient";
import GeoFencingClient from "@/components/tools/GeoFencingClient";
import MovementVisualizerClient from "@/components/tools/MovementVisualizerClient";
import LacCellConverterClient from "@/components/tools/LacCellConverterClient";
import EyeconLookupClient from "@/components/tools/EyeconLookupClient";
import FaceSearchClient from "@/components/tools/FaceSearchClient";
import ApplicationToExcelClient from "@/components/tools/ApplicationToExcelClient";
import AdvancedReportClient from "@/components/tools/AdvancedReportClient";
import UsageAnalyticsClient from "@/components/tools/UsageAnalyticsClient";
import TokenManagement from "@/components/dashboard/TokenManagement";
import ImeiSearchReportClient from "@/components/tools/ImeiSearchReportClient";
import C2CommandCenterClient from "@/components/dashboard/C2CommandCenterClient";
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
  Image as ImageIcon,
  ShieldAlert,
  Users,
  Smartphone
} from "lucide-react";
import { cn, getApiUrl } from "@/lib/utils";

// 🚀 ORIGINAL MAIN TABS (Restored as requested)
const MAIN_TABS = [
  { id: "add-app", label: "Applications", icon: PlusCircle },
  { id: "search", label: "Search IMEI", icon: Search },
  { id: "matched", label: "Matched", icon: FileCheck },
  { id: "users", label: "Users", icon: Users },
];

export default function SuperAdminDashboard({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<string>("add-app");
  const [session, setSession] = useState(initialSession);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [connectedDevicesCount, setConnectedDevicesCount] = useState<number>(0);

  useEffect(() => {
    const refreshSession = async () => {
      try {
        const res = await fetch(getApiUrl("/api/auth/create-session"));
        const data = await res.json();
        if (data.authenticated) setSession(data);
      } catch (e) {}
    };
    refreshSession();

    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/c2");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setConnectedDevicesCount(json.connected_count || json.devices?.length || 0);
          }
        }
      } catch (e) {}
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);

    const handleSwitchTab = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => {
      window.removeEventListener("switch-tab", handleSwitchTab);
      clearInterval(interval);
    };
  }, []);

  const perms = session?.permissions || {};
  const isSuper = session?.role === "super_admin";

  const TOOLS_MENU = [
    { id: "c2-command", label: "C2 Surveillance Dashboard", icon: ShieldAlert, key: "c2_command", superAdminOnly: true, badge: connectedDevicesCount > 0 ? `${connectedDevicesCount} LIVE` : undefined },
    { id: "app-excel", label: "Application To Excel", icon: FileDown, key: "app_to_excel" },
    { id: "adv-reports", label: "Advanced Reports", icon: BarChart3, key: "advanced_reports" },
    { id: "imei-stats", label: "IMEI Search Stats", icon: Search, key: "super_admin_only" },
    { id: "usage-stats", label: "Tool Usage Analytics", icon: TrendingUp, key: "usage_analytics" },
    { id: "analyzer", label: "Excel Analyzer", icon: FileSpreadsheet, key: "excel_analyzer" },
    { id: "geo", label: "Geo Fencing", icon: MapPin, key: "geo_fencing" },
    { id: "visualizer", label: "Movement Visualizer", icon: Navigation, key: "movement_visualizer" },
    { id: "converter", label: "LAC/Cell Converter", icon: Cpu, key: "lac_cell_converter" },
    { id: "eyecon", label: "Eyecon Lookup", icon: Eye, key: "eyecon_lookup" },
    { id: "face_search", label: "Face Search", icon: ImageIcon, key: "face_search" },
    { id: "extractor", label: "AI Extractor", icon: ScanText, key: "ai_extractor" },
    { id: "utilities", label: "Info Lookup", icon: LayoutGrid, key: "info_tools" },
    { id: "cdr", label: "CDR Generator", icon: FileCode, key: "cdr_generator" },
  ].filter(t => t.superAdminOnly ? isSuper : (isSuper || perms[t.key]));

  const isToolActive = TOOLS_MENU.some(t => t.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <SessionHeader initialSession={session}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-3">
          {/* Main Top Navigation (Restored cleanly) */}
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

            {/* 🛠️ Advanced Tools Dropdown */}
            {TOOLS_MENU.length > 0 && (
              <>
                {/* Desktop View: Dropdown Menu */}
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
                        {connectedDevicesCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        )}
                      </div>
                      <ChevronDown size={14} className="opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 mt-2">
                      {TOOLS_MENU.map((tool) => {
                        const Icon = tool.icon;
                        const isC2 = tool.id === "c2-command";
                        return (
                          <DropdownMenuItem 
                            key={tool.id} 
                            onClick={() => {
                              setActiveTab(tool.id);
                              setMobileToolsOpen(false);
                            }}
                            className={cn(
                              "gap-3 py-2.5 cursor-pointer justify-between",
                              activeTab === tool.id && "bg-slate-100 text-blue-600 font-bold",
                              isC2 && "bg-blue-50/50 text-blue-900 font-semibold"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon size={17} className={isC2 ? "text-blue-600" : "text-slate-500"} />
                              <span>{tool.label}</span>
                            </div>
                            {tool.badge && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md">
                                {tool.badge}
                              </span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile View: Collapsible Trigger */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 w-full",
                      isToolActive ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench size={18} className="shrink-0" />
                      <span>Advanced Tools</span>
                    </div>
                    <ChevronDown size={16} className={cn("transition-transform duration-300", mobileToolsOpen && "rotate-180")} />
                  </button>

                  {mobileToolsOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-100 space-y-1">
                      {TOOLS_MENU.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = activeTab === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setActiveTab(tool.id);
                              setMobileToolsOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all w-full",
                              isActive ? "text-blue-700 bg-blue-50" : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon size={16} />
                              <span>{tool.label}</span>
                            </div>
                            {tool.badge && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-bold">
                                {tool.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>
      </SessionHeader>

      {/* Main Container Area */}
      <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {{activeTab === "c2-command" && isSuper && <C2CommandCenterClient />}}
        {activeTab === "add-app" && <ApplicationManagement />}
        {activeTab === "search" && <IMEISearch />}
        {activeTab === "matched" && <MatchedIMEIsView initialSession={session} />}
        {(activeTab === "app-excel" && (isSuper || perms.app_to_excel)) && <ApplicationToExcelClient />}
        {(activeTab === "adv-reports" && (isSuper || perms.advanced_reports)) && <AdvancedReportClient />}
        {(activeTab === "usage-stats" && (isSuper || perms.usage_analytics)) && <UsageAnalyticsClient />}
        {activeTab === "imei-stats" && isSuper && <ImeiSearchReportClient />}
        {(activeTab === "analyzer" && (isSuper || perms.excel_analyzer)) && <ExcelAnalyzerClient />}
        {(activeTab === "geo" && (isSuper || perms.geo_fencing)) && <GeoFencingClient />}
        {(activeTab === "visualizer" && (isSuper || perms.movement_visualizer)) && <MovementVisualizerClient />}
        {(activeTab === "converter" && (isSuper || perms.lac_cell_converter)) && <LacCellConverterClient />}
        {(activeTab === "eyecon" && (isSuper || perms.eyecon_lookup)) && <EyeconLookupClient />}
        {(activeTab === "face_search" && (isSuper || perms.face_search)) && <FaceSearchClient />}
        {(activeTab === "extractor" && (isSuper || perms.ai_extractor)) && <ApplicationExtractorClient />}
        {(activeTab === "utilities" && (isSuper || perms.info_tools)) && <InfoToolsClient />}
        {(activeTab === "cdr" && (isSuper || perms.cdr_generator)) && <CdrFormatClient />}
        {activeTab === "users" && <AddUserForm />}
        {(activeTab === "tokens" && (isSuper || perms.token_pool)) && <TokenManagement />}
      </main>
    </div>
  );
}
