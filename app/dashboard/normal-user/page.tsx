"use client";

import React from "react";
import Image from "next/image";
import AddApplicationFormNormalUser from "@/components/normaluser/normaluserform";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Info, PhoneCall, ArrowRight, FileText, CheckCircle2, Sparkles } from "lucide-react";

export default function UserAddApplication() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      
      {/* 🔹 Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl -mr-64 -mt-32 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-50/40 rounded-full blur-3xl -ml-48 -mb-24 z-0"></div>

      {/* ---------- NAVBAR ---------- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
               <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" priority />
            </div>
            <div className="border-l border-slate-200 pl-4">
              <h1 className="text-xl font-black text-[#0a2c4e] tracking-tight uppercase">SINDH POLICE</h1>
              <p className="text-[9px] font-bold text-red-600 tracking-[0.2em] uppercase">Digital Reporting Portal</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Emergency Support</span>
                <span className="text-red-600">Dial 15</span>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <span className="bg-blue-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20">
              Public Access
            </span>
          </div>
        </div>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="flex-grow py-12 px-6 relative z-10">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Instructions & Help (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-3 space-y-8">
            <Button 
                type="button"
                onClick={() => {
                    const event = new CustomEvent('openAiModal');
                    window.dispatchEvent(event);
                }}
                className="w-full bg-gradient-to-r from-[#0a2c4e] to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/20 group transition-all"
            >
                <Sparkles size={18} className="mr-2 text-yellow-400 group-hover:scale-110 transition-transform" />
                AI Auto-Fill Form
            </Button>

            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-32">
                <h2 className="text-sm font-black text-[#0a2c4e] uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
                    <Info size={16} className="text-blue-600" /> Instructions
                </h2>
                
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Fill in your personal details as per CNIC.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Provide accurate IMEI number for device tracking.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Upload clear photos of the mobile box and signed form.</p>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50">
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Need Assistance?</p>
                        <a href="tel:15" className="flex items-center gap-2 text-red-600 font-bold hover:underline">
                            <PhoneCall size={14} /> Helpline 15
                        </a>
                        <p className="text-[10px] text-slate-500 leading-snug">Available 24/7 for emergency reporting across Sindh.</p>
                    </div>
                </div>
            </div>

            <div className="px-6">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified Portal</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    This portal is end-to-end encrypted. Your data is stored securely in the Sindh Police Central Database.
                </p>
            </div>
          </div>

          {/* Center: Form */}
          <div className="lg:col-span-9">
            <AddApplicationFormNormalUser />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
