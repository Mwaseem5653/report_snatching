"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddApplicationForm from "../applicationform/applicationform";
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
import { getApplications, updateApplication } from "@/app/api/update-application/route";

// ✅ Simple text row component
function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <p className="text-sm text-gray-700 border-b py-1 flex flex-wrap items-center justify-between">
      <span className="font-semibold">{label}:</span>
      <span className="text-gray-600 ml-2">{value ? value : "—"}</span>
    </p>
  );
}

export default function ApplicationManagement() {
  const [applications, setApplications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>("none");
  const [filterPeriod, setFilterPeriod] = useState<string>("15days");
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
            mobile: data.mobile ?? null,
          });
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    }
    fetchSession();
  }, []);

  // ---------------- FETCH APPLICATIONS ----------------
  async function fetchApplications(params?: Record<string, string>) {
    try {
      const data = await getApplications(params || {});
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Application fetch error:", err);
    }
  }

  // ---------------- HANDLE SEARCH ----------------
  async function handleSearch() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (currentUser.role === "ps_user") {
        if (!searchQuery.trim()) {
          alert("⚠️ Please enter something to search.");
          setLoading(false);
          return;
        }
        params.query = searchQuery;
        params.district = currentUser.district;
        params.ps = currentUser.ps;
      } else {
        if (filterStatus && filterStatus !== "none") params.status = filterStatus;
        if (filterPeriod && filterPeriod !== "all") params.period = filterPeriod;
        if (currentUser.role !== "super_admin" && currentUser.district)
          params.district = currentUser.district;
      }

      await fetchApplications(params);
    } catch (err) {
      console.error("Search error:", err);
      alert("❌ Something went wrong during search.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- CLEAR FILTER ----------------
  function handleClear() {
    setSearchQuery("");
    setFilterStatus("none");
    setApplications([]);
  }

  // ---------------- UPDATE STATUS ----------------
  async function handleUpdateStatus(app: any, newStatus: string, comments?: string) {
    try {
      const res = await updateApplication({
        ...app,
        status: newStatus,
        processedBy:
          currentUser?.role === "officer"
            ? {
                name: currentUser?.name,
                email: currentUser?.email,
                mobile: currentUser?.mobile,
              }
            : undefined,
        comments,
      });

      if (res.success) {
        alert("✅ Status updated!");
        setSelectedApp(null);
        fetchApplications();
      }
    } catch {
      alert("Update failed!");
    }
  }

  // ---------------- MAIN JSX ----------------
  return (
    <div className="min-h-screen w-full p-6 bg-[radial-gradient(circle,rgba(210,227,252,0.7)_1px,transparent_1px)] [background-size:20px_20px]">
      {/* 🔹 Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <img src="/logo.png" alt="Sindh Police" className="w-16 h-16 mb-2" />
        <h1 className="text-2xl font-bold text-blue-900">
          Application Management
        </h1>
        <p className="text-gray-600 text-sm font-[Jameel-Noori-Nastaleeq]">
          درخواستوں کا انتظام
        </p>
      </div>

      {/* 🔹 FILTER BAR */}
      <div className="w-full bg-white/90 shadow-lg flex flex-wrap items-center justify-between gap-3 px-6 py-4 rounded-2xl border border-blue-100">
        <h2 className="text-lg font-bold text-blue-800">Applications</h2>

        <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
          {currentUser?.role === "ps_user" ? (
            <div className="flex flex-1 items-center gap-2 min-w-[300px]">
              <Input
                placeholder="Search by name, email, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-blue-200 focus:ring-blue-400 rounded-xl"
              />
              <Button
                onClick={handleSearch}
                className="bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
              >
                Clear
              </Button>
            </div>
          ) : (
            <>
              <Select
                value={filterStatus ?? "none"}
                onValueChange={(value) => setFilterStatus(value)}
              >
                <SelectTrigger className="w-[200px] border-blue-200 rounded-xl">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterPeriod}
                onValueChange={(value) => setFilterPeriod(value)}
              >
                <SelectTrigger className="w-[200px] border-blue-200 rounded-xl">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15days">Last 15 Days</SelectItem>
                  <SelectItem value="1month">Last 1 Month</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last 1 Year</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleSearch}
                className="bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
              >
                Clear
              </Button>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white rounded-xl hover:bg-green-700"
              >
                + Add
              </Button>
            </>
          )}
        </div>
      </div>

      {/* APPLICATION LIST */}
      <div className="mt-4 space-y-3 w-full">
        {applications.length > 0 ? (
          applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="flex justify-between items-center bg-white border border-blue-100 p-4 rounded-xl cursor-pointer hover:shadow-md transition-all"
            >
              <div>
                <p className="font-semibold text-blue-900">
                  {app.applicantName}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {app.status}
                </p>
              </div>
              <p className="text-sm text-gray-600">{app.applicantEmail}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-6">
            No applications found.
          </p>
        )}
      </div>

      {/* 🔹 DETAIL POPUP */}
      {selectedApp && (
        <Dialog open={true} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/95">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-900">
                Application Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Applicant Info */}
              <div className="border-b pb-3">
                <h3 className="text-lg font-semibold mb-3 text-blue-700">
                  Applicant Information
                </h3>
                <DetailRow label="Name" value={selectedApp.applicantName} />
                <DetailRow label="Email" value={selectedApp.applicantEmail} />
                <DetailRow label="Phone" value={selectedApp.applicantPhone} />
                <DetailRow label="City" value={selectedApp.city} />
                <DetailRow label="District" value={selectedApp.district} />
                <DetailRow label="Police Station" value={selectedApp.ps} />
              </div>

              {/* Application Data */}
              <div className="border-b pb-3">
                <h3 className="text-lg font-semibold mb-3 text-blue-700">
                  Application Data
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
                        "processedBy",
                        "status",
                      ].includes(key)
                  )
                  .map(([key, value]) => {
                    if (!value) return null;

                    if (typeof value === "string" && value.startsWith("http")) {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
                      return (
                        <DetailRow
                          key={key}
                          label={key}
                          value={
                            <Button
                              variant="outline"
                              className="text-blue-600 text-sm border-blue-300 hover:bg-blue-50"
                              onClick={() => window.open(value, "_blank")}
                            >
                              View {isImage ? "Image" : "File"}
                            </Button>
                          }
                        />
                      );
                    }

                    return <DetailRow key={key} label={key} value={value} />;
                  })}
              </div>

              {/* Processed By */}
              {selectedApp.processedBy && (
                <div className="border-b pb-3">
                  <h3 className="text-lg font-semibold mb-3 text-blue-700">
                    Processed By
                  </h3>
                  <DetailRow
                    label="Name"
                    value={selectedApp.processedBy.name}
                  />
                  <DetailRow
                    label="Email"
                    value={selectedApp.processedBy.email}
                  />
                  <DetailRow
                    label="Mobile"
                    value={selectedApp.processedBy.mobile}
                  />
                </div>
              )}

              {/* Status + Actions */}
              <div>
                <p className="text-base font-semibold">
                  Current Status:{" "}
                  <span className="capitalize text-blue-700">
                    {selectedApp.status}
                  </span>
                </p>
                {currentUser?.role === "officer" && (
                  <div className="flex gap-3 mt-3">
                    {selectedApp.status === "pending" && (
                      <Button
                        onClick={() =>
                          handleUpdateStatus(selectedApp, "processed")
                        }
                        className="bg-blue-600 text-white rounded-xl"
                      >
                        Move to Processed
                      </Button>
                    )}
                    {selectedApp.status === "processed" && (
                      <Button
                        onClick={() =>
                          handleUpdateStatus(
                            selectedApp,
                            "complete",
                            "Completed successfully"
                          )
                        }
                        className="bg-green-600 text-white rounded-xl"
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🔹 Add Application */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/95">
            <DialogHeader className="sticky top-0 bg-white z-10 border-b">
              <DialogTitle className="text-xl font-bold text-blue-900">
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
