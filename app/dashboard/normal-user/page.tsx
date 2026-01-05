"use client";

import React from "react";
import Image from "next/image";
import AddApplicationFormNormalUser from "@/components/normaluser/normaluserform";

export default function UserAddApplication() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ---------- HEADER SECTION ---------- */}
      <header className="bg-[#0a2c4e] text-white py-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between px-4 md:px-12">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Sindh Police Logo"
              width={60}
              height={60}
              className="rounded-full border border-white"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wide">
                Sindh Police Complaint Portal
              </h1>
              <p className="text-sm text-gray-200">
                Mobile Snatching / Theft Application Form
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- FORM SECTION ---------- */}
      <main className="flex-grow flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-gray-200">
         
          {/* Embed your same working form */}
          <AddApplicationFormNormalUser />
        </div>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="bg-[#0a2c4e] text-gray-300 text-center py-3 text-sm">
        © {new Date().getFullYear()} Sindh Police | All Rights Reserved
      </footer>
    </div>
  );
}
