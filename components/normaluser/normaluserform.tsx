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
import { uploadFileToStorage } from "@/app/api/uploadhelper/helper";
import { addApplication } from "@/app/api/update-application/route";
import { locationData } from "@/components/location/location";

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
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 border rounded-lg shadow-md bg-white mt-10">
        <h2 className="text-xl font-semibold text-green-600">
          ✅ Your application has been submitted successfully
        </h2>
        <p className="text-gray-600">
          Your case has been assigned to the concerned officer.
        </p>
        <Button onClick={() => router.push("/")}>Okay</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(circle_at_center,_#f4f4f4_1px,_transparent_1px)] bg-[length:20px_20px] py-10">
      {/* Header */}
      <div className="bg-blue-900 text-white py-4 shadow-md mb-8 flex items-center justify-center gap-4">
        <img src="/logo.png" alt="Sindh Police Logo" className="w-14 h-14" />
        <h1 className="text-2xl md:text-3xl font-bold text-center">
          Online Complaint Form
        </h1>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-7xl mx-auto bg-white p-8 shadow-lg rounded-xl border space-y-6"
      >
        <h2 className="text-xl font-bold mb-4 text-center text-gray-700">
          Applicant Information / درخواست گزار کی معلومات
        </h2>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Applicant Name / درخواست گزار کا نام</Label>
            <Input name="applicantName" value={formData.applicantName} onChange={handleChange} required />
          </div>
          <div>
            <Label>Mobile Number / موبائل نمبر</Label>
            <Input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required />
          </div>
          <div>
            <Label>CNIC / شناختی کارڈ نمبر</Label>
            <Input name="cnic" value={formData.cnic} onChange={handleChange} required />
          </div>
          <div>
            <Label>City / شہر</Label>
            <Select
              onValueChange={(val) => setFormData((prev) => ({ ...prev, city: val, district: "", psName: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select City / شہر منتخب کریں" />
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

          <div>
            <Label>District / ضلع</Label>
            <Select
              onValueChange={(val) => setFormData((prev) => ({ ...prev, district: val, psName: "" }))}
              disabled={!formData.city}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select District / ضلع منتخب کریں" />
              </SelectTrigger>
              <SelectContent>
                {formData.city &&
                  Object.keys(locationData[formData.city].districts).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Police Station / تھانہ</Label>
            <Select
              onValueChange={(val) => setFormData((prev) => ({ ...prev, psName: val }))}
              disabled={!formData.city || !formData.district}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PS / تھانہ منتخب کریں" />
              </SelectTrigger>
              <SelectContent>
                {formData.city &&
                  formData.district &&
                  locationData[formData.city].districts[formData.district].ps.map((ps) => (
                    <SelectItem key={ps} value={ps}>
                      {ps}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Incident Note / واقعہ کی تفصیل</Label>
            <Textarea name="incidentNote" value={formData.incidentNote} onChange={handleChange} required />
          </div>

          <div>
            <Label>Mobile Model / موبائل ماڈل</Label>
            <Input name="mobileModel" value={formData.mobileModel} onChange={handleChange} required />
          </div>

          <div>
            <Label>IMEI 1 / آئی ایم ای آئی 1</Label>
            <Input name="imei1" value={formData.imei1} onChange={handleChange} required />
          </div>

          <div>
            <Label>IMEI 2 (Optional) / آئی ایم ای آئی 2</Label>
            <Input name="imei2" value={formData.imei2} onChange={handleChange} />
          </div>

          <div>
            <Label>Crime Head / جرم کی نوعیت</Label>
            <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))} required>
              <SelectTrigger>
                <SelectValue placeholder="Select Crime Type / جرم منتخب کریں" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snatched">Snatched</SelectItem>
                <SelectItem value="theft">Theft</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Other Lost Property / دیگر گمشدہ اشیاء</Label>
            <Input name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} />
          </div>

          <div>
            <Label>Date of Offence / تاریخِ واقعہ</Label>
            <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required />
          </div>

          <div>
            <Label>Time of Offence / وقتِ واقعہ</Label>
            <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required />
          </div>

          <div className="md:col-span-2">
            <Label>Address of Offence / واقعہ کا پتہ</Label>
            <Input name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required />
          </div>

          <div>
            <Label>Box Picture (IMEIs must be visible) / موبائل باکس کی تصویر</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} required />
          </div>

          <div>
            <Label>Attested Application (From PS) / تصدیق شدہ درخواست</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange(e, "attestedApplication")}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full text-lg py-3" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Application / درخواست جمع کریں"}
        </Button>
      </form>
    </div>
  );
}
