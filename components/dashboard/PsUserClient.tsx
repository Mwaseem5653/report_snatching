"use client";

import { useState } from "react";
import SessionHeader from "@/components/session-avtar/page";
import IMEISearch from "@/components/searchiemis/searchiemi";
import Psusersapplication from "@/components/PsAddApplic/addaplication";
import { Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "search", label: "Search IMEI", icon: Search },
  { id: "applications", label: "Applications", icon: FileText },
];

export default function PsUserClient({ initialSession }: { initialSession: any }) {
  const [activeTab, setActiveTab] = useState<"search" | "applications">("search");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
    <SessionHeader initialSession={initialSession}>
        <nav className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
        {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
        </nav>
    </SessionHeader>

    <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "search" ? <IMEISearch /> : <Psusersapplication />}
    </main>
    </div>
  );
}
