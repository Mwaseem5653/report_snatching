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
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append("role", filters.role);
      if (filters.district) params.append("district", filters.district);

      const res = await fetch(`/api/get-users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("User fetch error:", err);
    }
  }

  // ---------------- ROLE OPTIONS ----------------
  function availableFilters() {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "super_admin":
        return ["super_admin", "admin", "officer", "ps_user", "market_user"];
      case "admin":
        return ["officer", "ps_user", "market_user"];
      case "officer":
        return ["ps_user", "market_user"];
      default:
        return [];
    }
  }

  // ---------------- SEARCH USERS ----------------
  async function handleFilterSearch() {
    if (!currentUser) return;

    if (filterRole === "none") {
      alert("⚠️ Please select a role to filter users.");
      return;
    }

    const roleHierarchy = ["super_admin", "admin", "officer", "ps_user", "market_user"];
    const currentIndex = roleHierarchy.indexOf(currentUser.role);
    const targetIndex = roleHierarchy.indexOf(filterRole);

    if (currentUser.role !== "super_admin" && targetIndex <= currentIndex) {
      alert("❌ You cannot search users with same or higher role.");
      return;
    }

    setLoading(true);
    try {
      const filters: any = { role: filterRole };
      if (currentUser.role !== "super_admin" && currentUser.district) {
        filters.district = currentUser.district;
      }

      await fetchUsers(filters);
    } catch (err) {
      console.error("Search error:", err);
      alert("❌ Something went wrong during filtering.");
    } finally {
      setLoading(false);
    }
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
        // 🚫 Do not auto-refresh users after add
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
        // 🔁 Re-fetch same search if a filter is active
        if (filterRole !== "none") await handleFilterSearch();
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
        // 🔁 Refresh only if filter is active
        if (filterRole !== "none") await handleFilterSearch();
        else setUsers([]);
      } else {
        alert("❌ Delete failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Delete failed!");
    }
  }

  // ---------------- MAIN JSX ----------------
  return (
    <div className="w-full p-4">
      {/* FILTER BAR */}
      <div className="w-full bg-white shadow flex flex-wrap items-center justify-between gap-3 px-6 py-4 rounded-xl">
        <h2 className="text-lg font-bold whitespace-nowrap">Users</h2>

        <div className="flex flex-1 flex-wrap items-center gap-3 justify-end">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {availableFilters().map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "super_admin"
                    ? "Super Admin"
                    : r === "admin"
                    ? "Admin"
                    : r === "officer"
                    ? "Officer"
                    : r === "ps_user"
                    ? "PS User"
                    : r === "market_user"
                    ? "Market User"
                    : r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleFilterSearch}
            className="bg-blue-600 text-white"
            disabled={loading}
          >
            {loading ? "Loading..." : "Search"}
          </Button>

          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>

          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 text-white"
          >
            + Add
          </Button>
        </div>
      </div>

      {/* USERS LIST */}
      <div className="mt-4 space-y-2 w-full">
        {users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.uid}
              onClick={() => setSelectedUser(user)}
              className="flex justify-between items-center bg-gray-100 p-3 rounded-lg cursor-pointer hover:bg-gray-200"
            >
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
              </div>
              <p className="text-sm text-gray-700">{user.email}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-6">
            No records found. Select a role to fetch users.
          </p>
        )}
      </div>

      {/* EDIT USER DIALOG */}
      {selectedUser && (
        <Dialog open={true} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateUser(selectedUser);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {Object.entries(selectedUser).map(([key, value]) => {
                if (key === "uid") return null;

                if (key === "role") {
                  return (
                    <div key={key}>
                      <label className="text-sm font-semibold capitalize">
                        Role
                      </label>
                      <Select
                        value={selectedUser.role}
                        onValueChange={(val) =>
                          setSelectedUser({ ...selectedUser, role: val })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFilters().map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                return (
                  <div key={key}>
                    <label className="text-sm font-semibold capitalize">
                      {key}
                    </label>
                    <Input
                      value={value ? String(value) : ""}
                      placeholder={key}
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

              <div className="col-span-full flex justify-end gap-2 mt-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteUser(selectedUser.uid)}
                >
                  Delete
                </Button>
                <Button type="submit" className="bg-blue-600 text-white">
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ADD USER DIALOG */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={() => setShowAddForm(false)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <AddUserForm onSave={handleAddUser} loading={loading} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
