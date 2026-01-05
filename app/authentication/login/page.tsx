"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // ✅ Professional Error Handling: Instead of throwing, we just set state
        setError(data.error || "Authentication failed. Please check your credentials.");
        setLoading(false);
        return; // Stop execution
      }

      // Success: Redirect
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login Error:", err);
      setError("Unable to connect to the authentication server. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      
      {/* 🔹 Left Panel: Branding */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0a2c4e] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm font-bold mb-8 uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Portal
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-14 h-14 bg-white rounded-full p-1 shadow-xl">
               <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tight">SINDH POLICE</h1>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Official Access</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
           <h2 className="text-5xl font-black leading-[1.1] tracking-tighter">
             Digital Justice <br />
             <span className="text-blue-400">Begins Here.</span>
           </h2>
           <p className="text-slate-300 text-lg leading-relaxed font-medium">
             This secure portal is reserved for authorized personnel of Sindh Police. Please authenticate using your official credentials to access the management systems.
           </p>
           <div className="flex gap-4 pt-4">
             <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-blue-100">
                <ShieldCheck size={16} className="text-blue-400" /> Authorized Only
             </div>
           </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} Sindh Police Software Section
        </div>
      </div>

      {/* 🔹 Right Panel: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-white lg:bg-slate-50">
         <div className="absolute top-6 left-6 md:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-wider">
              <ArrowLeft size={16} /> Home
            </Link>
         </div>

         <div className="w-full max-w-md space-y-10">
            <div className="text-center md:text-left space-y-2">
               <div className="md:hidden flex justify-center mb-6">
                  <div className="relative w-20 h-20 bg-white rounded-full p-2 shadow-2xl border border-slate-100">
                    <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" />
                  </div>
               </div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">Officer Login</h2>
               <p className="text-slate-500 font-medium">Enter your official credentials to proceed to the dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
               <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@sindhpolice.gov.pk" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium text-slate-700"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium text-slate-700"
                    />
                  </div>
               </div>

               {error && (
                 <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                    <span>{error}</span>
                 </div>
               )}

               <Button 
                 type="submit" 
                 disabled={loading}
                 className="w-full h-14 rounded-2xl bg-[#0a2c4e] hover:bg-slate-800 text-white font-black uppercase tracking-[0.15em] text-sm shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all"
               >
                 {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</> : "Sign In to Dashboard"}
               </Button>
            </form>

            <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest pt-4">
               Secure Official Access Portal
            </div>
         </div>
      </div>

    </div>
  );
}
