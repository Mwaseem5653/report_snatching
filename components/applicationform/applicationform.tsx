"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFileToStorage } from "@/lib/uploadHelper";
import { addApplication } from "@/lib/applicationApi";
import { locationData } from "@/components/location/location";
import {
  CheckCircle2,
  PhoneForwarded,
  Plus,
  Trash2,
  User,
  Phone,
  CreditCard,
  MapPin,
  Building2,
  Shield,
  Smartphone,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  UploadCloud,
  FileCheck,
  Image as ImageIcon,
  X,
  Hash,
  Lock,
  Sparkles,
  Loader2,
  ShieldAlert,
  Briefcase,
  AlertCircle,
  FileSignature,
  Radio,
  SendHorizontal,
  RotateCcw
} from "lucide-react";

type AddApplicationFormProps = {
  currentUser?: any;
};

export default function AddApplicationForm({ currentUser }: AddApplicationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [formData, setFormData] = useState({
    applicantName: "",
    mobileNumber: "",
    cnic: "",
    city: currentUser?.city?.toLowerCase() || "karachi",
    district: currentUser?.district || "",
    psName: currentUser?.ps || "",
    incidentNote: "",
    crimeHead: "snatched",
    otherLostProperty: "",
    dateOfOffence: new Date().toISOString().split("T")[0],
    timeOfOffence: new Date().toTimeString().slice(0, 5),
    addressOfOffence: "",
    devices: [
      { mobileModel: "", imei1: "", imei2: "", lastNumUsed: "", lastNumUsed2: "" }
    ],
    boxPicture: null as File | null,
    attestedApplication: null as File | null,
  });

  const [boxPreview, setBoxPreview] = useState<string | null>(null);
  const [attestedPreview, setAttestedPreview] = useState<string | null>(null);

  // Auto initialize default district if available
  useEffect(() => {
    if (!formData.district) {
      const cityKey = formData.city?.toLowerCase();
      if (cityKey && locationData[cityKey]) {
        const availableDistricts = Object.keys(locationData[cityKey].districts);
        if (availableDistricts.length > 0) {
          setFormData((prev) => ({
            ...prev,
            district: currentUser?.district || availableDistricts[0]
          }));
        }
      }
    }
  }, [formData.city, currentUser?.district, formData.district]);

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      if (boxPreview) URL.revokeObjectURL(boxPreview);
      if (attestedPreview) URL.revokeObjectURL(attestedPreview);
    };
  }, [boxPreview, attestedPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    setErrorMessage("");

    if (name === "cnic") {
      value = value.replace(/\D/g, "").slice(0, 13);
    }

    if (name === "mobileNumber") {
      let digits = value.replace(/\D/g, "").slice(0, 11);
      if (digits.length > 4) {
        value = digits.slice(0, 4) + "-" + digits.slice(4);
      } else {
        value = digits;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeviceChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    setErrorMessage("");
    const newDevices = [...formData.devices];

    if (name === "imei1" || name === "imei2") {
      value = value.replace(/\D/g, "").slice(0, 15);
    }
    if (name === "lastNumUsed" || name === "lastNumUsed2") {
      let digits = value.replace(/\D/g, "").slice(0, 11);
      if (digits.length > 4) value = digits.slice(0, 4) + "-" + digits.slice(4);
      else value = digits;
    }

    newDevices[index] = { ...newDevices[index], [name]: value };
    setFormData((prev) => ({ ...prev, devices: newDevices }));
  };

  const addDevice = () => {
    setFormData((prev) => ({
      ...prev,
      devices: [
        ...prev.devices,
        { mobileModel: "", imei1: "", imei2: "", lastNumUsed: "", lastNumUsed2: "" }
      ]
    }));
  };

  const removeDevice = (index: number) => {
    if (formData.devices.length === 1) return;
    const newDevices = formData.devices.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, devices: newDevices }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "boxPicture" | "attestedApplication") => {
    setErrorMessage("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, [field]: file }));

      if (field === "boxPicture") {
        if (boxPreview) URL.revokeObjectURL(boxPreview);
        setBoxPreview(URL.createObjectURL(file));
      } else if (field === "attestedApplication") {
        if (attestedPreview) URL.revokeObjectURL(attestedPreview);
        if (file.type.startsWith("image/")) {
          setAttestedPreview(URL.createObjectURL(file));
        } else {
          setAttestedPreview(null);
        }
      }
    }
  };

  const removeFile = (field: "boxPicture" | "attestedApplication") => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    if (field === "boxPicture" && boxPreview) {
      URL.revokeObjectURL(boxPreview);
      setBoxPreview(null);
    }
    if (field === "attestedApplication" && attestedPreview) {
      URL.revokeObjectURL(attestedPreview);
      setAttestedPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.city || !formData.district || !formData.psName || !formData.crimeHead) {
      setErrorMessage("City, District, Police Station, and Crime Category are mandatory fields.");
      return;
    }

    const mobileDigits = formData.mobileNumber.replace(/\D/g, "");
    if (mobileDigits.length !== 11) {
      setErrorMessage("Applicant mobile number must be exactly 11 digits (e.g. 0300-1234567).");
      return;
    }

    for (let i = 0; i < formData.devices.length; i++) {
      const d = formData.devices[i];
      if (!d.mobileModel.trim()) {
        setErrorMessage(`Device ${i + 1}: Mobile model is required.`);
        return;
      }

      const imei1Digits = d.imei1.replace(/\D/g, "");
      if (imei1Digits.length !== 15) {
        setErrorMessage(`Device ${i + 1}: IMEI 1 must be exactly 15 numeric digits.`);
        return;
      }

      if (d.imei2) {
        const imei2Digits = d.imei2.replace(/\D/g, "");
        if (imei2Digits.length !== 15) {
          setErrorMessage(`Device ${i + 1}: IMEI 2 must be exactly 15 numeric digits.`);
          return;
        }
      }

      const lastNumDigits = d.lastNumUsed.replace(/\D/g, "");
      if (lastNumDigits.length !== 11) {
        setErrorMessage(`Device ${i + 1}: Last SIM number used must be exactly 11 digits.`);
        return;
      }
    }

    if (!formData.attestedApplication) {
      setErrorMessage("Attested Application / FIR document is mandatory. Please attach a copy.");
      return;
    }

    setSubmitting(true);

    try {
      let boxPicUrl = "";
      let attestedUrl = "";

      if (formData.boxPicture) {
        setSubmittingStep("Uploading box picture to secure storage...");
        const res = await uploadFileToStorage(formData.boxPicture, "applications");
        boxPicUrl = res.secure_url;
      }

      if (formData.attestedApplication) {
        setSubmittingStep("Uploading attested application document...");
        const res = await uploadFileToStorage(formData.attestedApplication, "applications");
        attestedUrl = res.secure_url;
      }

      setSubmittingStep("Registering application and indexing IMEIs...");

      const payload = {
        applicantName: formData.applicantName.trim(),
        applicantMobile: formData.mobileNumber.trim(),
        cnic: formData.cnic.trim(),
        city: formData.city.trim(),
        district: formData.district.trim(),
        ps: formData.psName.trim(),
        crimeHead: formData.crimeHead,
        offenceDate: formData.dateOfOffence,
        offenceTime: formData.timeOfOffence,
        offenceAddress: formData.addressOfOffence.trim(),
        note: formData.incidentNote.trim(),
        pictureUrl: boxPicUrl,
        attachmentUrl: attestedUrl,
        otherLostProperty: formData.otherLostProperty.trim(),
        devices: formData.devices,
        role: "official",
      };

      const res = await addApplication(payload);

      if (res?.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(res?.message || "Something went wrong while saving the application.");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      setErrorMessage(error.message || "Failed to submit application. Please check connection.");
    } finally {
      setSubmitting(false);
      setSubmittingStep("");
    }
  };

  const resetForm = () => {
    setFormData({
      applicantName: "",
      mobileNumber: "",
      cnic: "",
      city: currentUser?.city?.toLowerCase() || "karachi",
      district: currentUser?.district || "",
      psName: currentUser?.ps || "",
      incidentNote: "",
      crimeHead: "snatched",
      otherLostProperty: "",
      dateOfOffence: new Date().toISOString().split("T")[0],
      timeOfOffence: new Date().toTimeString().slice(0, 5),
      addressOfOffence: "",
      devices: [
        { mobileModel: "", imei1: "", imei2: "", lastNumUsed: "", lastNumUsed2: "" }
      ],
      boxPicture: null,
      attestedApplication: null,
    });
    setBoxPreview(null);
    setAttestedPreview(null);
    setSubmitted(false);
    setErrorMessage("");
  };

  // SUCCESS VIEW
  if (submitted) {
    return (
      <div className="p-8 md:p-14 bg-gradient-to-b from-slate-50 to-white min-h-[500px] flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 size={42} strokeWidth={2.5} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-3">
            <ShieldCheckIcon className="w-3.5 h-3.5" /> Official Record Created
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">
            Application Registered
          </h2>
          <p className="text-sm font-semibold text-slate-500 mb-8 max-w-md mx-auto">
            The case details and IMEI records have been securely registered and synchronized across the police database.
          </p>

          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 text-left space-y-3 mb-8">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Applicant</span>
              <span className="font-black text-slate-800">{formData.applicantName || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Police Station</span>
              <span className="font-black text-blue-700">{formData.psName} ({formData.district})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Devices Enrolled</span>
              <span className="font-black text-emerald-600">{formData.devices.length} Device(s) Listed</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={resetForm}
              variant="outline"
              className="h-12 px-6 rounded-xl font-black text-xs uppercase tracking-wider border-slate-200 hover:bg-slate-50 gap-2"
            >
              <RotateCcw size={16} /> Register Another
            </Button>
            <Button
              onClick={() => {
                if (currentUser) window.location.reload();
                else router.push("/");
              }}
              className="h-12 px-8 rounded-xl font-black text-xs uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
            >
              Done & Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const availableDistricts = formData.city && locationData[formData.city.toLowerCase()]
    ? Object.keys(locationData[formData.city.toLowerCase()].districts)
    : [];

  const availablePs = formData.city && formData.district && locationData[formData.city.toLowerCase()]?.districts[formData.district]
    ? locationData[formData.city.toLowerCase()].districts[formData.district].ps
    : [];

  return (
    <div className="bg-slate-50 min-h-full px-3 sm:px-8 md:px-12 py-4 sm:py-6 w-full max-w-7xl mx-auto pb-28 sm:pb-12">
      {/* 🔹 COMPACT SUB-HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-blue-800 text-[10px] font-black uppercase tracking-widest">
            <Shield size={13} className="text-blue-600" /> Police Desk Case Registration
          </div>
          <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">
            Citizen Snatching & Crime Telemetry Entry
          </h1>
        </div>

        {currentUser && (
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm self-start sm:self-auto">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              {currentUser?.name?.slice(0, 2)?.toUpperCase() || "PO"}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-black text-slate-800">{currentUser?.name || "Official User"}</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase">
                {currentUser?.role === "ps_user" ? `PS: ${currentUser?.ps}` : (currentUser?.district || "Desk Officer")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 🔹 ERROR BANNER */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wider">Please review the following:</p>
            <p className="text-xs font-semibold mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-rose-600 p-1">
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ========================================================
            SECTION 1: APPLICANT IDENTITY
           ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-7 shadow-sm border border-slate-200/90 transition-all hover:border-slate-300">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight">Applicant Information</h2>
              <p className="text-xs font-semibold text-slate-400">Personal and contact particulars of the victim</p>
            </div>
            <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              Step 1 of 4
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Full Name <span className="text-rose-500">*</span></span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  name="applicantName"
                  placeholder="e.g. Muhammad Ali"
                  value={formData.applicantName}
                  onChange={handleChange}
                  required
                  className="pl-10 h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Active Mobile <span className="text-rose-500">*</span></span>
                <span className="text-[9px] text-slate-400 font-bold">11 Digits</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  name="mobileNumber"
                  placeholder="0300-1234567"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  required
                  minLength={12}
                  maxLength={12}
                  className="pl-10 h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 font-mono tracking-wide placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* CNIC Number */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>CNIC Number</span>
                <span className="text-[9px] text-slate-400 font-bold">13 Digits (Optional)</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  name="cnic"
                  placeholder="4210112345671"
                  value={formData.cnic}
                  onChange={handleChange}
                  maxLength={13}
                  className="pl-10 h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 font-mono tracking-wide placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 2: JURISDICTION & STATION DETAILS
           ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 transition-all hover:border-slate-300">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight">Jurisdiction & Police Station</h2>
              <p className="text-xs font-semibold text-slate-400">Jurisdictional authority registering this complaint</p>
            </div>
            <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Step 2 of 4
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* City */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                City <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.city}
                onValueChange={(val) => setFormData(prev => ({ ...prev, city: val, district: "", psName: "" }))}
                disabled={!!currentUser?.city && currentUser.role === "ps_user"}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(locationData).map(c => (
                    <SelectItem key={c} value={c} className="font-bold text-xs">
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 size={12} className="text-slate-400" />
                District <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.district}
                onValueChange={(val) => setFormData(prev => ({ ...prev, district: val, psName: "" }))}
                disabled={!!currentUser?.district && currentUser.role === "ps_user"}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {availableDistricts.length > 0 ? (
                    availableDistricts.map(d => (
                      <SelectItem key={d} value={d} className="font-bold text-xs uppercase">
                        {d.replace(/_/g, " ")}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Select city first</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Police Station */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield size={12} className="text-slate-400" />
                  Police Station <span className="text-rose-500">*</span>
                </span>
                {currentUser?.role === "ps_user" && (
                  <span className="text-[9px] font-bold text-emerald-600 inline-flex items-center gap-1">
                    <Lock size={10} /> Locked to Station
                  </span>
                )}
              </Label>
              <Select
                value={formData.psName}
                onValueChange={(val) => setFormData(prev => ({ ...prev, psName: val }))}
                disabled={!!currentUser?.ps && currentUser.role === "ps_user"}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600">
                  <SelectValue placeholder="Select Police Station" />
                </SelectTrigger>
                <SelectContent>
                  {availablePs.length > 0 ? (
                    availablePs.map(ps => (
                      <SelectItem key={ps} value={ps} className="font-bold text-xs">
                        {ps}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Select district first</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 3: DEVICE & IMEI TELEMETRY
           ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 transition-all hover:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                <Smartphone size={18} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight">Stolen / Lost Device(s)</h2>
                <p className="text-xs font-semibold text-slate-400">Enter device hardware identifiers and last active SIMs</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addDevice}
              className="h-9 px-3.5 rounded-xl border-dashed border-2 border-cyan-300 text-cyan-800 hover:bg-cyan-50/80 font-black text-xs uppercase tracking-wider gap-2 self-start sm:self-auto"
            >
              <Plus size={14} /> Add Another Device
            </Button>
          </div>

          <div className="space-y-6">
            {formData.devices.map((device, index) => (
              <div
                key={index}
                className="p-5 md:p-6 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-slate-100/40 relative space-y-5 animate-in slide-in-from-top-2 duration-200"
              >
                {/* Device Header Pill */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                    <Smartphone size={13} />
                    <span>Device #{index + 1}</span>
                  </div>

                  {formData.devices.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDevice(index)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2.5 font-bold text-xs gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Model */}
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Mobile Model <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        name="mobileModel"
                        placeholder="e.g. iPhone 15 Pro / Redmi Note 12"
                        value={device.mobileModel}
                        onChange={(e) => handleDeviceChange(index, e)}
                        required
                        className="pl-10 h-11 rounded-xl bg-white border-slate-200 font-bold text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-600"
                      />
                    </div>
                  </div>

                  {/* IMEI 1 */}
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>IMEI 1 <span className="text-rose-500">*</span></span>
                      <span className={`text-[9px] font-bold font-mono ${device.imei1.length === 15 ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>
                        {device.imei1.length}/15 Digits
                      </span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        name="imei1"
                        placeholder="358482091234567"
                        value={device.imei1}
                        onChange={(e) => handleDeviceChange(index, e)}
                        required
                        maxLength={15}
                        className="pl-10 h-11 rounded-xl bg-white border-slate-200 font-bold font-mono text-xs text-slate-800 tracking-wider placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-600"
                      />
                    </div>
                  </div>

                  {/* IMEI 2 */}
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>IMEI 2</span>
                      <span className="text-[9px] font-bold font-mono text-slate-400">
                        {device.imei2.length > 0 ? `${device.imei2.length}/15` : "Optional"}
                      </span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        name="imei2"
                        placeholder="358482097654321"
                        value={device.imei2}
                        onChange={(e) => handleDeviceChange(index, e)}
                        maxLength={15}
                        className="pl-10 h-11 rounded-xl bg-white border-slate-200 font-bold font-mono text-xs text-slate-800 tracking-wider placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-600"
                      />
                    </div>
                  </div>

                  {/* Last Number Used 1 */}
                  <div className="md:col-span-6 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Last SIM Number 1 <span className="text-rose-500">*</span></span>
                      <span className="text-[9px] text-slate-400 font-bold">In Device when snatched</span>
                    </Label>
                    <div className="relative">
                      <PhoneForwarded className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        name="lastNumUsed"
                        placeholder="0300-1234567"
                        value={device.lastNumUsed}
                        onChange={(e) => handleDeviceChange(index, e)}
                        required
                        minLength={12}
                        maxLength={12}
                        className="pl-10 h-11 rounded-xl bg-white border-slate-200 font-bold font-mono text-xs text-slate-800 tracking-wide placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-600"
                      />
                    </div>
                  </div>

                  {/* Last Number Used 2 */}
                  <div className="md:col-span-6 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Last SIM Number 2</span>
                      <span className="text-[9px] text-slate-400 font-bold">Secondary SIM (Optional)</span>
                    </Label>
                    <div className="relative">
                      <PhoneForwarded className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        name="lastNumUsed2"
                        placeholder="0300-7654321"
                        value={device.lastNumUsed2}
                        onChange={(e) => handleDeviceChange(index, e)}
                        minLength={12}
                        maxLength={12}
                        className="pl-10 h-11 rounded-xl bg-white border-slate-200 font-bold font-mono text-xs text-slate-800 tracking-wide placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            SECTION 4: INCIDENT TIMELINE & CLASSIFICATION
           ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 transition-all hover:border-slate-300">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight">Incident Details & Crime Classification</h2>
              <p className="text-xs font-semibold text-slate-400">Date, time, crime category, and narration of offence</p>
            </div>
            <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              Step 3 of 4
            </span>
          </div>

          <div className="space-y-6">
            {/* Crime Category Visual Selector */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Crime Category <span className="text-rose-500">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Snatched */}
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, crimeHead: "snatched" }))}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                    formData.crimeHead === "snatched"
                      ? "border-rose-600 bg-rose-50/70 shadow-md shadow-rose-600/10"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${formData.crimeHead === "snatched" ? "bg-rose-600 text-white" : "bg-white text-slate-500"}`}>
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-wide ${formData.crimeHead === "snatched" ? "text-rose-950" : "text-slate-800"}`}>
                      Snatched (چھینا گیا)
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Armed or forceful snatching</p>
                  </div>
                </button>

                {/* Theft */}
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, crimeHead: "theft" }))}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                    formData.crimeHead === "theft"
                      ? "border-amber-600 bg-amber-50/70 shadow-md shadow-amber-600/10"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${formData.crimeHead === "theft" ? "bg-amber-600 text-white" : "bg-white text-slate-500"}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-wide ${formData.crimeHead === "theft" ? "text-amber-950" : "text-slate-800"}`}>
                      Theft (چوری)
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Stolen from vehicle, home, pocket</p>
                  </div>
                </button>

                {/* Lost */}
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, crimeHead: "lost" }))}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                    formData.crimeHead === "lost"
                      ? "border-blue-600 bg-blue-50/70 shadow-md shadow-blue-600/10"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${formData.crimeHead === "lost" ? "bg-blue-600 text-white" : "bg-white text-slate-500"}`}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-wide ${formData.crimeHead === "lost" ? "text-blue-950" : "text-slate-800"}`}>
                      Lost (گمشدگی)
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Misplaced or missing device</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date of Offence */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-400" /> Date of Offence <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  name="dateOfOffence"
                  value={formData.dateOfOffence}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {/* Time of Offence */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Clock size={12} className="text-slate-400" /> Approximate Time <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="time"
                  name="timeOfOffence"
                  value={formData.timeOfOffence}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {/* Address / Location of Offence */}
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-400" /> Specific Incident Spot / Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Near Korangi Crossing, Opposite Total Petrol Pump, Karachi"
                  name="addressOfOffence"
                  value={formData.addressOfOffence}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {/* Other Lost Property */}
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Briefcase size={12} className="text-slate-400" /> Other Property Snatched / Lost (Optional)
                </Label>
                <Input
                  placeholder="e.g. Wallet with Rs. 15,000, Original CNIC, Bike Registration Card"
                  name="otherLostProperty"
                  value={formData.otherLostProperty}
                  onChange={handleChange}
                  className="h-12 rounded-xl bg-slate-50/60 border-slate-200 font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {/* Incident Narration Note */}
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <FileText size={12} className="text-slate-400" /> Incident Brief & Narration <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  placeholder="Describe the incident briefly: number of culprits, weapon details, escape direction, or circumstances..."
                  name="incidentNote"
                  value={formData.incidentNote}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="rounded-2xl bg-slate-50/60 border-slate-200 font-semibold text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-600 min-h-[90px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 5: EVIDENTIARY ATTACHMENTS
           ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 transition-all hover:border-slate-300">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight">Supporting Evidence & Documents</h2>
              <p className="text-xs font-semibold text-slate-400">Upload mobile box photo and attested police application / FIR copy</p>
            </div>
            <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
              Step 4 of 4
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box Picture (Optional) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Box Photo / Invoice (IMEI Verification)</span>
                <span className="text-[9px] font-bold text-slate-400">Optional</span>
              </Label>

              <div className={`relative rounded-2xl border-2 border-dashed p-4 transition-all text-center flex flex-col items-center justify-center min-h-[140px] ${
                formData.boxPicture
                  ? "border-blue-400 bg-blue-50/30"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}>
                {formData.boxPicture ? (
                  <div className="w-full flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                    {boxPreview ? (
                      <img src={boxPreview} alt="Box Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-blue-600" />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{formData.boxPicture.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{(formData.boxPicture.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile("boxPicture")}
                      className="text-slate-400 hover:text-rose-600 p-1.5 h-auto rounded-lg"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                      <ImageIcon size={20} />
                    </div>
                    <p className="text-xs font-black text-slate-700">Click to upload Box Photo</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Supports PNG, JPG, WEBP</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "boxPicture")}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Attested Application (Mandatory) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Attested Application / FIR Copy <span className="text-rose-500">*</span></span>
                <span className="text-[9px] font-bold text-rose-500 uppercase">Mandatory</span>
              </Label>

              <div className={`relative rounded-2xl border-2 border-dashed p-4 transition-all text-center flex flex-col items-center justify-center min-h-[140px] ${
                formData.attestedApplication
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}>
                {formData.attestedApplication ? (
                  <div className="w-full flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
                    {attestedPreview ? (
                      <img src={attestedPreview} alt="Doc Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <FileCheck className="w-8 h-8 text-emerald-600" />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{formData.attestedApplication.name}</p>
                      <p className="text-[10px] text-emerald-700 font-bold">
                        {(formData.attestedApplication.size / 1024).toFixed(1)} KB • Ready for secure archive
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile("attestedApplication")}
                      className="text-slate-400 hover:text-rose-600 p-1.5 h-auto rounded-lg"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                      <FileSignature size={20} />
                    </div>
                    <p className="text-xs font-black text-slate-700">Click to upload Attested Application</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Supports PDF or Image Documents</p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, "attestedApplication")}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SUBMIT ACTION DOCK
           ======================================================== */}
        <div className="sticky bottom-0 sm:bottom-2 z-30 bg-white/95 backdrop-blur-md rounded-t-2xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 -mx-3 sm:mx-0">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{formData.devices.length} Device(s) Enrolled</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="truncate max-w-[200px] sm:max-w-[280px]">
              PS: <span className="text-slate-900 font-black">{formData.psName || "Not Selected"}</span>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 hover:from-blue-800 hover:to-slate-800 text-white shadow-xl shadow-blue-950/25 transition-all gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{submittingStep || "Processing..."}</span>
                </>
              ) : (
                <>
                  <SendHorizontal size={16} />
                  <span>Submit Official Application</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
