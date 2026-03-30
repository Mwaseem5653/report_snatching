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
    ShieldAlert,
    Camera,
    PhoneForwarded,
    X,
    Plus,
    Trash2
} from "lucide-react";
import AlertModal from "@/components/ui/alert-modal";
import { cn } from "@/lib/utils";

export default function AddApplicationFormNormalUser() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const validateForm = () => {
    if (!formData.applicantName || !formData.mobileNumber) {
        showAlert("Missing Info", "Please fill name and mobile number.", "warning");
        return false;
    }
    if (!formData.city || !formData.district || !formData.psName) {
        showAlert("Missing Info", "Please select City, District and Police Station.", "warning");
        return false;
    }
    if (!formData.dateOfOffence || !formData.timeOfOffence || !formData.addressOfOffence || !formData.incidentNote) {
        showAlert("Missing Info", "Please provide incident date, time, location and description.", "warning");
        return false;
    }
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
    if (!formData.attestedApplication) {
        showAlert("Missing Documents", "Attested Form is mandatory.", "warning");
        return false;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === "cnic") value = value.replace(/\D/g, "").slice(0, 13);
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
    if (name === "imei1" || name === "imei2") value = value.replace(/\D/g, "").slice(0, 15);
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
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let boxPicUrl = "";
      if (formData.boxPicture) {
        const boxPicRes = await uploadFileToStorage(formData.boxPicture, "applications");
        boxPicUrl = boxPicRes.secure_url;
      }

      const attestedRes = await uploadFileToStorage(formData.attestedApplication!, "applications");
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
        devices: formData.devices, 
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
        <p className="text-slate-500 text-center mb-8 font-medium">Your application has been received. You will be notified via mobile number for further updates.</p>
        <Button onClick={() => router.push("/")} className="w-full bg-[#0a2c4e] hover:bg-slate-800 h-14 text-lg rounded-xl font-bold transition-all shadow-xl">Return to Home Page</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        
        {/* 🔹 TOP GRID: APPLICANT & JURISDICTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          {/* Section 1: Personal Info */}
          <Card className="border-0 shadow-xl rounded-3xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={20} /></div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg md:text-xl font-black text-[#0a2c4e] uppercase tracking-tight leading-none mb-1">Applicant Details</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">Your official identification details.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Full Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="Enter your full name" name="applicantName" value={formData.applicantName} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 focus:ring-2 ring-blue-500/20 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Mobile Number <span className="text-red-500">*</span></Label>
                        <Input placeholder="0300-XXXXXXX" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">CNIC Number <span className="text-slate-400">(Optional)</span></Label>
                        <Input placeholder="42101XXXXXXX" name="cnic" value={formData.cnic} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold" />
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Section 2: Location */}
          <Card className="border-0 shadow-xl rounded-3xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MapPin size={20} /></div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg md:text-xl font-black text-[#0a2c4e] uppercase tracking-tight leading-none mb-1">Jurisdiction</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">Where the incident occurred.</p>
                    </div>
                </div>
                <div className="space-y-4 md:space-y-6">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">City <span className="text-red-500">*</span></Label>
                        <Select value={formData.city} onValueChange={(val) => setFormData((prev) => ({ ...prev, city: val, district: "", psName: "" }))}>
                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select City" /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {Object.keys(locationData).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">District <span className="text-red-500">*</span></Label>
                            <Select value={formData.district} onValueChange={(val) => setFormData((prev) => ({ ...prev, district: val, psName: "" }))} disabled={!formData.city}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select District" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {formData.city && Object.keys(locationData[formData.city].districts).map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Police Station <span className="text-red-500">*</span></Label>
                            <Select value={formData.psName} onValueChange={(val) => setFormData((prev) => ({ ...prev, psName: val }))} disabled={!formData.city || !formData.district}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select Police Station" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {formData.city && formData.district && locationData[formData.city].districts[formData.district].ps.map((ps) => (<SelectItem key={ps} value={ps}>{ps}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* 🔹 SECOND GRID: INCIDENT & DEVICE INFO */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
            
            {/* Section 3: Incident Details */}
            <Card className="xl:col-span-5 border-0 shadow-xl rounded-3xl bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ShieldAlert size={20} /></div>
                        <div className="space-y-0.5">
                            <h3 className="text-lg md:text-xl font-black text-[#0a2c4e] uppercase tracking-tight leading-none mb-1">Incident Details</h3>
                            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Timeline and location of offence.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-1">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Date <span className="text-red-500">*</span></Label>
                            <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Time <span className="text-red-500">*</span></Label>
                            <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold" />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Incident Address <span className="text-red-500">*</span></Label>
                            <Input placeholder="e.g. Near LuckyOne Mall" name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold" />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Description <span className="text-red-500">*</span></Label>
                            <Textarea placeholder="Explain briefly what happened..." name="incidentNote" value={formData.incidentNote} onChange={handleChange} required className="rounded-2xl border-slate-200 bg-slate-50/50 min-h-[120px] font-bold" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 4: Device Info */}
            <Card className="xl:col-span-7 border-0 shadow-xl rounded-3xl bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Smartphone size={20} /></div>
                            <div className="space-y-0.5">
                                <h3 className="text-lg md:text-xl font-black text-[#0a2c4e] uppercase tracking-tight leading-none mb-1">Mobile Device(s)</h3>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium">Stolen or lost phone(s).</p>
                            </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addDevice} className="rounded-xl h-10 border-blue-200 text-blue-600 hover:bg-blue-50 font-black uppercase tracking-widest text-[10px]">
                            <Plus size={16} className="mr-2" /> Add Device
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1.5 max-w-sm">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Crime Category <span className="text-red-500">*</span></Label>
                            <Select value={formData.crimeHead} onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="snatched">Snatched / چھین لیا گیا</SelectItem>
                                    <SelectItem value="theft">Theft / چوری</SelectItem>
                                    <SelectItem value="lost">Lost / گمشدہ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {formData.devices.map((device, index) => (
                                <div key={index} className="p-4 md:p-6 rounded-2xl border border-slate-100 bg-slate-50/50 relative space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-[#0a2c4e] text-white flex items-center justify-center text-[10px] font-bold">
                                                {index + 1}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#0a2c4e]">Device {index + 1}</span>
                                        </div>
                                        {formData.devices.length > 1 && (
                                            <button type="button" onClick={() => removeDevice(index)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Mobile Model & Color <span className="text-red-500">*</span></Label>
                                            <Input placeholder="e.g. iPhone 15 Pro Max Blue" name="mobileModel" value={device.mobileModel} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 bg-white h-12 font-bold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">IMEI 1 <span className="text-red-500">*</span></Label>
                                            <Input placeholder="15 Digit Number" name="imei1" value={device.imei1} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 bg-white h-12 font-bold font-mono tracking-widest" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Last Number Used 1 <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <Input placeholder="0300-XXXXXXX" name="lastNumUsed" value={device.lastNumUsed} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 bg-white h-12 pl-10 font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">IMEI 2 <span className="text-slate-400">(Optional)</span></Label>
                                            <Input placeholder="15 Digit Number" name="imei2" value={device.imei2} onChange={(e) => handleDeviceChange(index, e)} className="rounded-xl border-slate-200 bg-white h-12 font-bold font-mono tracking-widest" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Other Lost Property</Label>
                            <Input placeholder="e.g. CNIC, Wallet, Cash Amount" name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-12 md:h-14 font-bold" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* 🔹 BOTTOM SECTION: EVIDENCE & SUBMIT */}
        <Card className="border-0 shadow-xl rounded-3xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                  
                  {/* Evidence Uploads */}
                  <div className="flex-1 w-full space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Camera size={20} /></div>
                          <div className="space-y-0.5">
                              <h3 className="text-lg md:text-xl font-black text-[#0a2c4e] uppercase tracking-tight leading-none mb-1">Evidence</h3>
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium">Verify your ownership.</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div className="group relative p-6 md:p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all text-center cursor-pointer">
                              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                              <div className="space-y-4">
                                  <div className={cn("mx-auto w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", formData.boxPicture ? "bg-emerald-50 text-emerald-600" : "bg-white text-blue-600")}>
                                      {formData.boxPicture ? <CheckCircle2 size={24} /> : <Smartphone size={24} />}
                                  </div>
                                  <div><p className="font-bold text-slate-800 text-xs md:text-base">{formData.boxPicture ? "Box Picture Selected" : "Box Picture (Optional)"}</p></div>
                                  {formData.boxPicture && <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full inline-flex items-center gap-2 border border-emerald-100 max-w-full truncate">Selected: {formData.boxPicture.name.substring(0, 15)}...</div>}
                              </div>
                          </div>
                          <div className="group relative p-6 md:p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all text-center cursor-pointer">
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "attestedApplication")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                              <div className="space-y-4">
                                  <div className={cn("mx-auto w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", formData.attestedApplication ? "bg-emerald-50 text-emerald-600" : "bg-white text-blue-600")}>
                                      {formData.attestedApplication ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                                  </div>
                                  <div><p className="font-bold text-slate-800 text-xs md:text-base">{formData.attestedApplication ? "Application Uploaded" : "Attested Form *"}</p></div>
                                  {formData.attestedApplication && <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full inline-flex items-center gap-2 border border-emerald-100 max-w-full truncate">Selected: {formData.attestedApplication.name.substring(0, 15)}...</div>}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Submit Block */}
                  <div className="w-full lg:w-80 space-y-4 pt-4 lg:pt-14">
                      <div className="p-6 bg-[#0a2c4e] rounded-3xl text-white space-y-6 shadow-2xl">
                          <div className="space-y-2">
                              <h4 className="text-sm font-black uppercase tracking-[0.2em] opacity-60">Confirmation</h4>
                              <p className="text-xs font-medium leading-relaxed">I solemnly declare that all information provided is accurate to the best of my knowledge.</p>
                          </div>
                          <Button 
                              type="submit"
                              disabled={submitting}
                              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs h-16 shadow-xl shadow-red-600/20"
                          >
                              {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> ...</> : "Submit Application"}
                          </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center font-bold px-4 uppercase tracking-widest leading-relaxed">By submitting, your data will be securely stored in Sindh Police Central Database.</p>
                  </div>
              </div>
          </CardContent>
        </Card>

      </form>

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
