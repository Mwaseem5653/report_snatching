"use client";

import React, { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { uploadFileToStorage } from "@/lib/uploadHelper";
import { addApplication } from "@/lib/applicationApi";
import { locationData } from "@/components/location/location";
import { 
    Loader2, 
    CheckCircle2, 
    MapPin, 
    Smartphone, 
    User, 
    FileText, 
    ArrowRight, 
    ArrowLeft,
    ShieldAlert,
    Camera,
    PhoneForwarded,
    X
} from "lucide-react";
import AlertModal from "@/components/ui/alert-modal";
import { cn } from "@/lib/utils";

export default function AddApplicationFormNormalUser() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);

  // Alert State
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    description: "",
    type: "info" as "success" | "error" | "warning" | "info"
  });

  const showAlert = (title: string, description: string, type: any = "info") => {
    setAlertConfig({ isOpen: true, title, description, type });
  };

  const [formData, setFormData] = useState({
    applicantName: "",
    mobileNumber: "",
    cnic: "",
    city: "",
    district: "",
    psName: "",
    incidentNote: "",
    crimeHead: "",
    otherLostProperty: "",
    dateOfOffence: "",
    timeOfOffence: "",
    addressOfOffence: "",
    devices: [
      { mobileModel: "", imei1: "", imei2: "", lastNumUsed: "", lastNumUsed2: "" }
    ],
    boxPicture: null as File | null,
    attestedApplication: null as File | null,
  });

  const validateStep = () => {
    if (step === 1) {
        if (!formData.applicantName || !formData.mobileNumber) {
            showAlert("Missing Info", "Please fill name and mobile number.", "warning");
            return false;
        }
    } else if (step === 2) {
        if (!formData.city || !formData.district || !formData.psName) {
            showAlert("Missing Info", "Please select City, District and Police Station.", "warning");
            return false;
        }
    } else if (step === 3) {
        if (!formData.dateOfOffence || !formData.timeOfOffence || !formData.addressOfOffence || !formData.incidentNote) {
            showAlert("Missing Info", "Please provide incident date, time, location and description.", "warning");
            return false;
        }
    } else if (step === 4) {
        if (!formData.crimeHead) {
            showAlert("Missing Info", "Crime category is required.", "warning");
            return false;
        }
        for (const device of formData.devices) {
            if (!device.mobileModel || !device.imei1 || !device.lastNumUsed) {
                showAlert("Missing Info", "Mobile model, IMEI 1 and Last Number Used are required for all devices.", "warning");
                return false;
            }
        }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;

    if (name === "cnic") {
        value = value.replace(/\D/g, "").slice(0, 13);
    }

    if (name === "mobileNumber") {
        let digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length > 4) value = digits.slice(0, 4) + "-" + digits.slice(4);
        else value = digits;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeviceChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
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
        devices: [...prev.devices, { mobileModel: "", imei1: "", imei2: "", lastNumUsed: "", lastNumUsed2: "" }]
    }));
  };

  const removeDevice = (index: number) => {
    if (formData.devices.length === 1) return;
    const newDevices = formData.devices.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, devices: newDevices }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, [field]: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 5) return;
    if (!validateStep()) return;
    if (!formData.attestedApplication) {
        showAlert("Missing Documents", "Attested Form is mandatory.", "warning");
        return;
    }

    setSubmitting(true);
    try {
      let boxPicUrl = "";
      if (formData.boxPicture) {
        const boxPicRes = await uploadFileToStorage(formData.boxPicture, "applications");
        boxPicUrl = boxPicRes.secure_url;
      }

      const attestedRes = await uploadFileToStorage(formData.attestedApplication, "applications");
      const attestedUrl = attestedRes.secure_url;
      
      const payload = {
        applicantName: formData.applicantName,
        applicantMobile: formData.mobileNumber,
        cnic: formData.cnic,
        city: formData.city,
        district: formData.district,
        ps: formData.psName,
        crimeHead: formData.crimeHead,
        offenceDate: formData.dateOfOffence,
        offenceTime: formData.timeOfOffence,
        offenceAddress: formData.addressOfOffence,
        note: formData.incidentNote,
        pictureUrl: boxPicUrl,
        attachmentUrl: attestedUrl,
        otherLostProperty: formData.otherLostProperty,
        devices: formData.devices, // Sending array of devices
        role: "user",
      };

      const res = await addApplication(payload);
      if (res?.success) setSubmitted(true);
      else showAlert("Submission Failed", res?.message || "Something went wrong.", "error");
    } catch (error: any) {
      showAlert("Error", "Submission error: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg mx-auto mt-10 animate-in fade-in zoom-in duration-500">
        <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">Submitted Successfully!</h2>
        <p className="text-slate-500 text-center mb-8 font-medium">
          Your application has been received. You will be notified via mobile number for further updates.
        </p>
        <Button onClick={() => router.push("/")} className="w-full bg-[#0a2c4e] hover:bg-slate-800 h-14 text-lg rounded-xl font-bold transition-all shadow-xl">
          Return to Home Page
        </Button>
      </div>
    );
  }

  const steps = [
    { id: 1, label: "Applicant", icon: User },
    { id: 2, label: "Location", icon: MapPin },
    { id: 3, label: "Incident", icon: ShieldAlert },
    { id: 4, label: "Device", icon: Smartphone },
    { id: 5, label: "Evidence", icon: Camera },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full max-h-[calc(100vh-120px)] md:max-h-[calc(100vh-160px)]">
      
      {/* 🔹 Progress Stepper - More Compact */}
      <div className="flex justify-between relative px-4 py-2 shrink-0">
        <div className="absolute top-[26px] left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
        {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div className={cn(
                    "w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    step >= s.id ? "bg-[#0a2c4e] border-[#0a2c4e] text-white" : "bg-white border-slate-200 text-slate-400"
                )}>
                    {step > s.id ? <CheckCircle2 size={14} className="md:w-[18px] md:h-[18px]" /> : <s.icon size={14} className="md:w-[18px] md:h-[18px]" />}
                </div>
                <span className={cn(
                    "hidden sm:block mt-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center",
                    step >= s.id ? "text-[#0a2c4e]" : "text-slate-400"
                )}>{s.label}</span>
            </div>
        ))}
      </div>

      <Card className="flex-1 border-0 shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm mx-auto flex flex-col w-full">
        <CardContent className="p-0 flex flex-col h-full overflow-hidden">
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col h-full">
                
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 custom-scrollbar">
                    
                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-4 md:space-y-6">
                            <div className="space-y-0.5">
                                <h3 className="text-lg md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Applicant Details</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 font-medium">Please provide your official identification details.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pt-1">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Full Name <span className="text-red-500">*</span></Label>
                                    <Input placeholder="Enter your full name" name="applicantName" value={formData.applicantName} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 focus:ring-2 ring-blue-500/20" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Mobile Number <span className="text-red-500">*</span></Label>
                                    <Input placeholder="0300-XXXXXXX" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14" />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">CNIC Number <span className="text-slate-400">(Optional)</span></Label>
                                    <Input placeholder="42101XXXXXXX" name="cnic" value={formData.cnic} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Location */}
                    {step === 2 && (
                        <div className="space-y-4 md:space-y-6">
                            <div className="space-y-0.5">
                                <h3 className="text-lg md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Jurisdiction</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 font-medium">Select the area where the incident occurred.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:gap-6 pt-1">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">City <span className="text-red-500">*</span></Label>
                                    <Select value={formData.city} onValueChange={(val) => setFormData((prev) => ({ ...prev, city: val, district: "", psName: "" }))}>
                                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select City" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100">
                                            {Object.keys(locationData).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">District <span className="text-red-500">*</span></Label>
                                        <Select value={formData.district} onValueChange={(val) => setFormData((prev) => ({ ...prev, district: val, psName: "" }))} disabled={!formData.city}>
                                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select District" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {formData.city && Object.keys(locationData[formData.city].districts).map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Police Station <span className="text-red-500">*</span></Label>
                                        <Select value={formData.psName} onValueChange={(val) => setFormData((prev) => ({ ...prev, psName: val }))} disabled={!formData.city || !formData.district}>
                                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select Police Station" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {formData.city && formData.district && locationData[formData.city].districts[formData.district].ps.map((ps) => (<SelectItem key={ps} value={ps}>{ps}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Incident Details */}
                    {step === 3 && (
                        <div className="space-y-4 md:space-y-6">
                            <div className="space-y-0.5">
                                <h3 className="text-lg md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Incident Details</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 font-medium">Describe the timeline and location of the offence.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pt-1">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Date of Offence <span className="text-red-500">*</span></Label>
                                    <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Time of Offence <span className="text-red-500">*</span></Label>
                                    <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14" />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Incident Location / Address <span className="text-red-500">*</span></Label>
                                    <Input placeholder="e.g. Near LuckyOne Mall" name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14" />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Incident Description (Note) <span className="text-slate-400">(Optional)</span></Label>
                                    <Textarea placeholder="Explain briefly what happened..." name="incidentNote" value={formData.incidentNote} onChange={handleChange} className="rounded-2xl border-slate-200 bg-slate-50/50 min-h-[80px] md:min-h-[100px]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Device Info (Multiple Support) */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Mobile Device(s)</h3>
                                    <p className="text-[10px] md:text-sm text-slate-500 font-medium">Identify the mobile phone(s) that were stolen or lost.</p>
                                </div>
                                <Button type="button" size="sm" onClick={addDevice} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 md:h-10 text-[10px] font-bold uppercase tracking-wider">
                                    + Add Device
                                </Button>
                            </div>

                            <div className="space-y-4 pt-1">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Crime Category <span className="text-red-500">*</span></Label>
                                    <Select value={formData.crimeHead} onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
                                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="snatched">Snatched</SelectItem>
                                            <SelectItem value="theft">Theft</SelectItem>
                                            <SelectItem value="lost">Lost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.devices.map((device, index) => (
                                    <div key={index} className="p-4 md:p-6 rounded-2xl border border-slate-200 bg-slate-50/30 relative space-y-3 md:space-y-4 animate-in fade-in zoom-in duration-300">
                                        {formData.devices.length > 1 && (
                                            <button type="button" onClick={() => removeDevice(index)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors">
                                                <X size={18} />
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-[#0a2c4e] text-white flex items-center justify-center text-[10px] font-bold">
                                                {index + 1}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#0a2c4e]">Device {index + 1}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Mobile Model & Color <span className="text-red-500">*</span></Label>
                                                <Input placeholder="e.g. iPhone 15 Pro" name="mobileModel" value={device.mobileModel} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 bg-white h-12 md:h-14" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">IMEI 1 <span className="text-red-500">*</span></Label>
                                                <Input placeholder="15 Digit Number" name="imei1" value={device.imei1} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 bg-white h-12 md:h-14 font-mono tracking-widest" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">IMEI 2 <span className="text-slate-400">(Optional)</span></Label>
                                                <Input placeholder="15 Digit Number" name="imei2" value={device.imei2} onChange={(e) => handleDeviceChange(index, e)} className="rounded-xl border-slate-200 bg-white h-12 md:h-14 font-mono tracking-widest" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Last Number Used 1 <span className="text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                    <Input placeholder="0300-XXXXXXX" name="lastNumUsed" value={device.lastNumUsed} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 bg-white h-12 md:h-14 pl-10" />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Last Number Used 2 <span className="text-slate-400">(Optional)</span></Label>
                                                <div className="relative">
                                                    <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                    <Input placeholder="0300-XXXXXXX" name="lastNumUsed2" value={device.lastNumUsed2} onChange={(e) => handleDeviceChange(index, e)} className="rounded-xl border-slate-200 bg-white h-12 md:h-14 pl-10" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Other Lost Property</Label>
                                    <Input placeholder="e.g. Wallet, Cash" name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Evidence */}
                    {step === 5 && (
                        <div className="space-y-4 md:space-y-6">
                            <div className="space-y-0.5">
                                <h3 className="text-lg md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Attachments</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 font-medium">Upload necessary proofs for verification.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pt-1">
                                <div className="group relative p-4 md:p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all text-center cursor-pointer">
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="space-y-2 md:space-y-4">
                                        <div className={cn("mx-auto w-10 h-10 md:w-16 md:h-16 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", formData.boxPicture ? "bg-emerald-50 text-emerald-600" : "bg-white text-blue-600")}>
                                            {formData.boxPicture ? <CheckCircle2 size={24} /> : <Smartphone size={24} />}
                                        </div>
                                        <div><p className="font-bold text-slate-800 text-xs md:text-base">{formData.boxPicture ? "Box Picture Selected" : "Box Picture (Optional)"}</p></div>
                                        {formData.boxPicture && <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[8px] md:text-[9px] font-bold rounded-full inline-flex items-center gap-2 border border-emerald-100 max-w-full truncate">Selected: {formData.boxPicture.name.substring(0, 15)}...</div>}
                                    </div>
                                </div>
                                <div className="group relative p-4 md:p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all text-center cursor-pointer">
                                    <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "attestedApplication")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="space-y-2 md:space-y-4">
                                        <div className={cn("mx-auto w-10 h-10 md:w-16 md:h-16 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", formData.attestedApplication ? "bg-emerald-50 text-emerald-600" : "bg-white text-blue-600")}>
                                            {formData.attestedApplication ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                                        </div>
                                        <div><p className="font-bold text-slate-800 text-xs md:text-base">{formData.attestedApplication ? "Application Uploaded" : "Attested Form"}</p></div>
                                        {formData.attestedApplication && <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[8px] md:text-[9px] font-bold rounded-full inline-flex items-center gap-2 border border-emerald-100 max-w-full truncate">Selected: {formData.attestedApplication.name.substring(0, 15)}...</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Footer Buttons */}
                <div className="bg-slate-50 border-t border-slate-100 p-4 md:p-6 shrink-0 flex items-center justify-between">
                    <div>
                        {step > 1 && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={prevStep} 
                                disabled={submitting}
                                className="rounded-xl font-bold text-slate-500 hover:text-[#0a2c4e] h-10 md:h-12"
                            >
                                <ArrowLeft className="mr-1 md:mr-2" size={16} /> <span className="text-xs md:text-sm">Back</span>
                            </Button>
                        )}
                    </div>
                    
                    <div>
                        {step < 5 ? (
                            <Button 
                                type="button" 
                                onClick={nextStep}
                                className="bg-[#0a2c4e] text-white px-6 md:px-10 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-[11px] h-10 md:h-12 group shadow-xl"
                            >
                                Next <ArrowRight className="ml-1 md:ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                            </Button>
                        ) : (
                            <Button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-red-600 hover:bg-red-700 text-white px-8 md:px-12 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-[11px] h-10 md:h-12 shadow-xl shadow-red-600/20"
                            >
                                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ...</> : "Submit Application"}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </CardContent>
      </Card>

      <AlertModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        description={alertConfig.description}
        type={alertConfig.type}
      />
    </div>
  );
}
