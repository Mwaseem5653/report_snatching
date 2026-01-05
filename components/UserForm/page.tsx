"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { locationData } from "@/components/location/location";
import { toast } from "sonner"; // shadcn/sonner for notifications

export default function AddUserForm({
  onSave,
  loading,
}: {
  onSave: (payload: any) => void;
  loading: boolean;
}) {
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [ps, setPs] = useState<string | null>(null);

  // ✅ Get current session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/create-session");
        const data = await res.json();
        if (data.authenticated && data.role) {
          setSessionRole(data.role);
        } else {
          toast.error("Session missing — please login again.");
        }
      } catch (err) {
        console.error("Session fetch error:", err);
        toast.error("Error fetching session.");
      }
    };

    fetchSession();
  }, []);

  // ✅ toggle districts (for Admin role)
  const toggleDistrict = (d: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  // ✅ Role Access Control
  const getAvailableRoles = () => {
    switch (sessionRole) {
      case "super_admin":
        return ["admin", "officer", "ps_user", "market_user","super_admin"];
      case "admin":
        return ["officer", "ps_user", "market_user"];
      case "officer":
        return ["ps_user", "market_user"];
      default:
        return [];
    }
  };

  // ✅ Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    if (!role) {
      toast.error("Please select a role.");
      return;
    }

    const payload: any = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      buckle: formData.get("buckle"),
      role,
      city,
      district: role === "admin" ? selectedDistricts : district,
      ps, // Police Station OR Market name
    };

    onSave(payload);
  };

  // 🟥 Show if session not loaded yet
  if (!sessionRole) {
    return (
      <Card className="border border-red-300 bg-red-50">
        <CardContent className="p-4 text-center text-red-600 font-semibold">
          ⚠️ Session not found. Please login again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none border-none max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-2xl">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ---------------- Role Selection ---------------- */}
          <div>
            <Label>Role</Label>
            <Select onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().length > 0 ? (
                  getAvailableRoles().map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace("_", " ").toUpperCase()}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No roles available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ---------------- Common Fields ---------------- */}
          {role && (
            <>
              <Input name="name" placeholder="Name" required />
              <Input name="phone" placeholder="Phone" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Password" required />
              <Input name="buckle" placeholder="Buckle No." />
            </>
          )}

          {/* ---------------- Super Admin → City select ---------------- */}
          {role === "super_admin" && (
            <div>
              <Label>City</Label>
              <Select onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(locationData).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ---------------- Admin → City + District ---------------- */}
          {role === "admin" && (
            <>
              <Label>City</Label>
              <Select onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(locationData).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {city && (
                <div>
                  <Label>Districts</Label>
                  <div className="space-y-2">
                    {Object.keys(locationData[city]?.districts || {}).map((d) => (
                      <div key={d} className="flex items-center space-x-2">
                        <Checkbox
                          id={d}
                          checked={selectedDistricts.includes(d)}
                          onCheckedChange={() => toggleDistrict(d)}
                        />
                        <label htmlFor={d} className="text-sm">
                          {d}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------------- Officer → City + District ---------------- */}
          {role === "officer" && (
            <>
              <Label>City</Label>
              <Select onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(locationData).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {city && (
                <div>
                  <Label>District</Label>
                  <Select onValueChange={setDistrict}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(locationData[city]?.districts || {}).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* ---------------- PS User ---------------- */}
          {role === "ps_user" && (
            <>
              <Label>City</Label>
              <Select onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(locationData).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {city && (
                <div>
                  <Label>District</Label>
                  <Select onValueChange={setDistrict}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(locationData[city]?.districts || {}).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {city && district && (
                <div>
                  <Label>Police Station</Label>
                  <Select onValueChange={setPs}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PS" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationData[city]?.districts[district].ps?.map((ps: string) => (
                        <SelectItem key={ps} value={ps}>
                          {ps}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* ---------------- Market User ---------------- */}
          {role === "market_user" && (
            <>
              <Label>City</Label>
              <Select onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(locationData).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {city && (
                <div>
                  <Label>District</Label>
                  <Select onValueChange={setDistrict}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(locationData[city]?.districts || {}).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {city && district && (
                <div>
                  <Label>Market</Label>
                  <Select onValueChange={setPs}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Market" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationData[city]?.districts[district].markets?.map((Market: string) => (
                        <SelectItem key={Market} value={Market}>
                          {Market}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* ---------------- Save Button ---------------- */}
          {role && (
            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Saving..." : "Save User"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
