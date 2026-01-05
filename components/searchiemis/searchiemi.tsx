"use client";

import React, { useState } from "react";
import { db } from "@/firebaseconfig";
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { CheckCircle, XCircle } from "lucide-react";

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

  // 🔍 Search across all 'applications' subcollections
  const searchIMEI = async (imeiInput: string): Promise<IMEIRecord | null> => {
    const cleanIMEI = imeiInput.trim();

    try {
      // Search for imei1
      const q1 = query(collectionGroup(db, "applications"), where("imei1", "==", cleanIMEI));
      const snapshot1 = await getDocs(q1);

      if (!snapshot1.empty) {
        const doc = snapshot1.docs[0].data();
        return {
          ps: doc.ps,
          crimeHead: doc.crimeHead,
          status: "founded",
        };
      }

      // Search for imei2
      const q2 = query(collectionGroup(db, "applications"), where("imei2", "==", cleanIMEI));
      const snapshot2 = await getDocs(q2);

      if (!snapshot2.empty) {
        const doc = snapshot2.docs[0].data();
        return {
          ps: doc.ps,
          crimeHead: doc.crimeHead,
          status: "founded",
        };
      }

      return null;
    } catch (error) {
      console.error("IMEI Search Error:", error);
      return null;
    }
  };

  // 💾 Save to Firestore if user is PS or Market user
  const saveIMEIRecord = async (data: IMEIRecord) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "imei_searches"), {
        imei,
        ps: data.ps,
        crimeHead: data.crimeHead,
        status: data.status,
        foundBy: {
          name: currentUser.name,
          role: currentUser.role,
          profile: currentUser.profile || null,
        },
        createdAt: serverTimestamp(),
      });
      console.log("✅ Record saved to Firestore");
    } catch (error) {
      console.error("❌ Firestore Save Error:", error);
    }
  };

  // 🚀 Handle Search
  const handleSearch = async () => {
    const cleanIMEI = imei.trim();
    if (!cleanIMEI) return;

    setLoading(true);
    setShowPopup(false);

    const res = await searchIMEI(cleanIMEI);
    setResult(res);
    setShowPopup(true);

    // Save record if PS or Market user
    if (res && currentUser && ["ps_user", "market_user"].includes(currentUser.role)) {
      await saveIMEIRecord(res);
    }

    setLoading(false);
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          IMEI Search Portal
        </h2>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Enter IMEI number"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Result Popup */}
        {showPopup && (
          <div className="mt-4 border rounded-lg shadow-md p-4 bg-gray-50 text-left">
            {result ? (
              <div>
                <p>
                  <strong>Police Station:</strong> {result.ps}
                </p>
                <p>
                  <strong>Crime Type:</strong> {result.crimeHead}
                </p>
                <p className="flex items-center gap-2 mt-2">
                  <strong>Status:</strong>
                  {result.status === "founded" ? (
                    <span className="flex items-center text-green-600 font-medium">
                      <CheckCircle className="w-5 h-5 mr-1" /> Founded
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600 font-medium">
                      <XCircle className="w-5 h-5 mr-1" /> Not Found
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-red-600 font-semibold">
                ❌ No record found for IMEI: {imei}
              </p>
            )}

            <button
              onClick={() => setShowPopup(false)}
              className="mt-4 bg-gray-300 hover:bg-gray-400 px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IMEISearch;
