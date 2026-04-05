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
import { uploadFileToStorage } from "@/lib/uploadHelper";
import { addApplication } from "@/lib/applicationApi";
import { locationData } from "@/components/location/location";
import { CheckCircle2, PhoneForwarded, Plus, Smartphone, Trash2 } from "lucide-react";

type AddApplicationFormProps = {
  currentUser?: any;
};

export default function AddApplicationForm({ currentUser }: AddApplicationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    applicantName: "",
    mobileNumber: "",
    cnic: "",
    city: currentUser?.city?.toLowerCase() || "",
    district: currentUser?.district || "",
    psName: currentUser?.ps || "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;

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

    // 🚀 VALIDATION: Ensure Jurisdiction is selected
    if (!formData.city || !formData.district || !formData.psName) {
        alert("❌ Error: City, District, and Police Station selection is mandatory.");
        return;
    }

    // Check mobile number length (digits only)
    const mobileDigits = formData.mobileNumber.replace(/\D/g, "");
    if (mobileDigits.length !== 11) {
        alert("❌ Error: Mobile number must be exactly 11 digits.");
        return;
    }

    // Check device last numbers
    for (let i = 0; i < formData.devices.length; i++) {
        const d = formData.devices[i];
        const lastNumDigits = d.lastNumUsed.replace(/\D/g, "");
        if (lastNumDigits.length !== 11) {
            alert(`❌ Error: Device ${i+1} last number used must be exactly 11 digits.`);
            return;
        }
    }

    setSubmitting(true);

    try {
      let boxPicUrl = "";
      let attestedUrl = "";

      if (formData.boxPicture) {
        const res = await uploadFileToStorage(formData.boxPicture, "applications");
        boxPicUrl = res.secure_url;
      }
      if (formData.attestedApplication) {
        const res = await uploadFileToStorage(formData.attestedApplication, "applications");
        attestedUrl = res.secure_url;
      }

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
      };

      const res = await addApplication(payload);

      if (res?.success) {
        setSubmitted(true);
      } else {
        alert(`❌ Failed: ${res?.message || "Something went wrong"}`);
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      alert("Error submitting application: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl text-center animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted</h2>
        <p className="text-gray-500 mb-8">Case has been successfully added to the database.</p>
        <Button onClick={() => {
            if (currentUser) window.location.reload();
            else router.push("/");
        }} className="bg-blue-900 hover:bg-blue-800 h-12 px-10 rounded-xl">
          Close Window
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 p-6 md:p-10">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-10">
        
        {/* Applicant Section */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                Applicant Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Full Name *</Label>
                    <Input name="applicantName" value={formData.applicantName} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Mobile Number *</Label>
                    <Input placeholder="0300-XXXXXXX" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required minLength={11} maxLength={11} className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">CNIC Number (Optional)</Label>
                    <Input placeholder="42101XXXXXXX" name="cnic" value={formData.cnic} onChange={handleChange} className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">City *</Label>
                    <Input name="city" value={formData.city} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">District *</Label>
                    <Select 
                        value={formData.district} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, district: val, psName: "" }))}
                        disabled={!!currentUser?.district && currentUser.role === "ps_user"}
                    >
                        <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 font-bold border-slate-200">
                            <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                            {formData.city && locationData[formData.city.toLowerCase()] ? (
                                Object.keys(locationData[formData.city.toLowerCase()].districts).map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>Select city first</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Police Station *</Label>
                    <Select 
                        value={formData.psName} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, psName: val }))}
                        disabled={!!currentUser?.ps && currentUser.role === "ps_user"}
                    >
                        <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 font-bold border-slate-200">
                            <SelectValue placeholder="Select Police Station" />
                        </SelectTrigger>
                        <SelectContent>
                            {formData.district && formData.city && locationData[formData.city.toLowerCase()]?.districts[formData.district] ? (
                                locationData[formData.city.toLowerCase()].districts[formData.district].ps.map(ps => (
                                    <SelectItem key={ps} value={ps}>{ps}</SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>Select district first</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </section>

        {/* Device Section */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6 border-b border-blue-50 pb-4">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    Device & Incident Information
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addDevice} className="rounded-xl h-9 border-blue-200 text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-widest text-[9px]">
                    <Plus size={14} className="mr-1.5" /> Add Device
                </Button>
            </div>

            <div className="space-y-8">
                {/* 🔹 Multi-Device List */}
                <div className="space-y-6">
                    {formData.devices.map((device, index) => (
                        <div key={index} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 relative space-y-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center text-[10px] font-bold">
                                        {index + 1}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Device {index + 1}</span>
                                </div>
                                {formData.devices.length > 1 && (
                                    <button type="button" onClick={() => removeDevice(index)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-slate-500">Mobile Model *</Label>
                                    <Input name="mobileModel" value={device.mobileModel} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 h-11 bg-white font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-slate-500">IMEI 1 *</Label>
                                    <Input placeholder="15 Digit Number" name="imei1" value={device.imei1} onChange={(e) => handleDeviceChange(index, e)} required className="rounded-xl border-slate-200 h-11 bg-white font-mono font-bold tracking-widest" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-slate-500">IMEI 2 (Optional)</Label>
                                    <Input placeholder="15 Digit Number" name="imei2" value={device.imei2} onChange={(e) => handleDeviceChange(index, e)} className="rounded-xl border-slate-200 h-11 bg-white font-mono font-bold tracking-widest" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-slate-500">Last Number Used 1 *</Label>
                                    <div className="relative">
                                        <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <Input placeholder="0300-XXXXXXX" name="lastNumUsed" value={device.lastNumUsed} onChange={(e) => handleDeviceChange(index, e)} required minLength={12} maxLength={12} className="pl-10 rounded-xl border-slate-200 h-11 bg-white font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-slate-500">Last Number Used 2 (Optional)</Label>
                                    <div className="relative">
                                        <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <Input placeholder="0300-XXXXXXX" name="lastNumUsed2" value={device.lastNumUsed2} onChange={(e) => handleDeviceChange(index, e)} minLength={12} maxLength={12} className="pl-10 rounded-xl border-slate-200 h-11 bg-white font-bold" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 🔹 Incident Specifics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Crime Category *</Label>
                        <Select value={formData.crimeHead} onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 font-bold border-slate-200"><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent><SelectItem value="snatched">Snatched</SelectItem><SelectItem value="theft">Theft</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Date of Offence *</Label>
                        <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="rounded-xl h-11 bg-slate-50/50 font-bold border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Time of Offence *</Label>
                        <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required className="rounded-xl h-11 bg-slate-50/50 font-bold border-slate-200" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Incident Location / Address *</Label>
                        <Input placeholder="e.g. Near LuckyOne Mall" name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-bold" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Other Lost Property (e.g. Wallet, Cash)</Label>
                        <Input name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-bold" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Incident Details *</Label>
                        <Textarea name="incidentNote" value={formData.incidentNote} onChange={handleChange} required className="rounded-2xl border-slate-200 min-h-[100px] bg-slate-50/50 font-bold" />
                    </div>
                </div>
            </div>
        </section>

        {/* Evidence Section */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                Attachments
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Box Picture (Optional)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} className="cursor-pointer" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Attested Application *</Label>
                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "attestedApplication")} required className="cursor-pointer" />
                </div>
            </div>
        </section>

        <div className="pt-6">
            <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/20" disabled={submitting}>
                {submitting ? "Processing Application..." : "Submit Application"}
            </Button>
        </div>
      </form>
    </div>
  );
}
