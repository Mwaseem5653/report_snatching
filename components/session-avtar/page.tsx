"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Bell } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Session = {
  authenticated: boolean;
  uid?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

interface HeaderProps {
  children?: React.ReactNode; 
  initialSession?: Session | null; // 🚀 New: Pass session from server for instant load
}

export default function SessionHeader({ children, initialSession }: HeaderProps) {
  // Use initialSession if provided, otherwise null
  const [session, setSession] = useState<Session | null>(initialSession || null);
  const [loading, setLoading] = useState(!initialSession);
  const [open, setOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ✅ Fetch session (only if initialSession was not provided)
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/create-session", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      if (data.authenticated) {
          setSession(data);
          fetchNotifications();
      } else {
          setSession({ authenticated: false });
      }
    } catch (err) {
      console.error("Session fetch error:", err);
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Notification Count
  const fetchNotifications = async () => {
    try {
        const res = await fetch("/api/notifications/count");
        const data = await res.json();
        if (data.success) {
            setNotifCount(data.count || 0);
        }
    } catch (err) {
        console.error("Notif fetch error:", err);
    }
  };

  useEffect(() => {
    if (!initialSession) {
        fetchSession();
    } else {
        fetchNotifications(); // Still need to fetch notifications even if session is pre-loaded
    }

    const handleFocus = () => fetchNotifications(); // Refresh notifications on window focus
    window.addEventListener("focus", handleFocus);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [initialSession]);

  // ✅ Instant Logout
  const handleLogout = () => {
    window.location.href = "/";
    fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch((err) => console.error("Background logout error:", err));
  };

  // ✅ Avatar initials
  const initials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length === 1
      ? parts[0].charAt(0).toUpperCase()
      : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* 🔹 Left: Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-10 h-10">
             <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div className="hidden md:block leading-tight">
            <h1 className="text-lg font-bold text-slate-800">Sindh Police</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Dashboard</p>
          </div>
        </div>

        {/* 🔹 Center: Navigation */}
        <div className="flex-1 flex justify-center overflow-x-auto no-scrollbar">
           {children}
        </div>

        {/* 🔹 Right: User Profile & Alerts */}
        <div className="flex items-center gap-2 relative shrink-0" ref={dropdownRef}>
          
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-all focus:ring-2 focus:ring-blue-100 relative"
          >
            <div className="hidden text-right md:block">
               <p className="text-xs font-semibold text-slate-700">{session?.name || "Official"}</p>
               <p className="text-[10px] text-slate-400 capitalize">{session?.role?.replace("_", " ") || "User"}</p>
            </div>
            
            <div className="relative">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {loading ? "..." : initials(session?.name)}
                </div>
                {/* 🔴 Notification Badge */}
                {notifCount > 0 && !["ps_user", "market_user"].includes(session?.role || "") && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] text-white items-center justify-center font-black">
                            {notifCount > 9 ? "9+" : notifCount}
                        </span>
                    </span>
                )}
            </div>
            
            <ChevronDown size={14} className="text-slate-400 mr-1" />
          </button>

          {/* Dropdown Menu */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800 truncate">{session?.name ?? "Guest"}</p>
                <p className="text-xs text-slate-500 truncate">{session?.email ?? "No email"}</p>
              </div>

              <div className="p-2">
                {!["ps_user", "market_user"].includes(session?.role || "") && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                      <span>Notifications</span>
                      {notifCount > 0 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px]">{notifCount} New Matches</span>}
                    </div>
                    <button 
                        onClick={() => { setOpen(false); /* Could redirect to matched tab if logic allowed */ }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Bell size={16} className={cn(notifCount > 0 ? "text-red-500" : "")} /> 
                      {notifCount > 0 ? "View Matched IMEIs" : "No new alerts"}
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                  </>
                )}
                
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                   Account
                </div>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                   <User size={16} /> Profile Settings
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}