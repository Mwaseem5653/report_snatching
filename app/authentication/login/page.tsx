"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowLeft, ShieldCheck, AlertCircle, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Capacitor Imports
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNative, setIsNative] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  // Use Capacitor.Plugins for better reliability with remote URLs
  const NativeBiometric = (Capacitor.Plugins as any).NativeBiometric;

  useEffect(() => {
    const checkNative = async () => {
      const isApp = Capacitor.getPlatform() !== 'web';
      setIsNative(isApp);
      
      if (isApp) {
        console.log("Capacitor App Detected. Initializing Biometrics...");
        
        const attemptCheck = async (count: number) => {
            try {
                if (!NativeBiometric) {
                    console.warn("NativeBiometric plugin not found in Capacitor.Plugins");
                    return false;
                }

                const result = await NativeBiometric.isAvailable();
                if (result.isAvailable) {
                    setBiometricAvailable(true);
                    console.log("Biometric is READY:", result.biometryType);
                    
                    const { value: savedEmail } = await Preferences.get({ key: 'saved_email' });
                    if (savedEmail) {
                        setUseBiometric(true);
                        setTimeout(() => handleBiometricLogin(), 1000);
                    }
                    return true;
                }
            } catch (e) {
                console.warn(`Biometric check attempt ${count} failed:`, e);
                // Allow toggle if we suspect hardware is there despite check failure
                setBiometricAvailable(true); 
            }
            return false;
        };

        const ok = await attemptCheck(1);
        if (!ok) {
            setTimeout(() => attemptCheck(2), 2000);
        }
      }
    };
    checkNative();
  }, []);

  useEffect(() => {
    const clearSession = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Session cleanup failed:", e);
        }
    };
    clearSession();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      if (!NativeBiometric) {
          setError("Biometric plugin not found. Please try again or login manually.");
          return;
      }

      setLoading(true);
      setError("");

      const verify = await NativeBiometric.verifyIdentity({
        reason: "Log in to your account",
        title: "Biometric Login",
        subtitle: "Confirm identity to continue",
        description: "Use fingerprint or face ID",
      });

      const { value: savedEmail } = await Preferences.get({ key: 'saved_email' });
      if (!savedEmail) {
        setError("No biometric credentials found. Please login manually first.");
        setLoading(false);
        return;
      }

      const credentials = await NativeBiometric.getCredentials({
        server: "kpts.com.pk"
      });

      if (credentials) {
        await loginUser(credentials.username, credentials.password);
      }
    } catch (err: any) {
      console.error("Biometric Error:", err);
      setError(`Biometric Login Error: ${err.message || "Failed to verify identity"}`);
      setLoading(false);
    }
  };

  const loginUser = async (userEmail: string, userPass: string) => {
    try {
      const res = await fetch("/api/auth/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      // 🚀 Biometric Save Logic: ONLY if toggle is ON
      if (isNative && useBiometric && NativeBiometric) {
          try {
              await Preferences.set({ key: 'saved_email', value: userEmail });
              
              await NativeBiometric.setCredentials({
                  username: userEmail,
                  password: userPass,
                  server: "kpts.com.pk"
              });
              console.log("Biometric credentials saved successfully.");
          } catch (e: any) {
              console.error("Biometric save failed:", e);
              setError(`Biometric Setup Failed: ${e.message || "Could not save credentials. Make sure screen lock is enabled."}`);
              setLoading(false);
              return; 
          }
      }

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
      setError("Unable to connect to the authentication server.");
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    loginUser(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-x-hidden">
      
      {/* 🔹 Left Panel: Branding (Desktop) */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0a2c4e] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm font-bold mb-8 uppercase tracking-widest text-wrap">
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

      {/* 🔹 Right Panel: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-2 md:p-12 relative bg-white lg:bg-slate-50 min-h-screen md:min-h-0">
         <div className="absolute top-6 left-6 md:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-wider">
              <ArrowLeft size={16} /> Home
            </Link>
         </div>

         <div className="w-full max-w-full sm:max-w-md px-4 space-y-6 md:space-y-10 py-12">
            <div className="text-center md:text-left space-y-2">
               <div className="flex justify-center md:hidden mb-6">
                  <div className="relative w-16 h-16 bg-white rounded-full p-2 shadow-2xl border border-slate-100 ring-4 ring-blue-50/50">
                    <Image src="/logo.png" alt="Sindh Police" fill className="object-contain p-1.5" priority />
                  </div>
               </div>
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Officer Login</h2>
               <p className="text-slate-500 font-medium text-sm md:text-base">Enter official credentials to proceed.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
               <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
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
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Password</Label>
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

               {isNative && (
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <Fingerprint size={20} className="text-blue-600" />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">Biometric Login</p>
                        <p className="text-[9px] text-slate-500 font-medium">Toggle to setup Fingerprint</p>
                      </div>
                    </div>
                    <Switch 
                      checked={useBiometric}
                      onCheckedChange={setUseBiometric}
                    />
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
                 className="w-full h-12 rounded-xl bg-[#0a2c4e] hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs shadow-md active:scale-[0.98] transition-all"
               >
                 {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> <span>Wait...</span></> : "Sign In"}
               </Button>

               {isNative && (
                 <div className="space-y-3">
                    <Button 
                    type="button"
                    variant="outline"
                    onClick={handleBiometricLogin}
                    disabled={loading}
                    className="w-full h-11 rounded-xl border-2 border-blue-100 bg-white hover:bg-blue-50 text-blue-900 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-3 transition-all"
                    >
                    <Fingerprint size={18} className="text-blue-600" />
                    Use Biometrics to Login
                    </Button>
                    <button 
                      type="button" 
                      onClick={async () => {
                          if (NativeBiometric) {
                            await NativeBiometric.deleteCredentials({ server: "kpts.com.pk" });
                          }
                          await Preferences.remove({ key: 'saved_email' });
                          window.location.reload();
                      }}
                      className="text-[9px] text-slate-400 font-bold uppercase tracking-widest hover:text-red-500 transition-colors mx-auto block"
                    >
                        Reset / Switch Account
                    </button>
                 </div>
               )}
            </form>

            <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-4">
               Secure Official Portal
            </div>
         </div>
      </div>

    </div>
  );
}