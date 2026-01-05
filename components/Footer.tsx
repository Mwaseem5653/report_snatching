"use client";

import React from "react";
import Image from "next/image";
import { Phone, Mail, MapPin, ShieldCheck, ExternalLink, Facebook, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f172a] text-slate-400 py-12 border-t border-slate-800">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Column 1: Brand & Mission */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 bg-white rounded-full p-1">
                <Image
                  src="/logo.png"
                  alt="Sindh Police Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">Sindh Police</h3>
                <p className="text-xs uppercase tracking-widest text-blue-500 font-bold">Government of Sindh</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Dedicated to maintaining peace, justice, and public safety. Our digital portal ensures transparent and efficient reporting for all citizens.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Facebook size={18} /></a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-blue-400 hover:text-white transition-all"><Twitter size={18} /></a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-pink-600 hover:text-white transition-all"><Instagram size={18} /></a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-500" /> Quick Links
            </h4>
            <ul className="space-y-4 text-sm">
              <li><a href="/" className="hover:text-white transition-colors flex items-center gap-2 group"><ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" /> Home / ہوم</a></li>
              <li><a href="/dashboard/normal-user" className="hover:text-white transition-colors flex items-center gap-2 group"><ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" /> File a Report / رپورٹ درج کریں</a></li>
              <li><a href="/authentication/login" className="hover:text-white transition-colors flex items-center gap-2 group"><ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" /> Officer Login / آفیسر لاگ ان</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2 group"><ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" /> Verification / تصدیق</a></li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <Phone size={18} className="text-blue-500" /> Emergency
            </h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Police Helpline</p>
                  <p className="text-white font-bold text-lg">15</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Support Email</p>
                  <p className="text-white text-sm">support@sindhpolice.gov.pk</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Address */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" /> Head Office
            </h4>
            <p className="text-sm leading-relaxed mb-4">
              Central Police Office (CPO),<br />
              I.I. Chundrigar Road, Karachi,<br />
              Sindh, Pakistan.
            </p>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
               <p className="text-xs text-slate-300 italic">"Proud to Serve - Sindh Police"</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs tracking-wider">
          <p>© {currentYear} Sindh Police IT Department. Developed for Public Safety.</p>
          <div className="flex gap-6 uppercase font-bold">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
