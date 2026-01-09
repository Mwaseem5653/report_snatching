"use client";

import { useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_TABS = [
  { id: "add-app", label: "Applications", icon: PlusCircle },
  { id: "search", label: "Search IMEI", icon: Search },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "matched", label: "Matched", icon: FileCheck },
  { id: "users", label: "Users", icon: Users },
];

const TOOLS_MENU = [
  { id: "analyzer", label: "Excel Analyzer", icon: FileSpreadsheet },
  { id: "extractor", label: "AI Extractor", icon: ScanText },
  { id: "utilities", label: "Info Lookup", icon: LayoutGrid },
  { id: "cdr", label: "CDR Generator", icon: FileCode },
];

export default function SuperAdminDashboard({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<string>("add-app");

  const isToolActive = TOOLS_MENU.some(t => t.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
    <SessionHeader initialSession={initialSession}>
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
        </nav>
    </SessionHeader>

    <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "add-app" && <ApplicationManagement />}
        {activeTab === "search" && <IMEISearch />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "matched" && <MatchedIMEIsView />}
        
        {activeTab === "analyzer" && <ExcelAnalyzerClient />}
        {activeTab === "extractor" && <ApplicationExtractorClient />}
        {activeTab === "utilities" && <InfoToolsClient />}
        {activeTab === "cdr" && <CdrFormatClient />}

        {activeTab === "users" && <AddUserForm />}
    </main>
    </div>
  );
}