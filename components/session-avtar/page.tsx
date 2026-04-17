"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Bell, Coins, Menu, X, Clock, RefreshCcw, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { cn, getApiUrl } from "@/lib/utils";
import { toast } from "sonner"; 

type Session = {
  authenticated: boolean;
  uid?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  tokens?: number;
  eyeconTokens?: number;
  tokensExpiry?: any;
  eyeconTokensExpiry?: any;
  hasToolsAccess?: boolean;
  permissions?: any;
  exp?: number;
};

interface HeaderProps {
  children?: React.ReactNode; 
  initialSession?: Session | null;
}

export default function SessionHeader({ children, initialSession }: HeaderProps) {
  const [session, setSession] = useState<Session | null>(initialSession || null);
  const [loading, setLoading] = useState(!initialSession);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    toast.error("Session expired. Logging out...");
    router.push("/authentication/login");
    fetch(getApiUrl("/api/auth/logout"), { method: "POST" });
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    try {
        const res = await fetch(getApiUrl("/api/notifications/count"));
        const data = await res.json();
        if (data.success) setNotifCount(data.count || 0);
    } catch (err) {}
  }, []);

  const fetchSession = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/create-session"), { cache: "no-store" });
      const data = await res.json();
      if (data.authenticated) {
          setSession(data);
          fetchNotifications();
          if (isManual) toast.success("Balance refreshed");
      } else {
          setSession({ authenticated: false });
          if (window.location.pathname !== "/authentication/login") {
            handleLogout();
          }
      }
    } catch (err) {
      setSession({ authenticated: false });
      if (window.location.pathname !== "/authentication/login") {
        handleLogout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchNotifications, handleLogout]);

  useEffect(() => {
    if (!session?.exp) return;
    const updateTimer = () => {
        const secondsRemaining = Math.floor((session.exp! * 1000 - Date.now()) / 1000);
        if (secondsRemaining <= 0) {
            setTimeLeft(0);
            handleLogout();
        } else {
            setTimeLeft(secondsRemaining);
        }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.exp, handleLogout]);

  useEffect(() => {
    if (!initialSession) {
        fetchSession();
    } else {
        setSession(initialSession);
        fetchNotifications();
    }

    const heartbeatInterval = setInterval(() => {
        if (session?.authenticated) {
            fetch(getApiUrl("/api/auth/create-session"), { cache: "no-store" })
                .then(res => res.json())
                .then(data => {
                    if (!data.authenticated) handleLogout();
                    else setSession(prev => ({ ...prev, ...data })); 
                })
                .catch(() => {});
        }
    }, 30000);

    const handleFocus = () => fetchNotifications();
    const handleRefresh = () => fetchSession();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("refresh-session", handleRefresh);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("refresh-session", handleRefresh);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [initialSession, session?.authenticated, fetchNotifications, fetchSession, handleLogout]);

  const initials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getRemainingDays = (expiry: any) => {
    if (!expiry) return null;
    let expDate: Date;
    if (expiry.seconds) expDate = new Date(expiry.seconds * 1000);
    else if (expiry._seconds) expDate = new Date(expiry._seconds * 1000);
    else expDate = new Date(expiry);
    if (isNaN(expDate.getTime())) return 0;
    const diffTime = expDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const URGENT_THRESHOLD = 300; 

  return (
    <header className="w-full bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><Menu size={24} /></button>
          <div className="relative w-9 h-9 md:w-10 md:h-10"><Image src="/logo.png" alt="Logo" fill sizes="40px" className="object-contain" /></div>
          <div className="hidden sm:block leading-tight">
            <h1 className="text-sm md:text-lg font-black text-slate-800 tracking-tighter uppercase">Sindh Police</h1>
            <p className="text-[8px] md:text-[10px] text-blue-600 font-bold uppercase tracking-wider">Official Portal</p>
          </div>
        </div>

        {/* 📱 MOBILE SIDEBAR OVERLAY */}
        {mobileMenuOpen && (
            <>
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] lg:hidden" onClick={() => setMobileMenuOpen(false)} />
                <div className="fixed inset-y-0 left-0 w-[300px] bg-white z-[1000] shadow-2xl lg:hidden flex flex-col animate-in slide-in-from-left duration-300">
                    {/* Header */}
                    <div className="p-6 bg-[#0a2c4e] text-white flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <LayoutGrid size={20} className="text-blue-400" />
                            <span className="font-black uppercase tracking-tighter text-sm">System Navigation</span>
                        </div>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                        {/* Profile Section */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#0a2c4e] text-white flex items-center justify-center font-black text-xs">{initials(session?.name)}</div>
                                <div className="overflow-hidden">
                                    <p className="text-xs font-black text-slate-800 uppercase truncate">{session?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold truncate lowercase">{session?.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Children (Tabs) */}
                        <div className="p-2" onClick={() => setMobileMenuOpen(false)}>
                            <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Quick Access</div>
                            <div className="flex flex-col gap-1">
                                {children}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                         <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95">
                            <div className="flex items-center gap-3"><LogOut size={18} /> Sign Out</div>
                            {timeLeft !== null && <span className="bg-white/20 px-2 py-0.5 rounded-lg">{formatTime(timeLeft)}</span>}
                         </button>
                    </div>
                </div>
            </>
        )}

        <div className="hidden lg:flex flex-1 justify-center overflow-x-auto no-scrollbar">{children}</div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0" ref={dropdownRef}>
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-all relative bg-white shadow-sm">
            <div className="hidden xl:flex items-center gap-2 text-right">
               <div className="p-1.5 bg-slate-100 rounded-lg"><User size={12} className="text-slate-500" /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-700 leading-none mb-0.5 uppercase">{session?.name || "Officer"}</p>
                  <p className="text-[8px] text-slate-400 font-bold capitalize">{session?.role?.replace("_", " ") || "User"}</p>
               </div>
            </div>
            <div className="relative">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] md:text-xs shadow-sm">
                {loading ? "..." : initials(session?.name)}
                </div>
                {notifCount > 0 && !["ps_user", "market_user"].includes(session?.role || "") && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 md:h-4 md:w-4 z-10">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 md:h-4 md:w-4 bg-red-500 text-[7px] md:text-[8px] text-white items-center justify-center font-black">{notifCount > 9 ? "9+" : notifCount}</span>
                    </span>
                )}
            </div>
            <ChevronDown size={14} className="text-slate-400 mr-1 hidden sm:block" />
          </button>

          {open && (
            <div className="absolute right-4 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{session?.name ?? "Officer"}</p>
                    <button onClick={() => fetchSession(true)} disabled={refreshing} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                        <RefreshCcw size={12} className={cn(refreshing && "animate-spin")} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 truncate lowercase font-bold">{session?.email ?? "No email"}</p>

                {!["ps_user", "market_user"].includes(session?.role || "") && (
                    <div className="mt-3 flex flex-col gap-2">
                        <div className="flex flex-col gap-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase text-emerald-700 tracking-wider">
                                <span>General Credits</span>
                                <span className="text-emerald-900">{session?.tokens || 0}</span>
                            </div>
                            {session?.tokensExpiry && (
                                <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-600/70">
                                    <Clock size={8} /> {getRemainingDays(session.tokensExpiry)} Days Remaining
                                </div>
                            )}
                        </div>

                        {(session?.role === "super_admin" || session?.permissions?.eyecon_access) && (
                            <div className="flex flex-col gap-1 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                                    <span>Eyecon Tokens</span>
                                    <span className="text-indigo-900">{session?.eyeconTokens || 0}</span>
                                </div>
                                {session?.eyeconTokensExpiry && (
                                    <div className="flex items-center gap-1 text-[8px] font-bold text-indigo-600/70">
                                        <Clock size={8} /> {getRemainingDays(session.eyeconTokensExpiry)} Days Remaining
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="p-2">
                {!["ps_user", "market_user"].includes(session?.role || "") && (
                  <>
                    <button onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("switch-tab", { detail: "matched" })); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                      <Bell size={16} className={cn(notifCount > 0 ? "text-red-500" : "")} /> 
                      {notifCount > 0 ? "View Recovery Matches" : "No new notifications"}
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                  </>
                )}
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"><User size={16} /> Profile Information</button>
                {!["ps_user", "market_user"].includes(session?.role || "") && (
                  <>
                    {(session?.role === "super_admin" || session?.role === "admin" || session?.role === "officer") && (
                        <button onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("switch-tab", { detail: "users" })); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-medium">
                            <User size={16} className="text-blue-500" /> Manage Users
                        </button>
                    )}
                    {(session?.role === "super_admin" || session?.permissions?.token_pool) && (
                        <button onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("switch-tab", { detail: "tokens" })); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium">
                            <Coins size={16} /> Manage Token Pool
                        </button>
                    )}
                  </>
                )}
                <div className="h-px bg-slate-100 my-1"></div>
                <button onClick={handleLogout} className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors font-black">
                  <div className="flex items-center gap-3"><LogOut size={16} /> <span>Sign Out</span></div>
                  {timeLeft !== null && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        timeLeft < URGENT_THRESHOLD ? "bg-red-100 text-red-700 animate-pulse" : "bg-blue-100 text-blue-700"
                    )}>
                        {formatTime(timeLeft)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
