"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import AddUserForm from "../UserForm/page";
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
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, RotateCcw, ChevronRight, UserCog, Mail, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string>("none");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
            district: data.district ?? null,
          });
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    }
    fetchSession();
  }, []);

  // ---------------- FETCH USERS ----------------
  async function fetchUsers(filters: { role?: string; district?: string } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role && filters.role !== "none") params.append("role", filters.role);
      if (filters.district) params.append("district", filters.district);

      const res = await fetch(`/api/get-users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("User fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- ROLE OPTIONS ----------------
  function availableFilters() {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "super_admin":
        return ["super_admin", "admin", "officer", "ps_user", "market_user"];
      case "admin":
        return ["ps_user", "market_user"]; // Only manage lower roles
      case "officer":
        return ["ps_user", "market_user"];
      default:
        return [];
    }
  }

  // ---------------- SEARCH USERS ----------------
  async function handleFilterSearch() {
    if (!currentUser) return;

    const filters: any = { role: filterRole };

    if (filterRole === "none") {
      // Logic for "All Accessible"
      delete filters.role;
    } else {
      const roleHierarchy = ["super_admin", "admin", "officer", "ps_user", "market_user"];
      const currentIndex = roleHierarchy.indexOf(currentUser.role);
      const targetIndex = roleHierarchy.indexOf(filterRole);

      if (currentUser.role !== "super_admin" && targetIndex <= currentIndex) {
        alert("❌ You cannot search users with same or higher role.");
        return;
      }
    }

    if (currentUser.role !== "super_admin" && currentUser.district) {
      filters.district = currentUser.district;
    }

    await fetchUsers(filters);
  }

  // ---------------- CLEAR FILTER ----------------
  function handleClear() {
    setFilterRole("none");
    setUsers([]);
  }

  // ---------------- ADD USER ----------------
  const handleAddUser = async (payload: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        alert("✅ User added successfully!");
        setShowAddForm(false);
        handleFilterSearch();
      } else {
        alert("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UPDATE USER ----------------
  async function handleUpdateUser(updated: any) {
    try {
      const res = await fetch("/api/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Updated successfully!");
        setSelectedUser(null);
        handleFilterSearch();
      } else {
        alert("❌ Update failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Update failed!");
    }
  }

  // ---------------- DELETE USER ----------------
  async function handleDeleteUser(uid: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch("/api/update-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();

      if (data.success) {
        alert("✅ User deleted!");
        setSelectedUser(null);
        handleFilterSearch();
      } else {
        alert("❌ Delete failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Delete failed!");
    }
  }

  return (
    <div className="w-full space-y-6">
      
      {/* 🔹 STICKY FILTER BAR */}
      <div className="sticky top-0 z-30 -mt-2 pb-4 bg-slate-50/80 backdrop-blur-sm">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Branding */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Users size={20} />
                </div>
                <div className="hidden sm:block">
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">User Management</h2>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Access Control</p>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
                
                <div className="flex items-center gap-2">
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-[180px] border-slate-200 rounded-xl bg-slate-50/50 h-10">
                            <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">All Accessible Roles</SelectItem>
                            {availableFilters().map((r) => (
                                <SelectItem key={r} value={r} className="capitalize">
                                    {r.replace("_", " ")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleFilterSearch}
                        className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 h-10 shadow-lg shadow-indigo-600/20 px-6 font-semibold"
                        disabled={loading}
                    >
                        {loading ? "..." : "Search"}
                    </Button>

                    <Button
                        onClick={handleClear}
                        variant="ghost"
                        className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10 p-0"
                    >
                        <RotateCcw size={18} />
                    </Button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <Button
                        onClick={() => setShowAddForm(true)}
                        className="bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 h-10 shadow-lg shadow-emerald-600/20 px-4 font-semibold"
                    >
                        <Plus size={18} className="mr-1" /> New User
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* USERS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && users.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100"></div>
            ))
        ) : users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.uid}
              onClick={() => setSelectedUser(user)}
              className="group bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors font-bold text-xs uppercase">
                    {user.name?.charAt(0) || "U"}
                </div>
                <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    user.role === "super_admin" ? "bg-purple-100 text-purple-700" :
                    user.role === "admin" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-700"
                )}>
                    {user.role?.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5 text-slate-500">
                    <Mail size={12} />
                    <p className="text-xs font-medium truncate">{user.email}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                 <span className="flex items-center gap-1">
                    <Shield size={10} />
                    {user.district || user.city || "System Access"}
                 </span>
                 <ChevronRight size={14} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <Users className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <p className="text-slate-500 font-medium">No users found. Select a role to search.</p>
          </div>
        )}
      </div>

      {/* EDIT USER DIALOG */}
      {selectedUser && (
        <Dialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-8 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                        <UserCog /> Edit User Profile
                    </DialogTitle>
                    <p className="text-indigo-100 opacity-80 text-sm mt-1">Manage credentials and access levels</p>
                </DialogHeader>
            </div>

            <div className="p-8">
                <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateUser(selectedUser);
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                {Object.entries(selectedUser).map(([key, value]) => {
                    if (key === "uid" || key === "createdAt") return null;

                    if (key === "role") {
                    return (
                        <div key={key} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Access Level (Role)
                        </label>
                        <Select
                            value={selectedUser.role}
                            onValueChange={(val) =>
                            setSelectedUser({ ...selectedUser, role: val })
                            }
                        >
                            <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50 h-11">
                            <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                            {availableFilters().map((r) => (
                                <SelectItem key={r} value={r} className="capitalize">
                                {r.replace("_", " ")}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>
                    );
                    }

                    return (
                    <div key={key} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <Input
                        value={value ? String(value) : ""}
                        placeholder={`Enter ${key}`}
                        className="rounded-xl border-slate-200 bg-slate-50 h-11"
                        onChange={(e) =>
                            setSelectedUser({
                            ...selectedUser,
                            [key]: e.target.value,
                            })
                        }
                        />
                    </div>
                    );
                })}

                <div className="col-span-full flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                    <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 rounded-xl"
                    onClick={() => handleDeleteUser(selectedUser.uid)}
                    >
                    Delete User
                    </Button>
                    <Button type="submit" className="bg-indigo-600 text-white rounded-xl px-8 shadow-lg shadow-indigo-600/20">
                    Save Changes
                    </Button>
                </div>
                </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ADD USER DIALOG */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
            <div className="sticky top-0 bg-emerald-900 p-6 z-10 flex items-center justify-between text-white">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Plus /> Register New User
              </DialogTitle>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => setShowAddForm(false)}>
                 ✕
              </Button>
            </div>
            <div className="p-0">
              <AddUserForm onSave={handleAddUser} loading={loading} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}