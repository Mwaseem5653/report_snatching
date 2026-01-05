"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Session = {
  authenticated: boolean;
  uid?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

export default function SessionHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ✅ Fetch session
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/create-session", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      setSession(data.authenticated ? data : { authenticated: false });
    } catch (err) {
      console.error("Session fetch error:", err);
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    const handleFocus = () => fetchSession();
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
  }, []);

  // ✅ Logout
 const handleLogout = async () => {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (data.success) {
      // 🔹 First redirect
      router.push("/");

      // 🔹 Then clear session
      setTimeout(() => setSession({ authenticated: false }), 50);
    }
  } catch (err) {
    console.error("Logout error:", err);
  }
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
    <header className="w-full bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo + Title */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          // onClick={() => router.push("/")}
        >
          <img
            src="/logo.png"
            alt="Logo"
            className="h-10 w-10"
          />
          <span className="text-lg font-bold text-gray-800">Sindh Police</span>
        </div>

        {/* Avatar Only */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-90"
            aria-label="Open session menu"
          >
            {loading ? "..." : initials(session?.name)}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border overflow-hidden z-50">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-semibold text-gray-800">
                  {session?.name ?? "Guest"}
                </p>
                <p className="text-xs text-gray-500">
                  {session?.email ?? "No email"}
                </p>
                {/* ✅ Role Added Here */}
                <p className="text-xs text-gray-400 italic">
                  {session?.role ?? "No role"}
                </p>
              </div>

              <div className="px-2 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
