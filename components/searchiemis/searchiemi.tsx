"use client";

import React, { useState } from "react";
import { db } from "@/firebaseconfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CheckCircle, XCircle, Search, Loader2 } from "lucide-react";

/* -------------------- Types -------------------- */
type User = {
  name: string;
  role: string;
  profile?: any;
};

type IMEIRecord = {
  ps: string;
  crimeHead: string;
  status: "founded" | "not_found";
};

interface IMEISearchProps {
  currentUser?: User | null;
}

/* -------------------- Component -------------------- */
const IMEISearch: React.FC<IMEISearchProps> = ({ currentUser }) => {
  const [imei, setImei] = useState("");
  const [result, setResult] = useState<IMEIRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // 🔍 Search via API (Server-Side)
  const searchIMEI = async (imeiInput: string): Promise<IMEIRecord | null> => {
    try {
      const res = await fetch("/api/search-imei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imei: imeiInput }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("IMEI Search API Error:", error);
      return null;
    }
  };

  // 🚀 Handle Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const cleanIMEI = imei.trim();
    if (!cleanIMEI) return;

    setLoading(true);
    setShowPopup(false);
    setResult(null);

    const res = await searchIMEI(cleanIMEI);
    setResult(res);
    setShowPopup(true);

    setLoading(false);
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-2xl mx-auto">
      <div className="w-full bg-white shadow-xl shadow-slate-200 rounded-3xl p-8 border border-slate-100">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          IMEI Verification Portal
        </h2>
        <p className="text-center text-slate-500 mb-8 text-sm">
          Enter the 15-digit IMEI number to verify device status against the police database.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8 relative">
          <div className="relative flex-1">
             <Search className="absolute left-4 top-3.5 text-slate-400 h-5 w-5" />
             <input
                type="text"
                placeholder="Enter 15-digit IMEI number"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700"
              />
          </div>
          <button
            type="submit"
            disabled={loading || !imei.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify"}
          </button>
        </form>

        {/* Result Popup (Inline) */}
        {showPopup && (
          <div className={`rounded-2xl p-6 border ${result ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"} animate-in fade-in slide-in-from-top-4`}>
            {result ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-red-800 mb-1">NOT CLEAR</h3>
                <p className="text-red-600 text-sm mb-4 font-semibold">This device is reported in the database.</p>
                
                <div className="bg-white rounded-xl p-4 text-left grid grid-cols-2 gap-4 border border-red-200/50 shadow-sm">
                   <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                      <p className="text-slate-800 font-medium capitalize">Reported</p>
                   </div>
                   <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Crime Type</p>
                      <p className="text-slate-800 font-medium capitalize">{result.crimeHead}</p>
                   </div>
                   <div className="col-span-2">
                      <p className="text-xs text-slate-500 uppercase font-bold">Reporting Station</p>
                      <p className="text-slate-800 font-medium">{result.ps}</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-1">CLEAR</h3>
                <p className="text-green-600 text-sm">
                   Device with IMEI <span className="font-mono font-bold">{imei}</span> is not reported as stolen.
                </p>
              </div>
            )}

            <button
              onClick={() => { setShowPopup(false); setImei(""); }}
              className="mt-6 w-full py-3 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Check Another Device
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IMEISearch;
