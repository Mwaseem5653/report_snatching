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
import { CheckCircle2, PhoneForwarded } from "lucide-react";

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
    mobileModel: "",
    imei1: "",
    imei2: "",
    lastNumUsed: "", // Added
    crimeHead: "",
    otherLostProperty: "",
    dateOfOffence: "",
    timeOfOffence: "",
    addressOfOffence: "",
    boxPicture: null as File | null,
    attestedApplication: null as File | null,
  });

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
        mobileModel: formData.mobileModel,
        imei1: formData.imei1,
        imei2: formData.imei2,
        lastNumUsed: formData.lastNumUsed,
        crimeHead: formData.crimeHead,
        offenceDate: formData.dateOfOffence, // Backend POST will handle conversion
        offenceTime: formData.timeOfOffence,
        offenceAddress: formData.addressOfOffence,
        note: formData.incidentNote,
        pictureUrl: boxPicUrl,
        attachmentUrl: attestedUrl,
        otherLostProperty: formData.otherLostProperty,
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
                    <Input name="applicantName" value={formData.applicantName} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Mobile Number *</Label>
                    <Input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">CNIC Number (Optional)</Label>
                    <Input name="cnic" value={formData.cnic} onChange={handleChange} className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">City *</Label>
                    <Input name="city" value={formData.city} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                </div>
            </div>
        </section>

        {/* Device Section */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                Device & Incident Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Mobile Model *</Label>
                    <Input name="mobileModel" value={formData.mobileModel} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">IMEI 1 *</Label>
                    <Input name="imei1" value={formData.imei1} onChange={handleChange} required className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-mono" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">IMEI 2 (Optional)</Label>
                    <Input name="imei2" value={formData.imei2} onChange={handleChange} className="rounded-xl border-slate-200 h-11 bg-slate-50/50 font-mono" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Last Number Used *</Label>
                    <div className="relative">
                        <PhoneForwarded className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <Input name="lastNumUsed" value={formData.lastNumUsed} onChange={handleChange} required className="pl-10 rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Crime Category *</Label>
                    <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
                        <SelectTrigger className="rounded-xl h-11 bg-slate-50/50"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent><SelectItem value="snatched">Snatched</SelectItem><SelectItem value="theft">Theft</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Date of Offence *</Label>
                    <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="rounded-xl h-11 bg-slate-50/50" />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Incident Details *</Label>
                    <Textarea name="incidentNote" value={formData.incidentNote} onChange={handleChange} required className="rounded-2xl border-slate-200 min-h-[100px] bg-slate-50/50" />
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
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Box Picture *</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} required className="cursor-pointer" />
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