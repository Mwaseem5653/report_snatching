"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowLeft, ShieldCheck, AlertCircle, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn, getApiUrl } from "@/lib/utils";

// Capacitor Imports
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Preferences } from "@capacitor/preferences";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Biometric States
  const [isNative, setIsNative] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [enableBioToggle, setEnableBioToggle] = useState(false);

  const performLogin = useCallback(async (loginEmail: string, loginPass: string, isManual: boolean = false) => {
      try {
        const apiUrl = getApiUrl("/api/auth/create-session");
        console.log("Attempting login at:", apiUrl);
        
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPass }),
        });

        const data = await res.json();
        console.log("Login response status:", res.status, data);

        if (!res.ok) {
          setError(data.error || `Error ${res.status}: Authentication failed.`);
          setLoading(false);
          return;
        }

      // 🔐 If toggle is ON or was already enabled, save/update credentials
      if (isManual && Capacitor.isNativePlatform() && enableBioToggle) {
        try {
          await Preferences.set({ key: "biometric_enabled", value: "true" });
          await Preferences.set({ key: "user_email", value: loginEmail });
          await Preferences.set({ key: "user_password", value: loginPass });
        } catch (bioErr: any) {
          console.error("Failed to enable biometrics:", bioErr);
        }
      } else if (isManual && Capacitor.isNativePlatform() && !enableBioToggle) {
        await Preferences.remove({ key: "biometric_enabled" });
        await Preferences.remove({ key: "user_email" });
        await Preferences.remove({ key: "user_password" });
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
      setError("Unable to connect to the authentication server. Check Internet or CORS.");
      setLoading(false);
    }
  }, [enableBioToggle]);

  const handleBiometricLogin = useCallback(async () => {
    try {
      const { value: isEnabled } = await Preferences.get({ key: "biometric_enabled" });
      if (isEnabled !== "true") return;

      const { value: storedEmail } = await Preferences.get({ key: "user_email" });
      const { value: storedPassword } = await Preferences.get({ key: "user_password" });

      if (!storedEmail || !storedPassword) return;

      setLoading(true);
      setError("");

      try {
        await NativeBiometric.verifyIdentity({
          reason: "Log in to your account",
          title: "Biometric Login",
          subtitle: "Welcome back!",
          description: "Verify your identity to continue",
        });
        await performLogin(storedEmail, storedPassword);
      } catch (err: any) {
        console.error("Biometric Verification Error:", err);
        setError(`Fingerprint Error: ${err.message || "Try manual login"}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Biometric Login Flow Error:", err);
      setLoading(false);
    }
  }, [performLogin]);

  useEffect(() => {
    const checkBiometrics = async () => {
      // Small delay to ensure bridge is ready
      await new Promise(r => setTimeout(r, 1000));
      
      const native = Capacitor.isNativePlatform();
      setIsNative(native);

      if (native) {
        try {
          // Double check if plugin is actually available
          if (Capacitor.isPluginAvailable("NativeBiometric")) {
              const result = await NativeBiometric.isAvailable();
              console.log("Biometric Available:", result.isAvailable);
              
              if (result.isAvailable) {
                setBiometricAvailable(true);
                const { value } = await Preferences.get({ key: "biometric_enabled" });
                if (value === "true") {
                  setBiometricEnabled(true);
                  setEnableBioToggle(true);
                  // Auto-trigger
                  handleBiometricLogin();
                }
              }
          } else {
              console.warn("NativeBiometric plugin NOT available in Capacitor bridge.");
          }
        } catch (err: any) {
          console.error("Biometric check error:", err);
        }
      }
    };
    checkBiometrics();
  }, [handleBiometricLogin]);

  const loginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await performLogin(email, password, true);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-x-hidden">
      
      {/* branding panel */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0a2c4e] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm font-bold mb-8 uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Portal
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-14 h-14 bg-white rounded-full p-1 shadow-xl shrink-0">
               <Image src="/logo.png" alt="Sindh Police" fill className="object-contain" priority />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase">SINDH POLICE</h1>
          </div>
        </div>
        <h2 className="text-5xl font-black leading-[1.1] tracking-tighter">
          Digital Justice <br />
          <span className="text-blue-400">Begins Here.</span>
        </h2>
        <div className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} Sindh Police Software Section
        </div>
      </div>

      {/* Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-12 bg-white min-h-screen md:min-h-0">
         <div className="w-full max-w-md space-y-6">
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

               {/* Toggle Section - Forced visible if native for debugging */}
               {isNative && (
                 <div className="flex items-center justify-between px-1 py-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                   <div className="flex flex-col gap-0.5">
                     <Label htmlFor="bio-toggle" className="text-[11px] font-bold text-slate-700 uppercase">Enable Biometric Login</Label>
                     <p className="text-[9px] text-slate-400 font-medium">Auto-login on next app launch</p>
                   </div>
                   <Switch 
                     id="bio-toggle" 
                     checked={enableBioToggle} 
                     onCheckedChange={setEnableBioToggle}
                     disabled={!biometricAvailable}
                     className="data-[state=checked]:bg-blue-600"
                   />
                 </div>
               )}

               {error && (
                 <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> 
                    <span className="break-words">{error}</span>
                 </div>
               )}

               <div className="flex gap-2">
                 <Button 
                   type="submit" 
                   disabled={loading}
                   className="flex-1 h-12 rounded-xl bg-[#0a2c4e] hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs shadow-md transition-all"
                 >
                   {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> <span>Validating...</span></> : "Sign In"}
                 </Button>

                 {isNative && biometricAvailable && biometricEnabled && (
                   <Button
                     type="button"
                     onClick={handleBiometricLogin}
                     disabled={loading}
                     variant="outline"
                     className="w-12 h-12 rounded-xl border-slate-200 flex items-center justify-center p-0 hover:bg-blue-50 text-blue-600 transition-all shadow-sm"
                   >
                     <Fingerprint size={24} />
                   </Button>
                 )}
               </div>
            </form>
         </div>
      </div>

    </div>
  );
}
