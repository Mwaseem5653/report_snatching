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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { uploadFileToStorage } from "@/lib/uploadHelper";
import { addApplication } from "@/lib/applicationApi";
import { locationData } from "@/components/location/location";
import { Loader2, CheckCircle2, UploadCloud, MapPin, Smartphone, User, FileText } from "lucide-react";

export default function AddApplicationFormNormalUser() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        boxPicUrl = await uploadFileToStorage(formData.boxPicture, "applications");
      }
      if (formData.attestedApplication) {
        attestedUrl = await uploadFileToStorage(formData.attestedApplication, "applications");
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
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-lg mx-auto mt-10 animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Submission Successful</h2>
        <p className="text-gray-500 text-center mb-8">
          Your application has been submitted successfully and assigned to the relevant officer.
          <br /><span className="text-sm text-gray-400 mt-2 block">(آپ کی درخواست کامیابی سے جمع ہو گئی ہے)</span>
        </p>
        <Button onClick={() => router.push("/")} className="w-full bg-blue-900 hover:bg-blue-800 h-12 text-lg rounded-xl">
          Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Online Complaint Form</h1>
            <p className="text-blue-100 text-lg">Mobile Snatching / Theft Reporting Portal</p>
        </div>

        <CardContent className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-10">
                
                {/* 1. Applicant Information */}
                <section>
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Applicant Information</h3>
                            <p className="text-xs text-gray-500">درخواست گزار کی معلومات</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">Applicant Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="Full Name" name="applicantName" value={formData.applicantName} onChange={handleChange} required className="rounded-xl border-gray-200 focus:ring-blue-500 bg-gray-50/50 h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">Mobile Number <span className="text-red-500">*</span></Label>
                            <Input placeholder="03XXXXXXXXX" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required className="rounded-xl border-gray-200 focus:ring-blue-500 bg-gray-50/50 h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">CNIC <span className="text-red-500">*</span></Label>
                            <Input placeholder="42101-XXXXXXX-X" name="cnic" value={formData.cnic} onChange={handleChange} required className="rounded-xl border-gray-200 focus:ring-blue-500 bg-gray-50/50 h-11" />
                        </div>
                    </div>
                </section>

                {/* 2. Location Details */}
                <section>
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Location & Jurisdiction</h3>
                            <p className="text-xs text-gray-500">مقام اور دائرہ اختیار</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">City <span className="text-red-500">*</span></Label>
                            <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, city: val, district: "", psName: "" }))}>
                            <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-11">
                                <SelectValue placeholder="Select City" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(locationData).map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">District <span className="text-red-500">*</span></Label>
                            <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, district: val, psName: "" }))} disabled={!formData.city}>
                            <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-11">
                                <SelectValue placeholder="Select District" />
                            </SelectTrigger>
                            <SelectContent>
                                {formData.city && Object.keys(locationData[formData.city].districts).map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">Police Station <span className="text-red-500">*</span></Label>
                            <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, psName: val }))} disabled={!formData.city || !formData.district}>
                            <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-11">
                                <SelectValue placeholder="Select PS" />
                            </SelectTrigger>
                            <SelectContent>
                                {formData.city && formData.district && locationData[formData.city].districts[formData.district].ps.map((ps) => (
                                <SelectItem key={ps} value={ps}>{ps}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>
                    </div>
                </section>

                {/* 3. Incident Details */}
                <section>
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Incident Details</h3>
                            <p className="text-xs text-gray-500">واقعہ کی تفصیلات</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                         <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">Date of Offence <span className="text-red-500">*</span></Label>
                            <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                         <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">Time of Offence <span className="text-red-500">*</span></Label>
                            <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                             <Label className="text-gray-700 font-semibold">Address of Offence <span className="text-red-500">*</span></Label>
                             <Input placeholder="Complete address where incident happened" name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                         <div className="md:col-span-2 space-y-2">
                            <Label className="text-gray-700 font-semibold">Incident Note <span className="text-red-500">*</span></Label>
                            <Textarea placeholder="Describe what happened..." name="incidentNote" value={formData.incidentNote} onChange={handleChange} required className="rounded-xl border-gray-200 bg-gray-50/50 min-h-[100px]" />
                        </div>
                    </div>
                </section>

                {/* 4. Device Information */}
                <section>
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Device Information</h3>
                            <p className="text-xs text-gray-500">موبائل کی تفصیلات</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold">Crime Type <span className="text-red-500">*</span></Label>
                            <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
                            <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-11">
                                <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="snatched">Snatched (چھینا گیا)</SelectItem>
                                <SelectItem value="theft">Theft (چوری)</SelectItem>
                                <SelectItem value="lost">Lost (گمشدہ)</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label className="text-gray-700 font-semibold">Mobile Model <span className="text-red-500">*</span></Label>
                             <Input placeholder="e.g. iPhone 13, Samsung S24" name="mobileModel" value={formData.mobileModel} onChange={handleChange} required className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                         <div className="space-y-2">
                             <Label className="text-gray-700 font-semibold">IMEI 1 <span className="text-red-500">*</span></Label>
                             <Input placeholder="15 digit IMEI" name="imei1" value={formData.imei1} onChange={handleChange} required className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                         <div className="space-y-2">
                             <Label className="text-gray-700 font-semibold">IMEI 2 (Optional)</Label>
                             <Input placeholder="15 digit IMEI" name="imei2" value={formData.imei2} onChange={handleChange} className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                         <div className="md:col-span-2 space-y-2">
                             <Label className="text-gray-700 font-semibold">Other Lost Property (Optional)</Label>
                             <Input placeholder="Wallet, Cash, etc." name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} className="rounded-xl border-gray-200 bg-gray-50/50 h-11" />
                        </div>
                    </div>
                </section>

                {/* 5. Documents */}
                <section>
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                            <UploadCloud size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Evidence & Attachments</h3>
                            <p className="text-xs text-gray-500">دستاویزات اور ثبوت</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-blue-50/50 transition-colors text-center cursor-pointer relative">
                             <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                             <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-white rounded-full shadow-sm">
                                    <Smartphone className="h-6 w-6 text-blue-600" />
                                </div>
                                <span className="font-semibold text-gray-700">Upload Box Picture</span>
                                <span className="text-xs text-gray-500">IMEI must be visible clearly</span>
                                {formData.boxPicture && <span className="text-sm text-green-600 font-medium mt-2">Selected: {formData.boxPicture.name}</span>}
                             </div>
                        </div>

                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-blue-50/50 transition-colors text-center cursor-pointer relative">
                             <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "attestedApplication")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                             <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-white rounded-full shadow-sm">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <span className="font-semibold text-gray-700">Upload Attested Application</span>
                                <span className="text-xs text-gray-500">Signed from Police Station</span>
                                {formData.attestedApplication && <span className="text-sm text-green-600 font-medium mt-2">Selected: {formData.attestedApplication.name}</span>}
                             </div>
                        </div>
                    </div>
                </section>

                <div className="pt-6">
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white h-14 text-lg rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.01]" disabled={submitting}>
                        {submitting ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Application...</>
                        ) : (
                            "Submit Application / درخواست جمع کروائیں"
                        )}
                    </Button>
                    <p className="text-center text-xs text-gray-400 mt-4">
                        By submitting, you certify that the information provided is true and accurate.
                    </p>
                </div>

            </form>
        </CardContent>
      </Card>
    </div>
  );
}