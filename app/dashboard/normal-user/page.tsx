"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import AddApplicationFormNormalUser from "@/components/normaluser/normaluserform";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

export default function UserAddApplication() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      
      {/* 🔹 Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl -mr-64 -mt-32 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-50/40 rounded-full blur-3xl -ml-48 -mb-24 z-0"></div>

      {/* ---------- NAVBAR ---------- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="relative w-12 h-12">
               <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" priority />
            </div>
            <div className="border-l border-slate-200 pl-4">
              <h1 className="text-xl font-black text-[#0a2c4e] tracking-tight uppercase">SINDH POLICE</h1>
              <p className="text-[9px] font-bold text-red-600 tracking-[0.2em] uppercase">Digital Reporting Portal</p>
            </div>
          </Link>
          
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Emergency Support</span>
                <span className="text-red-600">Dial 15</span>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="flex items-center gap-2 text-emerald-600 px-4 py-1.5 bg-emerald-50 rounded-full">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Secure Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="flex-grow py-8 md:py-12 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <AddApplicationFormNormalUser />
        </div>
      </main>

      <Footer />
    </div>
  );
}
