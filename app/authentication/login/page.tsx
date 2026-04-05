"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Capacitor Imports
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNative, setIsNative] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const hasAutoLoggedIn = useRef(false);

  useEffect(() => {
    const initApp = async () => {
      const isApp = Capacitor.getPlatform() !== 'web';
      setIsNative(isApp);
      
      if (isApp && !hasAutoLoggedIn.current) {
        // Check for saved credentials for Auto-Login
        const { value: savedEmail } = await Preferences.get({ key: 'rem_email' });
        const { value: savedPass } = await Preferences.get({ key: 'rem_pass' });
        
        if (savedEmail && savedPass) {
            setEmail(savedEmail);
            setPassword(savedPass);
            setRememberMe(true);
            hasAutoLoggedIn.current = true;
            // Trigger auto-login
            loginUser(savedEmail, savedPass);
        }
      }
    };
    initApp();
  }, []);

  const loginUser = async (userEmail: string, userPass: string) => {
    try {
      setLoading(true);
      setError("");

      // Mobile app ke liye absolute URL zaroori hai connection error khatam karne ke liye
      const baseUrl = Capacitor.getPlatform() !== 'web' ? 'https://kpts.com.pk' : '';

      const res = await fetch(`${baseUrl}/api/auth/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check credentials.");
        setLoading(false);
        if (isNative) {
            await Preferences.remove({ key: 'rem_email' });
            await Preferences.remove({ key: 'rem_pass' });
        }
        return;
      }

      // Handle "Remember Me" - Only save if login is successful
      if (isNative && rememberMe) {
          await Preferences.set({ key: 'rem_email', value: userEmail });
          await Preferences.set({ key: 'rem_pass', value: userPass });
      }

      // 🛡️ ROLE-BASED REDIRECTION (Unchanged logic)
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
      
    } catch (err: any) {
      console.error("Login Error:", err);
      setError("Unable to connect to the authentication server. Please check your internet.");
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-x-hidden">
      
      {/* 🔹 Left Panel */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0a2c4e] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm font-bold mb-8 uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Portal
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-14 h-14 bg-white rounded-full p-1 shadow-xl shrink-0">
               <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" priority />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tight">SINDH POLICE</h1>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Official Access</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} Sindh Police Software Section
        </div>
      </div>

      {/* 🔹 Right Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-2 md:p-12 relative bg-white lg:bg-slate-50 min-h-screen md:min-h-0">
         <div className="absolute top-6 left-6 md:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-wider">
              <ArrowLeft size={16} /> Home
            </Link>
         </div>

         <div className="w-full max-w-full sm:max-w-md px-4 space-y-6 py-12">
            <div className="text-center md:text-left space-y-2">
               <div className="flex justify-center md:hidden mb-6">
                  <div className="relative w-16 h-16 bg-white rounded-full p-2 shadow-2xl border border-slate-100 ring-4 ring-blue-50/50">
                    <Image src="/logo.png" alt="Sindh Police" fill className="object-contain p-1.5" priority />
                  </div>
               </div>
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Officer Login</h2>
               <p className="text-slate-500 font-medium text-sm md:text-base leading-snug">Authorized Personnel Access Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
               <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@sindhpolice.gov.pk" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium text-slate-700 w-full"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium text-slate-700 w-full"
                    />
                  </div>
               </div>

               <div className="flex items-center space-x-2 py-1 ml-1">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-xs font-bold text-slate-600 uppercase tracking-tight cursor-pointer select-none"
                  >
                    Remember Me
                  </label>
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
                 className="w-full h-12 rounded-xl bg-[#0a2c4e] hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs shadow-md active:scale-[0.98] transition-all"
               >
                 {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> <span>Validating...</span></> : "Sign In"}
               </Button>
            </form>

            <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-4">
               Secure Official Portal
            </div>
         </div>
      </div>

    </div>
  );
}