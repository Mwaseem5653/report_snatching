"use client";

import SessionHeader from "@/components/session-avtar/page";
import IMEISearch from "@/components/searchiemis/searchiemi";
import { Search } from "lucide-react";

export default function MarketUserClient({ initialSession }: { initialSession: any }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SessionHeader initialSession={initialSession}>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-lg text-blue-700 font-medium text-sm border border-blue-100">
              <Search size={16} /> IMEI Search Portal
          </div>
      </SessionHeader>

      <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <IMEISearch />
      </main>
    </div>
  );
}