"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if they hit this page directly
    router.push("/authentication/login");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 text-[#0a2c4e] animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Verifying Session...</p>
      </div>
    </div>
  );
}
