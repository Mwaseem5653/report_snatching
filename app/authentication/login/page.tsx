"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, getApiUrl } from "@/lib/utils";

// Capacitor Imports
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNative, setIsNative] = useState(false);

  // 1. Load remembered credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      setIsNative(Capacitor.isNativePlatform());
      try {
        const { value: savedEmail } = await Preferences.get({ key: "remembered_email" });
        const { value: savedPassword } = await Preferences.get({ key: "remembered_password" });
        const { value: isRemembered } = await Preferences.get({ key: "is_remembered" });

        if (isRemembered === "true" && savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Error loading saved credentials:", err);
      }
    };
    loadSavedCredentials();
  }, []);

  const performLogin = useCallback(async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError("");
    try {
      const apiUrl = getApiUrl("/api/auth/create-session");
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      // 💾 Handle Remember Me
      if (rememberMe) {
        await Preferences.set({ key: "remembered_email", value: loginEmail });
        await Preferences.set({ key: "remembered_password", value: loginPass });
        await Preferences.set({ key: "is_remembered", value: "true" });
      } else {
        await Preferences.remove({ key: "remembered_email" });
        await Preferences.remove({ key: "remembered_password" });
        await Preferences.remove({ key: "is_remembered" });
      }

      // 🛡️ ROLE-BASED REDIRECTION
      const role = (data.role || "").toLowerCase();
      const ROLE_PATHS: Record<string, string> = {
        super_admin: "/dashboard/super-admin",
        admin: "/dashboard/admin",
        officer: "/dashboard/officer-user",
        market_user: "/dashboard/market-user",
        ps_user: "/dashboard/ps-user",
        advanced_tool: "/dashboard/advanced-tool",
        user: "/dashboard/normal-user",
      };

      const destination = ROLE_PATHS[role] || "/dashboard/normal-user";
      window.location.href = destination;
    } catch (err) {
      console.error("Login Fetch Error:", err);
      setError("Unable to connect to the authentication server. Please check your internet connection.");
      setLoading(false);
    }
  }, [rememberMe]);

  const loginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-x-hidden">
      
      {/* 💻 Desktop Branding Panel (Side Panel) */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0a2c4e] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm font-bold mb-12 uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Portal
          </Link>
          
          <div className="space-y-4">
            <h1 className="text-xl font-bold tracking-widest uppercase text-blue-400">Sindh Police</h1>
            <h2 className="text-6xl font-black leading-[1.1] tracking-tighter">
              Digital Justice <br />
              <span className="text-blue-300">Begins Here.</span>
            </h2>
            <p className="text-blue-100/60 text-lg font-medium max-w-md leading-relaxed">
              Advancing law enforcement through cutting-edge digital intelligence and centralized data analytics.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-1">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Official Command & Control Portal</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              © {new Date().getFullYear()} Sindh Police Software Section
            </p>
        </div>
      </div>

      {/* Login Form Area */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-12 bg-white min-h-screen md:min-h-0">
         <div className="w-full max-w-md space-y-6">
            
            {/* 📱 Mobile Logo (Visible only on mobile/small screens) */}
            <div className="md:hidden flex flex-col items-center mb-2">
                <div className="relative w-20 h-20 bg-white rounded-full p-1 shadow-2xl border border-slate-100 mb-4">
                   <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" priority />
                </div>
                <h1 className="text-xl font-black tracking-tighter text-[#0a2c4e] uppercase">SINDH POLICE</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Proud to Serve</p>
            </div>

            <div className="text-center md:text-left space-y-2">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Officer Login</h2>
               <p className="text-slate-500 font-medium text-sm">Authorized Personnel Access Only</p>
            </div>

            <form onSubmit={loginUser} className="space-y-5">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
                    <Input 
                      type="email" 
                      placeholder="name@sindhpolice.gov.pk" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
               </div>

               <div className="flex items-center space-x-2 px-1">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 h-5 w-5"
                  />
                  <Label htmlFor="remember" className="text-xs font-bold text-slate-600 cursor-pointer uppercase tracking-tight">
                    Remember Me
                  </Label>
               </div>

               {error && (
                 <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> 
                    <span className="break-words">{error}</span>
                 </div>
               )}

               <Button 
                 type="submit" 
                 disabled={loading}
                 className="w-full h-14 rounded-2xl bg-[#0a2c4e] hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-sm shadow-xl transition-all"
               >
                 {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> <span>Validating...</span></> : "Sign In to Account"}
               </Button>
            </form>

            <div className="pt-6 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Official Security Standards</p>
                <div className="flex justify-center gap-6 text-slate-300">
                    <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase">Secure SSL</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase">Direct Auth</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase">Encrypted</span>
                    </div>
                </div>
            </div>
         </div>
      </div>

    </div>
  );
}
