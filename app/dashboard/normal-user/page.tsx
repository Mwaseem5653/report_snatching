"use client";

import React from "react";
import Image from "next/image";
import AddApplicationFormNormalUser from "@/components/normaluser/normaluserform";
import Footer from "@/components/Footer";

export default function UserAddApplication() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8] bg-[radial-gradient(#dbeafe_1px,transparent_1px)] [background-size:20px_20px]">
      
      {/* ---------- NAVBAR ---------- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
               <Image
                src="/logo.png"
                alt="Sindh Police Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">
                Sindh Police
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
                Complaint Management System
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
              Public Portal
            </span>
          </div>
        </div>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="flex-grow py-8 px-4 md:px-6">
        <div className="container mx-auto">
          <AddApplicationFormNormalUser />
        </div>
      </main>

      <Footer />
    </div>
  );
}
