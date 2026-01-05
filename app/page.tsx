"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import Footer from "@/components/Footer";
import Image from "next/image";
import { 
  ShieldCheck, 
  Siren, 
  Smartphone, 
  Clock, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  FileText,
  PhoneCall,
  Info,
  ExternalLink
} from "lucide-react";

export default function LandingPage() {
  const publicServices = [
    { 
      icon: <FileText className="h-8 w-8" />,
      title: "Online Complaint", 
      titleUr: "آن لائن شکایت",
      desc: "Lodge reports for mobile snatching, theft, or loss from the safety of your home.",
      link: "/dashboard/normal-user"
    },
    { 
      icon: <Search className="h-8 w-8" />,
      title: "Verify IMEI", 
      titleUr: "آئی ایم ای آئی تصدیق",
      desc: "Check if a mobile device is reported stolen in the Sindh Police database.",
      link: "/authentication/login" // Or a public search if we enable it
    },
    { 
      icon: <ShieldCheck className="h-8 w-8" />,
      title: "Character Certificate", 
      titleUr: "کیریکٹر سرٹیفکیٹ",
      desc: "Apply for official police character verification certificates online.",
      link: "#"
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      
      {/* 🔹 Top Emergency Bar */}
      <div className="bg-[#0a2c4e] text-white py-2 px-6 border-b border-white/10 hidden md:block">
        <div className="container mx-auto flex justify-between items-center text-[11px] font-bold tracking-widest uppercase">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><PhoneCall size={14} className="text-red-500" /> Emergency Response: 15</span>
            <span className="flex items-center gap-2"><Info size={14} className="text-blue-400" /> IGP Complaint Cell: 9110</span>
          </div>
          <div className="flex gap-4">
            <button className="hover:text-blue-300 transition-colors">English</button>
            <span className="text-white/20">|</span>
            <button className="hover:text-blue-300 transition-colors font-urdu">اردو</button>
          </div>
        </div>
      </div>

      {/* 🔹 Main Institutional Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="container mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16">
               <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" priority />
            </div>
            <div className="leading-none border-l-2 border-slate-100 pl-4">
              <h1 className="text-2xl font-black text-[#0a2c4e] tracking-tight">SINDH POLICE</h1>
              <p className="text-[10px] font-bold text-red-600 tracking-[0.3em] uppercase mt-1">Proud to Serve</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-10 text-xs font-black text-slate-600 uppercase tracking-[0.15em]">
             <Link href="#" className="hover:text-[#0a2c4e] transition-colors border-b-2 border-transparent hover:border-[#0a2c4e] pb-1">About Us</Link>
             <Link href="#" className="hover:text-[#0a2c4e] transition-colors border-b-2 border-transparent hover:border-[#0a2c4e] pb-1">Public Services</Link>
             <Link href="#" className="hover:text-[#0a2c4e] transition-colors border-b-2 border-transparent hover:border-[#0a2c4e] pb-1">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/authentication/login">
              <Button variant="outline" className="font-bold text-[#0a2c4e] border-[#0a2c4e] hover:bg-[#0a2c4e] hover:text-white h-11 px-6 rounded-none uppercase text-xs tracking-widest transition-all">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 🔹 Hero Section: Formal & Authoritative */}
      <section className="relative bg-slate-50 overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 z-0 opacity-5">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <div className="container mx-auto px-6 py-16 lg:py-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="flex-1 space-y-8 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm shadow-lg shadow-red-600/20">
                <Siren size={14} /> Official Reporting Portal
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-[#0a2c4e] tracking-tighter leading-[0.95]">
                Dignity. Safety.<br />
                <span className="text-red-600 underline decoration-slate-200 underline-offset-8">Protection.</span>
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium border-l-4 border-red-600 pl-6 italic">
                Sindh Police is committed to providing efficient, transparent, and citizen-centric policing through digital transformation.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Link href="/dashboard/normal-user">
                  <Button className="h-14 px-10 rounded-none text-sm font-black uppercase tracking-widest bg-[#0a2c4e] hover:bg-slate-800 text-white shadow-xl transition-all duration-300 w-full sm:w-auto group">
                    Lodge Complaint <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/authentication/login">
                  <Button variant="outline" className="h-14 px-10 rounded-none text-sm font-black uppercase tracking-widest border-2 border-[#0a2c4e] text-[#0a2c4e] hover:bg-[#0a2c4e] hover:text-white w-full sm:w-auto transition-all">
                    Search Database
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="flex-1 w-full"
            >
               <div className="relative w-full max-w-lg mx-auto lg:mr-0 aspect-[4/3] bg-white p-4 shadow-2xl border-t-8 border-[#0a2c4e] rounded-b-xl overflow-hidden">
                  <Image 
                    src="/logo1.png" 
                    alt="Sindh Police Operations" 
                    fill 
                    className="object-contain p-8 grayscale hover:grayscale-0 transition-all duration-700"
                    priority
                  />
               </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🔹 Public Services Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-2">
             <h2 className="text-3xl font-black text-[#0a2c4e] tracking-tight uppercase">Public Services</h2>
             <div className="w-20 h-1 bg-red-600 mx-auto"></div>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Safe & Accessible Citizen Support</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {publicServices.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group p-8 border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all duration-500 relative"
              >
                <div className="mb-6 text-[#0a2c4e] group-hover:text-red-600 transition-colors">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{service.title}</h3>
                <p className="text-blue-600 font-urdu font-bold text-sm mb-4 leading-none">{service.titleUr}</p>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{service.desc}</p>
                <Link href={service.link} className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-[#0a2c4e] group-hover:text-red-600 transition-colors">
                   Access Service <ExternalLink size={12} className="ml-2" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🔹 Official Message Bar */}
      <section className="bg-[#0a2c4e] text-white py-16 overflow-hidden relative">
        <div className="container mx-auto px-6 text-center max-w-4xl space-y-8">
           <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none uppercase">Empowering Citizens Through Digital Justice</h2>
           <p className="text-blue-100 text-lg opacity-80 leading-relaxed font-medium">
              The Sindh Police is dedicated to modernizing law enforcement. Our goal is to bridge the gap between police and public through technology, ensuring accountability and swift response.
           </p>
           <div className="pt-4 flex flex-wrap justify-center gap-12 text-slate-300">
              <div className="text-center">
                 <p className="text-3xl font-black text-white">15</p>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Police Helpline</p>
              </div>
              <div className="text-center">
                 <p className="text-3xl font-black text-white">9110</p>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em]">IGP Complaint Cell</p>
              </div>
              <div className="text-center">
                 <p className="text-3xl font-black text-white">88.6</p>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Sindh Police FM</p>
              </div>
           </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
