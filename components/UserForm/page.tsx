"use client";

import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { User, Mail, Lock, Phone, BadgeHelp, MapPin, Building2, Store, Loader2, ShieldCheck, LockIcon } from "lucide-react";

export default function AddUserForm({
  onSave,
  loading,
}: {
  onSave: (payload: any) => void;
  loading: boolean;
}) {
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [sessionCity, setSessionCity] = useState<string | null>(null);
  const [sessionDistrict, setSessionDistrict] = useState<any>(null);

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
          setSessionCity(data.city);
          setSessionDistrict(data.district);

          // ✅ Pre-fix City for Admin and Officer
          if (data.role === "admin" || data.role === "officer") {
              setCity(data.city);
          }
          
          // ✅ Pre-fix District only for Officer
          if (data.role === "officer") {
              setDistrict(data.district);
          }
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    };
    fetchSession();
  }, []);

  const toggleDistrict = (d: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const getAvailableRoles = () => {
    switch (sessionRole) {
      case "super_admin":
        return ["super_admin", "admin"];
      case "admin":
        return ["officer"];
      case "officer":
        return ["ps_user", "market_user"];
      default:
        return [];
    }
  };

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
      ps, 
    };

    onSave(payload);
  };

  if (!sessionRole) {
    return (
      <div className="p-12 text-center text-slate-500 animate-pulse">
        <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4 text-blue-600" />
        Authenticating session...
      </div>
    );
  }

  // Restrictions logic
  const isCityRestricted = sessionRole === "admin" || sessionRole === "officer";
  const isDistrictRestricted = sessionRole === "officer";

  return (
    <div className="p-8 md:p-10 bg-white">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Account Role */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
             <ShieldCheck size={20} className="text-blue-600" />
             <h3 className="font-bold uppercase tracking-wider text-xs">Assign System Role</h3>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600">User Access Level</Label>
            <Select onValueChange={setRole}>
              <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Identify user role" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {role && (
          <>
            {/* 2. Personal Information */}
            <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                <User size={20} className="text-blue-600" />
                <h3 className="font-bold uppercase tracking-wider text-xs">Personal Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="name" placeholder="Official Name" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="phone" placeholder="03XXXXXXXXX" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="email" type="email" placeholder="official@sindhpolice.gov.pk" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="password" type="password" placeholder="••••••••" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Buckle / ID Number (Optional)</Label>
                  <div className="relative">
                    <BadgeHelp className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="buckle" placeholder="Enter service number" className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Jurisdiction / Assignment */}
            <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                <MapPin size={20} className="text-blue-600" />
                <h3 className="font-bold uppercase tracking-wider text-xs">Jurisdiction Assignment</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">City {isCityRestricted && <LockIcon size={12} className="text-slate-400" />}</Label>
                  {isCityRestricted ? (
                    <div className="h-11 flex items-center px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium capitalize">
                        {city || "Assigned City"}
                    </div>
                  ) : (
                    <Select onValueChange={setCity} value={city || ""}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                        {Object.keys(locationData).map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  )}
                </div>

                {role === "admin" && city && !isDistrictRestricted && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <Label className="text-xs font-bold text-slate-500">SELECT ASSIGNED DISTRICTS</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(locationData[city]?.districts || {}).map((d) => (
                        <div key={d} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <Checkbox
                            id={d}
                            checked={selectedDistricts.includes(d)}
                            onCheckedChange={() => toggleDistrict(d)}
                          />
                          <label htmlFor={d} className="text-xs font-medium capitalize cursor-pointer">
                            {d}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(role === "officer" || role === "ps_user" || role === "market_user") && city && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">District {isDistrictRestricted && <LockIcon size={12} className="text-slate-400" />}</Label>
                    {isDistrictRestricted ? (
                        <div className="h-11 flex items-center px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium capitalize">
                            {district || "Assigned District"}
                        </div>
                    ) : (
                        <Select onValueChange={setDistrict} value={district || ""}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(locationData[city]?.districts || {})
                                .filter((d) => {
                                    // 🚀 Admin Filter: Only show districts assigned to the Admin
                                    if (sessionRole === "admin" && sessionDistrict) {
                                        if (Array.isArray(sessionDistrict)) {
                                            return sessionDistrict.includes(d);
                                        }
                                        return sessionDistrict === d;
                                    }
                                    return true; // Super Admin sees all
                                })
                                .map((d) => (
                                <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                  </div>
                )}

                {role === "ps_user" && city && district && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                    <Label className="flex items-center gap-2"><Building2 size={14}/> Police Station</Label>
                    <Select onValueChange={setPs}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select PS" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationData[city]?.districts[district].ps?.map((ps: string) => (
                          <SelectItem key={ps} value={ps}>{ps}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === "market_user" && city && district && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                    <Label className="flex items-center gap-2"><Store size={14}/> Market Assignment</Label>
                    <Select onValueChange={setPs}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select Market" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationData[city]?.districts[district].markets?.map((Market: string) => (
                          <SelectItem key={Market} value={Market}>{Market}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </section>

            <div className="pt-6 border-t border-slate-100">
              <Button type="submit" className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.01]" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Finalizing Registration...</> : "Create System Account"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}