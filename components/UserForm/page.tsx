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
import { User, Mail, Lock, Phone, BadgeHelp, MapPin, Building2, Store, Loader2, ShieldCheck, LockIcon, Wrench, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [tokens, setTokens] = useState(0);
  const [eyeconTokens, setEyeconTokens] = useState(0);

  // 🚀 Detailed Permissions
  const [permissions, setPermissions] = useState({
      excel_analyzer: false,
      geo_fencing: false,
      ai_extractor: false,
      info_tools: false,
      cdr_generator: false,
      token_pool: false,
      can_delegate: false, 
      delegation_limit: 10, // 🚀 Default limit
  });

  const [sessionPermissions, setSessionPermissions] = useState<any>({});

  const togglePermission = (key: keyof typeof permissions) => {
      setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateLimit = (val: string) => {
      setPermissions(prev => ({ ...prev, delegation_limit: parseInt(val) || 0 }));
  };

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
          setSessionPermissions(data.permissions || {}); // 🚀 Store delegator's perms

          if (data.role === "admin" || data.role === "officer") {
              setCity(data.city);
          }
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
        return ["super_admin", "admin", "officer"];
      case "admin":
        return ["officer", "ps_user", "market_user"];
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
      permissions, // 🚀 Send detailed permissions
      tokens,
      eyeconTokens
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

  const isCityRestricted = sessionRole === "admin" || sessionRole === "officer";
  const isDistrictRestricted = sessionRole === "officer";

  // 🚀 Logic: Can this user assign tools to others?
  const canAssignTools = sessionRole === "super_admin" || sessionPermissions?.can_delegate;

  const ALL_TOOLS = [
    { key: 'excel_analyzer', label: 'Excel Analyzer' },
    { key: 'geo_fencing', label: 'Geo Fencing' },
    { key: 'ai_extractor', label: 'AI Application Extractor' },
    { key: 'info_tools', label: 'Info & Lookup Tools' },
    { key: 'cdr_generator', label: 'CDR Generator' },
  ];

  // 🚀 Filter tools: Delegators only see what they own. 
  // 🔒 SPECIAL: Only Super Admin can see/assign 'Token Pool'.
  const visibleTools = sessionRole === "super_admin" 
    ? ALL_TOOLS 
    : ALL_TOOLS.filter(t => sessionPermissions[t.key] && t.key !== 'token_pool');

  return (
    <div className="p-8 md:p-10 bg-white">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Account Role & Credits */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
             <ShieldCheck size={20} className="text-blue-600" />
             <h3 className="font-bold uppercase tracking-wider text-xs">Assign System Role & Credits</h3>
          </div>
          <div className={cn("grid grid-cols-1 gap-6 items-end", sessionRole === "officer" ? "md:grid-cols-1" : "md:grid-cols-3")}>
            <div className="space-y-2">
                <Label className="text-slate-600 text-xs font-bold uppercase">User Access Level</Label>
                <Select onValueChange={setRole}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select role" />
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

            {sessionRole !== "officer" && (
                <>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Coins size={12}/> General Tokens</Label>
                        <Input 
                            type="number" 
                            value={tokens} 
                            onChange={(e) => setTokens(parseInt(e.target.value) || 0)}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Coins size={12}/> Eyecon Tokens</Label>
                        <Input 
                            type="number" 
                            value={eyeconTokens} 
                            onChange={(e) => setEyeconTokens(parseInt(e.target.value) || 0)}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                    </div>
                </>
            )}
          </div>
        </section>

        {role && (
          <>
            {/* 🚀 Feature Access Control (Advanced Tools) - Super Admin OR Delegators */}
            {canAssignTools && (
                <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                        <Wrench size={20} className="text-orange-600" />
                        <h3 className="font-bold uppercase tracking-wider text-xs">Feature Access Control</h3>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {visibleTools.map(tool => (
                                <div key={tool.key} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-orange-200 transition-colors">
                                    <Checkbox id={`p_${tool.key}`} checked={(permissions as any)[tool.key]} onCheckedChange={() => togglePermission(tool.key as any)} />
                                    <label htmlFor={`p_${tool.key}`} className="text-[11px] font-black uppercase cursor-pointer text-slate-600">{tool.label}</label>
                                </div>
                            ))}
                        </div>

                        {/* 🚀 Super Admin Special: Delegation & Pool (Only for Admin Role) */}
                        {sessionRole === "super_admin" && role === "admin" && (
                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm hover:border-indigo-300 transition-colors flex-1 min-w-[200px]">
                                        <Checkbox id="p_delegate" checked={permissions.can_delegate} onCheckedChange={() => togglePermission('can_delegate')} />
                                        <div className="flex flex-col">
                                            <label htmlFor="p_delegate" className="text-[11px] font-black uppercase cursor-pointer text-indigo-700 leading-none">Grant Delegation Power</label>
                                            <span className="text-[8px] text-indigo-400 font-bold uppercase mt-1">Can assign tools to others</span>
                                        </div>
                                    </div>

                                    {permissions.can_delegate && (
                                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-100 shadow-sm w-40 animate-in slide-in-from-left-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase leading-none">User Limit</label>
                                            <Input 
                                                type="number" 
                                                value={permissions.delegation_limit} 
                                                onChange={(e) => updateLimit(e.target.value)}
                                                className="h-8 w-16 text-center font-black text-xs border-indigo-50 bg-indigo-50/30"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-xl border border-amber-100 shadow-sm hover:border-amber-300 transition-colors max-w-xs">
                                    <Checkbox id="p_pool" checked={permissions.token_pool} onCheckedChange={() => togglePermission('token_pool')} />
                                    <div className="flex flex-col">
                                        <label htmlFor="p_pool" className="text-[11px] font-black uppercase cursor-pointer text-amber-700 leading-none">Manage Token Pool</label>
                                        <span className="text-[8px] text-amber-400 font-bold uppercase mt-1">Access to system credits</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 2. Personal Information */}
            <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                <User size={20} className="text-blue-600" />
                <h3 className="font-bold uppercase tracking-wider text-xs">Personal Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="name" placeholder="Official Name" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="phone" placeholder="03XXXXXXXXX" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="email" type="email" placeholder="official@sindhpolice.gov.pk" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="password" type="password" placeholder="••••••••" required className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Buckle / ID Number (Optional)</Label>
                  <div className="relative">
                    <BadgeHelp className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input name="buckle" placeholder="Enter service number" className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900" />
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
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">City {isCityRestricted && <LockIcon size={12} className="text-slate-400" />}</Label>
                  {isCityRestricted ? (
                    <div className="h-11 flex items-center px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium capitalize">
                        {city || "Assigned City"}
                    </div>
                  ) : (
                    <Select onValueChange={setCity} value={city || ""}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900">
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
                    <Label className="text-xs font-bold text-slate-500 uppercase">Select Assigned Districts</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(locationData[city]?.districts || {}).map((d) => (
                        <div key={d} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <Checkbox
                            id={d}
                            checked={selectedDistricts.includes(d)}
                            onCheckedChange={() => toggleDistrict(d)}
                          />
                          <label htmlFor={d} className="text-xs font-medium capitalize cursor-pointer text-slate-900">
                            {d}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(role === "officer" || role === "ps_user" || role === "market_user") && city && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">District {isDistrictRestricted && <LockIcon size={12} className="text-slate-400" />}</Label>
                    {isDistrictRestricted ? (
                        <div className="h-11 flex items-center px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium capitalize">
                            {district || "Assigned District"}
                        </div>
                    ) : (
                        <Select onValueChange={setDistrict} value={district || ""}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900">
                            <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(locationData[city]?.districts || {})
                                .filter((d) => {
                                    if (sessionRole === "admin" && sessionDistrict) {
                                        if (Array.isArray(sessionDistrict)) {
                                            return sessionDistrict.includes(d);
                                        }
                                        return sessionDistrict === d;
                                    }
                                    return true; 
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
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><Building2 size={14}/> Police Station</Label>
                    <Select onValueChange={setPs}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900">
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
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><Store size={14}/> Market Assignment</Label>
                    <Select onValueChange={setPs}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900">
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
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Account...</> : "Create System Account"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
