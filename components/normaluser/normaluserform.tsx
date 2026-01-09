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
    UploadCloud, 
    MapPin, 
    Smartphone, 
    User, 
    FileText, 
    ArrowRight, 
    ArrowLeft,
    ShieldAlert,
    Info,
    Camera,
    Sparkles,
    FileUp,
    ScanSearch,
    PhoneForwarded
} from "lucide-react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import AlertModal from "@/components/ui/alert-modal";
import { cn } from "@/lib/utils";

export default function AddApplicationFormNormalUser() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [showAiModal, setShowAiModal] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Listen for sidebar trigger
  React.useEffect(() => {
    const handleOpen = () => setShowAiModal(true);
    window.addEventListener('openAiModal', handleOpen);
    return () => window.removeEventListener('openAiModal', handleOpen);
  }, []);

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
    mobileModel: "",
    imei1: "",
    imei2: "",
    lastNumUsed: "",
    crimeHead: "",
    otherLostProperty: "",
    dateOfOffence: "",
    timeOfOffence: "",
    addressOfOffence: "",
    boxPicture: null as File | null,
    attestedApplication: null as File | null,
  });

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr || dateStr === "None") return "";
    const parts = dateStr.split(".");
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const partsDash = dateStr.split("-");
    if (partsDash.length === 3) {
        return `${partsDash[2]}-${partsDash[1].padStart(2, '0')}-${partsDash[0].padStart(2, '0')}`;
    }
    return "";
  };

  const formatTimeForInput = (timeStr: string) => {
    if (!timeStr || timeStr === "None") return "";
    const cleanTime = timeStr.replace(/[^\d:apm\s]/gi, "").trim();
    const match = cleanTime.match(/(\d{1,2})[:\s](\d{2})\s*([APap][Mm])?/);
    if (!match) return "";
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleAiExtraction = async (file: File) => {
    setExtracting(true);
    const fd = new FormData();
    fd.append("files", file);

    try {
        const res = await fetch("/api/tools/extract-application", {
            method: "POST",
            body: fd,
        }).catch(err => {
            throw new Error("NETWORK_ERROR");
        });

        const data = await res.json();

        if (data.success && data.results?.[0]) {
            const result = data.results[0];
            
            if (result.error === "INVALID_DOCUMENT") {
                showAlert("Invalid Document", "The uploaded image does not appear to be a valid police application. Please upload a clear picture.", "warning");
                setExtracting(false);
                return;
            }

            if (result.error === "SERVICE_UNAVAILABLE") {
                showAlert("AI Unavailable", "LLM not available now, please fill manually.", "warning");
                setShowAiModal(false);
                setExtracting(false);
                return;
            }

            const imeis = (result["IMEI Number"] || "").split(" ").filter((i: string) => i.length >= 14);

            let matchedCity = "";
            let matchedDistrict = "";
            let matchedPs = "";

            const normalizeForMatch = (s: string) => 
                s.toLowerCase().replace(/ps-|than[aa]|police station/g, "").replace(/[^a-z0-9]/g, "").trim();

            const aiPsRaw = result["Police Station"] || "";
            const cleanAiPs = normalizeForMatch(aiPsRaw);
            
            if (cleanAiPs && cleanAiPs !== "none") {
                for (const city in locationData) {
                    for (const district in locationData[city].districts) {
                        const psList = locationData[city].districts[district].ps;
                        const match = psList.find(ps => {
                            const dbPsNormalized = normalizeForMatch(ps);
                            return dbPsNormalized === cleanAiPs || dbPsNormalized.includes(cleanAiPs) || cleanAiPs.includes(dbPsNormalized);
                        });
                        if (match) {
                            matchedCity = city; matchedDistrict = district; matchedPs = match;
                            break;
                        }
                    }
                    if (matchedCity) break;
                }
            }

            setFormData(prev => ({
                ...prev,
                applicantName: result["Name"] !== "None" ? result["Name"] : prev.applicantName,
                mobileNumber: result["Phone Number"] !== "None" ? result["Phone Number"] : prev.mobileNumber,
                lastNumUsed: result["last Num Used"] !== "None" ? result["last Num Used"] : prev.lastNumUsed,
                otherLostProperty: result["Other Property"] !== "None" ? result["Other Property"] : prev.otherLostProperty,
                mobileModel: result["Mobile Model"] !== "None" ? result["Mobile Model"] : prev.mobileModel,
                imei1: imeis[0] || prev.imei1,
                imei2: imeis[1] || prev.imei2,
                crimeHead: (result["Type"] || "").toLowerCase().includes("snatch") ? "snatched" : 
                           (result["Type"] || "").toLowerCase().includes("theft") ? "theft" : 
                           (result["Type"] || "").toLowerCase().includes("lost") ? "lost" : prev.crimeHead,
                dateOfOffence: result["Date Of Offence"] !== "None" ? formatDateForInput(result["Date Of Offence"]) : prev.dateOfOffence,
                timeOfOffence: result["Time Of Offence"] !== "None" ? formatTimeForInput(result["Time Of Offence"]) : prev.timeOfOffence,
                city: matchedCity || prev.city,
                district: matchedDistrict || prev.district,
                psName: matchedPs || prev.psName,
                attestedApplication: file
            }));
            
            showAlert("Success!", "AI has successfully extracted details. Please verify all information.", "success");
            setShowAiModal(false);
        } else {
            showAlert("AI Unavailable", "LLM not available now, please fill manually.", "warning");
            setShowAiModal(false);
        }
    } catch (err) {
        console.error("AI Error:", err);
        showAlert("Service Error", "LLM not available now, please fill manually.", "error");
        setShowAiModal(false);
    } finally {
        setExtracting(false);
    }
  };

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
        if (!formData.crimeHead || !formData.mobileModel || !formData.imei1 || !formData.lastNumUsed) {
            showAlert("Missing Info", "Crime category, mobile model, IMEI 1 and Last Number Used are required.", "warning");
            return false;
        }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    if (!formData.boxPicture || !formData.attestedApplication) {
        showAlert("Missing Documents", "Both Box Picture and Attested Form are mandatory.", "warning");
        return;
    }

    setSubmitting(true);
    try {
      const boxPicUrl = await uploadFileToStorage(formData.boxPicture, "applications");
      const attestedUrl = await uploadFileToStorage(formData.attestedApplication, "applications");

      const payload = {
        applicantName: formData.applicantName,
        applicantMobile: formData.mobileNumber,
        cnic: formData.cnic,
        city: formData.city,
        district: formData.district,
        ps: formData.psName,
        mobileModel: formData.mobileModel,
        imei1: formData.imei1,
        imei2: formData.imei2,
        lastNumUsed: formData.lastNumUsed,
        crimeHead: formData.crimeHead,
        offenceDate: formData.dateOfOffence,
        offenceTime: formData.timeOfOffence,
        offenceAddress: formData.addressOfOffence,
        note: formData.incidentNote,
        pictureUrl: boxPicUrl,
        attachmentUrl: attestedUrl,
        otherLostProperty: formData.otherLostProperty,
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
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 -mt-4 md:-mt-6">
      
      {/* 🔹 Progress Stepper */}
      <div className="flex justify-between relative px-2 md:px-4 pt-4">
        <div className="absolute top-[34px] left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
        {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    step >= s.id ? "bg-[#0a2c4e] border-[#0a2c4e] text-white" : "bg-white border-slate-200 text-slate-400"
                )}>
                    {step > s.id ? <CheckCircle2 size={16} className="md:w-[18px] md:h-[18px]" /> : <s.icon size={16} className="md:w-[18px] md:h-[18px]" />}
                </div>
                <span className={cn(
                    "hidden sm:block mt-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center",
                    step >= s.id ? "text-[#0a2c4e]" : "text-slate-400"
                )}>{s.label}</span>
            </div>
        ))}
      </div>

      <Card className="border-0 shadow-2xl rounded-[1.5rem] md:rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm mx-auto">
        <CardContent className="p-0">
            <form onSubmit={(e) => e.preventDefault()}>
                
                <div className="p-6 md:p-10 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Applicant Details</h3>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">Please provide your official identification details.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Full Name <span className="text-red-500">*</span></Label>
                                    <Input placeholder="Enter your full name" name="applicantName" value={formData.applicantName} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 focus:ring-2 ring-blue-500/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Mobile Number <span className="text-red-500">*</span></Label>
                                    <Input placeholder="03XXXXXXXXX" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">CNIC Number <span className="text-slate-400">(Optional)</span></Label>
                                    <Input placeholder="42101-XXXXXXX-X" name="cnic" value={formData.cnic} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Location */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Jurisdiction</h3>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">Select the area where the incident occurred.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">City <span className="text-red-500">*</span></Label>
                                    <Select value={formData.city} onValueChange={(val) => setFormData((prev) => ({ ...prev, city: val, district: "", psName: "" }))}>
                                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 font-bold"><SelectValue placeholder="Select City" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100">
                                            {Object.keys(locationData).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">District <span className="text-red-500">*</span></Label>
                                        <Select value={formData.district} onValueChange={(val) => setFormData((prev) => ({ ...prev, district: val, psName: "" }))} disabled={!formData.city}>
                                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 font-bold"><SelectValue placeholder="Select District" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {formData.city && Object.keys(locationData[formData.city].districts).map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Police Station <span className="text-red-500">*</span></Label>
                                        <Select value={formData.psName} onValueChange={(val) => setFormData((prev) => ({ ...prev, psName: val }))} disabled={!formData.city || !formData.district}>
                                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 font-bold"><SelectValue placeholder="Select Police Station" /></SelectTrigger>
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
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Incident Details</h3>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">Describe the timeline and location of the offence.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Date of Offence <span className="text-red-500">*</span></Label>
                                    <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Time of Offence <span className="text-red-500">*</span></Label>
                                    <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Specific Location / Address <span className="text-red-500">*</span></Label>
                                    <Input placeholder="e.g. Near LuckyOne Mall" name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Incident Description (Note) <span className="text-red-500">*</span></Label>
                                    <Textarea placeholder="Explain briefly what happened..." name="incidentNote" value={formData.incidentNote} onChange={handleChange} required className="rounded-2xl border-slate-200 bg-slate-50/50 min-h-[100px] md:min-h-[120px]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Device Info */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Mobile Device</h3>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">Identify the mobile phone that was stolen or lost.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Crime Category <span className="text-red-500">*</span></Label>
                                    <Select value={formData.crimeHead} onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
                                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 font-bold"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="snatched">Snatched</SelectItem>
                                            <SelectItem value="theft">Theft</SelectItem>
                                            <SelectItem value="lost">Lost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Mobile Model & Color <span className="text-red-500">*</span></Label>
                                    <Input placeholder="e.g. iPhone 15 Pro" name="mobileModel" value={formData.mobileModel} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">IMEI 1 <span className="text-red-500">*</span></Label>
                                    <Input placeholder="15 Digit Number" name="imei1" value={formData.imei1} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 font-mono tracking-widest" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">IMEI 2 <span className="text-slate-400">(Optional)</span></Label>
                                    <Input placeholder="15 Digit Number" name="imei2" value={formData.imei2} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 font-mono tracking-widest" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Last Number Used <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <Input placeholder="03XXXXXXXXX" name="lastNumUsed" value={formData.lastNumUsed} onChange={handleChange} required className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12 pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500">Other Lost Property</Label>
                                    <Input placeholder="e.g. Wallet, Cash" name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} className="rounded-xl border-slate-200 bg-slate-50/50 h-11 md:h-12" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Evidence */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-[#0a2c4e] uppercase tracking-tight">Attachments</h3>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">Upload necessary proofs for verification.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
                                <div className="group relative p-6 md:p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all text-center cursor-pointer">
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="space-y-4">
                                        <div className={cn("mx-auto w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", formData.boxPicture ? "bg-emerald-50 text-emerald-600" : "bg-white text-blue-600")}>
                                            {formData.boxPicture ? <CheckCircle2 size={28} /> : <Smartphone size={28} />}
                                        </div>
                                        <div><p className="font-bold text-slate-800 text-sm md:text-base">{formData.boxPicture ? "Box Picture Selected" : "Box Picture"}</p></div>
                                        {formData.boxPicture && <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full inline-flex items-center gap-2 border border-emerald-100 max-w-full truncate">Selected: {formData.boxPicture.name.substring(0, 15)}...</div>}
                                    </div>
                                </div>
                                <div className="group relative p-6 md:p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all text-center cursor-pointer">
                                    <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "attestedApplication")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="space-y-4">
                                        <div className={cn("mx-auto w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", formData.attestedApplication ? "bg-emerald-50 text-emerald-600" : "bg-white text-blue-600")}>
                                            {formData.attestedApplication ? <CheckCircle2 size={28} /> : <FileText size={28} />}
                                        </div>
                                        <div><p className="font-bold text-slate-800 text-sm md:text-base">{formData.attestedApplication ? "Application Uploaded" : "Attested Form"}</p></div>
                                        {formData.attestedApplication && <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full inline-flex items-center gap-2 border border-emerald-100 max-w-full truncate">Selected: {formData.attestedApplication.name.substring(0, 15)}...</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 border-t border-slate-100 p-6 flex items-center justify-between">
                    <div>
                        {step > 1 && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={prevStep} 
                                disabled={submitting}
                                className="rounded-xl font-bold text-slate-500 hover:text-[#0a2c4e]"
                            >
                                <ArrowLeft className="mr-2" size={18} /> <span className="hidden sm:inline">Previous</span>
                            </Button>
                        )}
                    </div>
                    
                    <div>
                        {step < 5 ? (
                            <Button 
                                type="button" 
                                onClick={nextStep}
                                className="bg-[#0a2c4e] text-white px-10 rounded-xl font-black uppercase tracking-widest text-[11px] h-12 group shadow-xl"
                            >
                                Next Step <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                            </Button>
                        ) : (
                            <Button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-red-600 hover:bg-red-700 text-white px-12 rounded-xl font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-red-600/20"
                            >
                                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application"}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </CardContent>
      </Card>

      {/* AI EXTRACTION MODAL */}
      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-[1.5rem] md:rounded-[2rem] shadow-2xl mx-4">
            <div className="bg-gradient-to-br from-[#0a2c4e] via-[#154b8c] to-[#0a2c4e] p-6 md:p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={80} className="md:w-[120px] md:h-[120px]" /></div>
                <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center text-white mb-4 md:mb-6 animate-pulse"><ScanSearch size={32} className="md:w-[40px] md:h-[40px]" /></div>
                <DialogTitle className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">AI Auto-Fill</DialogTitle>
                <DialogDescription className="text-blue-100 font-medium text-xs md:text-sm">Upload your verified police station application and our AI will automatically fill the form for you.</DialogDescription>
            </div>
            <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                <div className="group relative">
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAiExtraction(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" disabled={extracting} />
                    <div className={cn("p-6 md:p-10 border-2 border-dashed rounded-[1.5rem] text-center transition-all duration-300", extracting ? "bg-slate-50 border-slate-200" : "bg-blue-50/50 border-blue-200 group-hover:border-blue-400 group-hover:bg-blue-50")}>
                        {extracting ? (
                            <div className="flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 md:h-10 md:w-10 text-blue-600 animate-spin" /><p className="font-bold text-slate-800 text-sm">Reading Application...</p></div>
                        ) : (
                            <div className="flex flex-col items-center gap-4"><div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600"><FileUp size={20} className="md:w-[24px] md:h-[24px]" /></div><p className="font-bold text-slate-800 uppercase tracking-tight text-xs md:text-sm">Upload Document</p></div>
                        )}
                    </div>
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div><div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.2em]"><span className="bg-white px-4 text-slate-300">Or</span></div></div>
                <Button variant="ghost" onClick={() => setShowAiModal(false)} className="w-full h-12 md:h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[11px] text-slate-500 hover:bg-slate-50 border border-slate-100">Fill Form Manually</Button>
            </div>
        </DialogContent>
      </Dialog>

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