"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Footer from "@/components/Footer";
import Image from "next/image";
import { 
  ShieldCheck, 
  Siren, 
  Search, 
  ArrowRight,
  FileText,
  PhoneCall,
  Info,
  ExternalLink
} from "lucide-react";

// Capacitor Imports
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);
  const adsInitialized = useRef(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroImages = ["/disimage1.jpg", "/disimage2.jpg", "/disimage3.jpg"];
  
  // 🔹 Modern Routing: Redirect Native users immediately
  useEffect(() => {
    const isApp = Capacitor.getPlatform() !== 'web';
    setIsNative(isApp);
    
    if (isApp) {
        // Skip landing page on Android/iOS
        router.push("/authentication/login");
    }
  }, [router]);

  // 🔹 Cycle through different modern animations
  const transitionTypes = ["block", "slide", "scale"];
  const currentTransition = transitionTypes[currentImageIndex % transitionTypes.length];

  // 🔹 Modernized Block Reveal Animation Configuration
  const blockSize = 8; // 8x8 grid
  const blocks = Array.from({ length: blockSize * blockSize });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    // 🚀 Initialize Google AdSense safely
    if (!adsInitialized.current) {
        try {
            const adsbygoogle = (window as any).adsbygoogle;
            if (adsbygoogle && document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])').length > 0) {
                adsbygoogle.push({});
                adsInitialized.current = true;
            }
        } catch (err) {
            console.error("AdSense push error:", err);
        }
    }

    return () => clearInterval(timer);
  }, []);

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
      link: "/authentication/login"
    },
    { 
      icon: <ShieldCheck className="h-8 w-8" />,
      title: "Character Certificate", 
      titleUr: "کیریکٹر سرٹیفکیٹ",
      desc: "Apply for official police character verification certificates online.",
      link: "#"
    },
  ];

  // While redirecting native users, show a branded loader
  if (isNative) {
      return (
          <div className="min-h-screen bg-[#0a2c4e] flex items-center justify-center">
              <div className="relative w-24 h-24 animate-pulse">
                  <Image src="/logo.png" alt="Loading..." fill className="object-contain" />
              </div>
          </div>
      );
  }

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
               <Image src="/logo.png" alt="Sindh Police Logo" fill className="object-contain" priority />
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

      {/* 🔹 Hero Section */}
      <section className="relative bg-slate-50 overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 z-0 opacity-5">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <div className="container mx-auto px-6 py-16 lg:py-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 w-full"
            >
               <div className="relative w-full max-w-lg mx-auto lg:mr-0 aspect-[4/3] bg-slate-50 shadow-2xl border-t-8 border-[#0a2c4e] rounded-b-xl overflow-hidden flex items-center justify-center">
                  
                  {/* 🔹 Permanent Background Logo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <div className="relative w-48 h-48">
                      <Image src="/logo.png" alt="Sindh Police Background" fill className="object-contain grayscale" />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentImageIndex}
                      initial={
                        currentTransition === "slide" ? { x: "100%", opacity: 0 } :
                        currentTransition === "scale" ? { scale: 1.2, opacity: 0 } :
                        { opacity: 0 }
                      }
                      animate={{ x: 0, scale: 1, opacity: 1 }}
                      exit={
                        currentTransition === "slide" ? { x: "-100%", opacity: 0 } :
                        currentTransition === "scale" ? { scale: 0.8, opacity: 0 } :
                        { opacity: 0 }
                      }
                      transition={{ duration: 2.0, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 z-10"
                    >
                      <Image 
                        src={heroImages[currentImageIndex]} 
                        alt="Sindh Police Operations" 
                        fill 
                        className="object-cover"
                        priority
                      />
                      
                      {currentTransition === "block" && (
                        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 z-20 pointer-events-none">
                          {blocks.map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 0 }}
                              exit={{ opacity: 1 }}
                              transition={{
                                duration: 1.5,
                                delay: Math.random() * 1.2,
                                ease: "easeInOut"
                              }}
                              className="bg-slate-50"
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 🔹 Public Services Grid */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full -mr-48 -mt-48 opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-50 rounded-full -ml-48 -mb-48 opacity-50 blur-3xl" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16 space-y-2">
             <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="text-3xl font-black text-[#0a2c4e] tracking-tight uppercase"
             >
               Public Services
             </motion.h2>
             <motion.div 
               initial={{ width: 0 }}
               whileInView={{ width: 80 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, delay: 0.2 }}
               className="h-1 bg-red-600 mx-auto"
             />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Safe & Accessible Citizen Support</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {publicServices.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ 
                  opacity: { duration: 0.5, delay: i * 0.15 },
                  y: { duration: 0.5, delay: i * 0.15 },
                  scale: { duration: 0.2 }
                }}
                className="group p-8 border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all duration-500 relative rounded-2xl overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-0 bg-red-600 group-hover:h-full transition-all duration-500" />
                <div className="mb-6 text-[#0a2c4e] group-hover:text-red-600 transition-colors transform group-hover:scale-110 duration-300">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{service.title}</h3>
                <p className="text-blue-600 font-urdu font-bold text-sm mb-4 leading-none">{service.titleUr}</p>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{service.desc}</p>
                <Link href={service.link} className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-[#0a2c4e] group-hover:text-red-600 transition-colors">
                   Access Service <ExternalLink size={12} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🔹 Official Message Bar */}
      <section className="bg-[#0a2c4e] text-white py-20 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        
        <div className="container mx-auto px-6 text-center max-w-4xl space-y-8 relative z-10">
           <motion.h2 
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="text-3xl md:text-5xl font-black tracking-tight leading-none uppercase"
           >
             Empowering Citizens Through Digital Justice
           </motion.h2>
           <p className="text-blue-100 text-lg opacity-80 leading-relaxed font-medium">
              The Sindh Police is dedicated to modernizing law enforcement. Our goal is to bridge the gap between police and public through technology, ensuring accountability and swift response.
           </p>
           
           <div className="pt-8 flex flex-wrap justify-center gap-12 text-slate-300">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-center group"
              >
                 <p className="text-4xl font-black text-white group-hover:text-red-500 transition-colors duration-500">15</p>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300">Police Helpline</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center group"
              >
                 <p className="text-4xl font-black text-white group-hover:text-red-500 transition-colors duration-500">9110</p>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300">IGP Complaint Cell</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-center group"
              >
                 <p className="text-4xl font-black text-white group-hover:text-red-500 transition-colors duration-500">88.6</p>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300">Sindh Police FM</p>
              </motion.div>
           </div>
        </div>
      </section>

      {/* 🔹 Advertisement / Partners Section */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-6">
            {/* 🚀 Google AdSense Unit */}
            <div className="w-full max-w-4xl min-h-[90px] flex items-center justify-center overflow-hidden">
                <ins className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-5961112055480826"
                    data-ad-slot="auto"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}