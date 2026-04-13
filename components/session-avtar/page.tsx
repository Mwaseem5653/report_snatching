"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Bell, Coins, Menu, X, Clock } from "lucide-react";
import Image from "next/image";
import { cn, getApiUrl } from "@/lib/utils";
import { toast } from "sonner"; // For a better logout notification

type Session = {
  authenticated: boolean;
  uid?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  tokens?: number;
  eyeconTokens?: number;
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

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/auth/create-session"), { cache: "no-store" });
      const data = await res.json();
      if (data.authenticated) {
          setSession(data);
          fetchNotifications();
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
    }
  }, [fetchNotifications, handleLogout]);

  // 🚀 PROACTIVE COUNTDOWN: Automatically logout when session expires
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
                })
                .catch(() => {});
        }
    }, 25000);

    const integrityInterval = setInterval(() => {
        if (session?.authenticated) {
            fetch(getApiUrl("/api/auth/create-session"), { cache: "no-store" })
                .then(res => res.json())
                .then(data => {
                    if (!data.authenticated) handleLogout();
                });
        }
    }, 15 * 60 * 1000);

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
      clearInterval(integrityInterval);
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

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const hasTools = session?.role === "super_admin" || 
                  (session?.permissions && Object.values(session.permissions).some(v => v === true));

  // Threshold for "Urgent" warning (e.g., red color)
  // Set to 5 minutes (300 seconds) for a 3-hour session.
  const URGENT_THRESHOLD = 300; 

  return (
    <header className="w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* 🔹 Left: Logo & Burger */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <Menu size={24} />
          </button>
          
          <div className="relative w-9 h-9 md:w-10 md:h-10">
             <Image src="/logo.png" alt="Logo" fill sizes="40px" className="object-contain" />
          </div>
          <div className="hidden sm:block leading-tight">
            <h1 className="text-sm md:text-lg font-black text-slate-800 tracking-tighter uppercase">Sindh Police</h1>
            <p className="text-[8px] md:text-[10px] text-blue-600 font-bold uppercase tracking-wider">Official Portal</p>
          </div>
        </div>

        {/* 🔹 Center: Navigation */}
        <div className="hidden lg:flex flex-1 justify-center overflow-x-auto no-scrollbar">
           {children}
        </div>

        {/* 🔹 Right: User Profile & Timer */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0" ref={dropdownRef}>
          
          {/* 🚀 SESSION TIMER (Header) - Now visible on mobile too */}
          {timeLeft !== null && (
            <div className={cn(
                "flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-black border transition-all",
                timeLeft < URGENT_THRESHOLD ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-blue-50 text-blue-700 border-blue-100"
            )}>
                <Clock size={12} className={cn(timeLeft < URGENT_THRESHOLD ? "animate-spin" : "")} />
                <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-all relative"
          >
            <div className="hidden xl:block text-right">
               <p className="text-xs font-bold text-slate-700 leading-none mb-0.5">{session?.name || "Officer"}</p>
               <p className="text-[10px] text-slate-400 font-medium capitalize">{session?.role?.replace("_", " ") || "User"}</p>
            </div>
            
            <div className="relative">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] md:text-xs shadow-sm">
                {loading ? "..." : initials(session?.name)}
                </div>
                {notifCount > 0 && !["ps_user", "market_user"].includes(session?.role || "") && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 md:h-4 md:w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 md:h-4 md:w-4 bg-red-500 text-[7px] md:text-[8px] text-white items-center justify-center font-black">
                            {notifCount > 9 ? "9+" : notifCount}
                        </span>
                    </span>
                )}
            </div>
            <ChevronDown size={14} className="text-slate-400 mr-1 hidden sm:block" />
          </button>

          {open && (
            <div className="absolute right-4 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800 truncate">{session?.name ?? "Guest"}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[10px] text-slate-500 truncate">{session?.email ?? "No email"}</p>
                    {timeLeft !== null && (
                        <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded",
                            timeLeft < URGENT_THRESHOLD ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        )}>
                            {formatTime(timeLeft)}
                        </span>
                    )}
                </div>

                {!["ps_user", "market_user"].includes(session?.role || "") && (session?.role === "super_admin" || 
                  (["admin", "officer", "advanced_tool"].includes(session?.role || "") && hasTools) ||
                  session?.permissions?.token_pool
                ) && (
                    <div className="mt-3 flex flex-col gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[9px] uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            {session?.tokens || 0} Credits Available
                        </div>
                        {(session?.role === "super_admin" || session?.permissions?.eyecon_access) && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-black text-[9px] uppercase tracking-wider">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                {session?.eyeconTokens || 0} Eyecon Tokens
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="p-2">
                {!["ps_user", "market_user"].includes(session?.role || "") && (
                  <>
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                      <span>Live Alerts</span>
                      {notifCount > 0 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px]">{notifCount} New</span>}
                    </div>
                    <button onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("switch-tab", { detail: "matched" })); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                      <Bell size={16} className={cn(notifCount > 0 ? "text-red-500" : "")} /> 
                      {notifCount > 0 ? "View Recovery Matches" : "No new notifications"}
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                  </>
                )}
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                   <User size={16} /> Profile Information
                </button>
                {!["ps_user", "market_user"].includes(session?.role || "") && (
                  <>
                    {(session?.role === "super_admin" || session?.role === "admin" || session?.role === "officer") && (
                        <button 
                            onClick={() => {
                                setOpen(false);
                                window.dispatchEvent(new CustomEvent("switch-tab", { detail: "users" }));
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-medium"
                        >
                            <User size={16} className="text-blue-500" /> Manage Users
                        </button>
                    )}
                    {(session?.role === "super_admin" || session?.permissions?.token_pool) && (
                        <button 
                            onClick={() => {
                                setOpen(false);
                                window.dispatchEvent(new CustomEvent("switch-tab", { detail: "tokens" }));
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium"
                        >
                            <Coins size={16} /> Manage Token Pool
                        </button>
                    )}
                  </>
                )}
                <div className="h-px bg-slate-100 my-1"></div>
                <button onClick={handleLogout} className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors font-black">
                  <div className="flex items-center gap-3">
                    <LogOut size={16} /> 
                    <span>Sign Out</span>
                  </div>
                  {timeLeft !== null && <span className={cn("text-[10px]", timeLeft < URGENT_THRESHOLD ? "text-red-700 animate-pulse" : "opacity-60")}>{formatTime(timeLeft)}</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📱 MOBILE SIDEBAR MENU */}
      {mobileMenuOpen && (
        <>
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998] lg:hidden animate-in fade-in duration-300"
                onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-0 bottom-0 w-[280px] h-screen min-h-screen bg-white z-[9999] lg:hidden shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative">
                            <Image src="/logo.png" alt="Logo" fill sizes="32px" className="object-contain" />
                        </div>
                        <h2 className="font-black text-sm uppercase tracking-tighter">Official Access</h2>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                    {/* 🚀 MOBILE TIMER (Prominent) */}
                    {timeLeft !== null && (
                        <div className={cn(
                            "mb-4 p-4 rounded-xl flex items-center justify-between text-xs font-black border transition-all",
                            timeLeft < URGENT_THRESHOLD ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-blue-50 text-blue-700 border-blue-100"
                        )}>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className={cn(timeLeft < URGENT_THRESHOLD ? "animate-spin" : "")} />
                                <span>Session Security</span>
                            </div>
                            <span className="text-sm">{formatTime(timeLeft)}</span>
                        </div>
                    )}

                    <div className="space-y-4 pb-20">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Navigation Menu</p>
                        <div 
                            className="flex flex-col gap-2" 
                            onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button:not([data-collapsible])')) {
                                    setTimeout(() => setMobileMenuOpen(false), 300);
                                }
                            }}
                        >
                            {children}
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-black hover:bg-red-50 rounded-xl transition-colors">
                                <LogOut size={18} />
                                <span>Sign Out System</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}
    </header>
  );
}
