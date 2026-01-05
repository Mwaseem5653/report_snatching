"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddApplicationForm from "../applicationform/applicationform";
import { getApplications } from "@/app/api/update-application/route";

// ✅ Reusable bilingual Detail Row
function DetailRow({
  labelEn,
  labelUr,
  value,
}: {
  labelEn: string;
  labelUr: string;
  value: any;
}) {
  return (
    <p className="text-sm text-gray-700 border-b py-2 flex flex-wrap items-center justify-between">
      <span className="font-semibold">
        {labelEn}
        <br />
        <span className="text-gray-500 text-[13px] font-normal">{labelUr}</span>
      </span>
      <span className="text-gray-600 ml-2 break-all">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </p>
  );
}

export default function Psusersapplication() {
  const [applications, setApplications] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ---------------- FETCH CURRENT USER ----------------
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/create-session");
        const data = await res.json();
        if (data.authenticated) {
          setCurrentUser({
            uid: data.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            city: data.city ?? null,
            district: data.district ?? null,
            ps: data.ps ?? null,
          });
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    }
    fetchSession();
  }, []);

  // ---------------- FETCH APPLICATIONS ----------------
  async function fetchApplications() {
    if (!currentUser) return alert("User session not found!");
    if (!filterPeriod) return alert("Please select a time period first!");

    setLoading(true);
    try {
      const params: Record<string, string> = {
        period: filterPeriod,
        district: currentUser.district,
        ps: currentUser.ps,
      };

      const data = await getApplications(params);
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Application fetch error:", err);
      alert("Failed to fetch applications. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- CLEAR FUNCTION ----------------
  function clearFilters() {
    setFilterPeriod("");
    setApplications([]);
  }

  // ---------------- MAIN JSX ----------------
  return (
    <div
      className="min-h-screen w-full p-4 bg-[radial-gradient(circle_at_center,_#f8f9fa_1px,_transparent_1px)] [background-size:20px_20px] animate-fadeIn"
    >
      {/* 🔹 HEADER */}
      <div className="flex items-center gap-4 bg-white shadow-md rounded-2xl px-6 py-4 mb-6">
        <img src="/logo.png" alt="Sindh Police" className="w-14 h-14" />
        <div>
          <h1 className="text-2xl font-bold text-blue-900">
            Sindh Police Applications Dashboard
          </h1>
          <p className="text-sm text-gray-600">Online Reporting System / آن لائن رپورٹنگ سسٹم</p>
        </div>
      </div>

      {/* 🔹 FILTER BAR */}
      <div className="w-full bg-white shadow flex flex-wrap items-center justify-between gap-3 px-6 py-4 rounded-xl transition-all duration-300 hover:shadow-lg">
        <h2 className="text-lg font-bold whitespace-nowrap text-blue-800">
          Applications / درخواستیں
        </h2>

        <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[200px] border-gray-400">
              <SelectValue placeholder="Select Time Period / مدت منتخب کریں" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15days">Last 15 Days / پچھلے 15 دن</SelectItem>
              <SelectItem value="1month">Last 1 Month / پچھلا مہینہ</SelectItem>
              <SelectItem value="3months">Last 3 Months / پچھلے 3 مہینے</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={fetchApplications}
            className="bg-blue-700 text-white hover:bg-blue-800 transition-all duration-300"
            disabled={loading}
          >
            {loading ? "Loading..." : "Search / تلاش کریں"}
          </Button>

          <Button
            onClick={clearFilters}
            variant="outline"
            className="border-gray-400 text-gray-700 hover:bg-gray-100 transition-all duration-300"
          >
            Clear / صاف کریں
          </Button>

          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-green-700 text-white hover:bg-green-800 transition-all duration-300"
          >
            + Add Application / نئی درخواست
          </Button>
        </div>
      </div>

      {/* APPLICATION LIST */}
      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {applications.length > 0 ? (
          applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">
                    {app.applicantName}
                  </p>
                  <p className="text-sm text-gray-500">{app.applicantEmail}</p>
                </div>
                <p className="text-sm text-gray-600">
                  {app.offenceDate
                    ? new Date(app.offenceDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10 col-span-full">
            {filterPeriod
              ? "No applications found for this period. / اس مدت کے لیے کوئی درخواست نہیں ملی۔"
              : "Please select a time period and click Search. / براہ کرم مدت منتخب کریں اور تلاش کریں۔"}
          </p>
        )}
      </div>

      {/* 🔹 DETAIL POPUP */}
      {selectedApp && (
        <Dialog open={true} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl animate-fadeIn">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-900">
                Application Details / درخواست کی تفصیل
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Applicant Info */}
              <div className="border-b pb-3">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  Applicant Information / درخواست دہندہ کی معلومات
                </h3>
                <DetailRow labelEn="Name" labelUr="نام" value={selectedApp.applicantName} />
                <DetailRow labelEn="Email" labelUr="ای میل" value={selectedApp.applicantEmail} />
                <DetailRow labelEn="Phone" labelUr="فون نمبر" value={selectedApp.applicantPhone} />
                <DetailRow labelEn="City" labelUr="شہر" value={selectedApp.city} />
                <DetailRow labelEn="District" labelUr="ضلع" value={selectedApp.district} />
                <DetailRow labelEn="Police Station" labelUr="تھانہ" value={selectedApp.ps} />
              </div>

              {/* Application Data */}
              <div className="border-b pb-3">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  Application Data / درخواست کی معلومات
                </h3>

                {Object.entries(selectedApp)
                  .filter(
                    ([key]) =>
                      ![
                        "id",
                        "createdAt",
                        "updatedAt",
                        "applicantName",
                        "applicantEmail",
                        "applicantPhone",
                        "city",
                        "district",
                        "ps",
                      ].includes(key)
                  )
                  .map(([key, value]) => {
                    if (value === null || value === undefined) return null;

                    // 🔹 Handle URLs
                    if (typeof value === "string" && value.startsWith("http")) {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
                      return (
                        <DetailRow
                          key={key}
                          labelEn={key}
                          labelUr={key}
                          value={
                            <Button
                              variant="outline"
                              className="text-blue-600 text-sm"
                              onClick={() => window.open(value, "_blank")}
                            >
                              View {isImage ? "Image" : "File"}
                            </Button>
                          }
                        />
                      );
                    }

                    // 🔹 Handle objects
                    if (typeof value === "object" && !Array.isArray(value)) {
                      const objectDetails = Object.entries(value)
                        .map(([subKey, subVal]) => `${subKey}: ${subVal}`)
                        .join(", ");
                      return (
                        <DetailRow
                          key={key}
                          labelEn={key}
                          labelUr={key}
                          value={objectDetails}
                        />
                      );
                    }

                    // 🔹 Handle arrays
                    if (Array.isArray(value)) {
                      return (
                        <DetailRow
                          key={key}
                          labelEn={key}
                          labelUr={key}
                          value={value.join(", ")}
                        />
                      );
                    }

                    // 🔹 Default
                    return (
                      <DetailRow
                        key={key}
                        labelEn={key}
                        labelUr={key}
                        value={String(value)}
                      />
                    );
                  })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🔹 ADD APPLICATION POPUP */}
      {/* Add Application */}
{showAddForm && (
  <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
    <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl">
      <DialogHeader className="sticky top-0 bg-white z-10 border-b">
        <DialogTitle className="text-xl font-bold text-gray-800">
          Add Application
        </DialogTitle>
      </DialogHeader>

      <div className="p-6">
        <AddApplicationForm currentUser={currentUser} />
      </div>
    </DialogContent>
  </Dialog>
)}

    </div>
  );
}
