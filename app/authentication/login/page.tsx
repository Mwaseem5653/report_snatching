"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getApiUrl } from "@/lib/utils";

import { auth, db } from "@/firebaseconfig";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // ... (keep useEffect for logout)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // 1. Check if user exists via Server API (to avoid Firestore Permission issues)
      const checkRes = await fetch(getApiUrl("/api/auth/check-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const checkData = await checkRes.json();

      if (!checkData.exists) {
        setError(checkData.error || "This email address is not registered in our system.");
        setLoading(false);
        return;
      }

      // 2. Send Firebase Password Reset Email
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      toast.success("Password reset email sent!");
    } catch (err: any) {
      console.error("Reset Error:", err);
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const performLogin = useCallback(async (loginEmail: string, loginPass: string) => {
    // ... (rest of performLogin)
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
  }, []);

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
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {isForgotPassword ? "Reset Password" : "Officer Login"}
               </h2>
               <p className="text-slate-500 font-medium text-sm">
                {isForgotPassword 
                  ? "Enter your email to receive a reset link" 
                  : "Authorized Personnel Access Only"}
               </p>
            </div>

            {resetSent ? (
              <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-emerald-900">Reset Link Sent!</h3>
                  <p className="text-sm text-emerald-700/70">Please check your inbox (and spam folder) for further instructions.</p>
                </div>
                <Button 
                  onClick={() => { setIsForgotPassword(false); setResetSent(false); setError(""); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={isForgotPassword ? handleForgotPassword : loginUser} className="space-y-5">
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

                {!isForgotPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</Label>
                      <button 
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(""); }}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
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
                )}

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
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> <span>{isForgotPassword ? "Verifying..." : "Validating..."}</span></>
                  ) : (
                    isForgotPassword ? "Send Reset Link" : "Sign In to Account"
                  )}
                </Button>

                {isForgotPassword && (
                  <button 
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setError(""); }}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors py-2"
                  >
                    ← Back to Login
                  </button>
                )}
              </form>
            )}

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
