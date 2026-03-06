"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // This is a fallback in case middleware doesn't redirect fast enough
    // It will check the cookie locally (simplified) and redirect
    router.push("/"); 
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 text-[#0a2c4e] animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
}
