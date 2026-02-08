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
  Users, 
  FileCheck, 
  FileSpreadsheet, 
  ScanText, 
  LayoutGrid, 
  FileCode,
  Wrench,
  ChevronDown,
  Coins,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_TABS = [
  { id: "add-app", label: "Applications", icon: PlusCircle },
  { id: "search", label: "Search IMEI", icon: Search },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "matched", label: "Matched", icon: FileCheck },
];

export default function AdminClient({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<string>("add-app");
  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    async function refreshSession() {
        const res = await fetch("/api/auth/create-session");
        const data = await res.json();
        if (data.authenticated) setSession(data);
    }
    refreshSession();

    const handleSwitchTab = (e: any) => {
        if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => window.removeEventListener("switch-tab", handleSwitchTab);
  }, []);

  const perms = session?.permissions || {};
  const isSuper = session?.role === "super_admin";

  const TOOLS_MENU = [
    { id: "analyzer", label: "Excel Analyzer", icon: FileSpreadsheet, key: "excel_analyzer" },
    { id: "geo", label: "Geo Fencing", icon: MapPin, key: "geo_fencing" },
    { id: "extractor", label: "AI Extractor", icon: ScanText, key: "ai_extractor" },
    { id: "utilities", label: "Info Lookup", icon: LayoutGrid, key: "info_tools" },
    { id: "cdr", label: "CDR Generator", icon: FileCode, key: "cdr_generator" },
  ].filter(t => isSuper || perms[t.key]);

  const isToolActive = TOOLS_MENU.some(t => t.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
    <SessionHeader initialSession={session}>
        <nav className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
        {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
            >
                <Icon size={16} />
                <span className="hidden lg:inline">{tab.label}</span>
            </button>
            );
        })}

        {TOOLS_MENU.length > 0 && (
            <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 outline-none",
                    isToolActive 
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}>
                    <Wrench size={16} />
                    <span className="hidden lg:inline">Advanced Tools</span>
                    <ChevronDown size={14} className="opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {TOOLS_MENU.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <DropdownMenuItem 
                                key={tool.id} 
                                onClick={() => setActiveTab(tool.id)}
                                className={cn("gap-2 cursor-pointer", activeTab === tool.id && "bg-slate-100 text-blue-600 font-medium")}
                            >
                                <Icon size={16} />
                                {tool.label}
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        )}
        </nav>
    </SessionHeader>

    <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "add-app" && <ApplicationManagement />}
        {activeTab === "search" && <IMEISearch />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "matched" && <MatchedIMEIsView />}
        
        {(activeTab === "analyzer" && (isSuper || perms.excel_analyzer)) && <ExcelAnalyzerClient />}
        {(activeTab === "geo" && (isSuper || perms.geo_fencing)) && <GeoFencingClient />}
        {(activeTab === "extractor" && (isSuper || perms.ai_extractor)) && <ApplicationExtractorClient />}
        {(activeTab === "utilities" && (isSuper || perms.info_tools)) && <InfoToolsClient />}
        {(activeTab === "cdr" && (isSuper || perms.cdr_generator)) && <CdrFormatClient />}

        {activeTab === "users" && <AddUserForm />}
        {(activeTab === "tokens" && (isSuper || perms.token_pool)) && <TokenManagement />}
    </main>
    </div>
  );
}