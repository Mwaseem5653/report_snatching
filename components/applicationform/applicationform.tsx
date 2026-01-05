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
      // Upload files
      let boxPicUrl = "";
      let attestedUrl = "";

      if (formData.boxPicture) {
        boxPicUrl = await uploadFileToStorage(formData.boxPicture, "applications");
      }
      if (formData.attestedApplication) {
        attestedUrl = await uploadFileToStorage(formData.attestedApplication, "applications");
      }

      // Prepare payload
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

  // Success screen (bilingual)
  if (submitted) {
    return (
      <div className="w-4/5 mx-auto mt-8 bg-white rounded-xl shadow-md p-8 text-center animate-[opacity_300ms_ease_in]">
        <h2 className="text-2xl font-semibold text-green-600">✅ Thanks for reporting your application</h2>
        <p className="text-gray-700 mt-2">آپ کی درخواست درج کر لی گئی ہے، شکریہ</p>
        <div className="mt-6">
          <Button
            onClick={() => {
              if (!currentUser || currentUser?.role === "user") {
                router.push("/");
              } else {
                router.refresh(); // stay on same page for staff
              }
            }}
          >
            Okay / ٹھیک ہے
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-10 animate-[opacity_300ms_ease_in] bg-[radial-gradient(circle_at_top_left,_#f8f8f8_1px,_transparent_1px)] [background-size:20px_20px]"
    >
      {/* Header */}
      <div className="w-4/5 mx-auto mb-8 flex items-center gap-4">
        <img src="/logo.png" alt="Sindh Police" className="w-16 h-16 rounded-full border" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
            Mobile Theft Reporting Form
          </h1>
          {/* <p className="text-gray-600">موبائل چوری رپورٹ فارم</p> */}
        </div>
      </div>

      {/* Form card (80% width centered) */}
      <form
        onSubmit={handleSubmit}
        className="w-4/5 mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10 transition-transform duration-200 hover:shadow-2xl"
      >
        {/* Applicant Info */}
        <h2 className="text-lg font-semibold text-blue-800 mb-4">Applicant Information / درخواست دہندہ کی معلومات</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>
              Applicant Name
              <span className="block text-xs text-gray-500 mt-1">(درخواست دہندہ کا نام)</span>
            </Label>
            <Input
              name="applicantName"
              value={formData.applicantName}
              onChange={handleChange}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label>
              Mobile Number
              <span className="block text-xs text-gray-500 mt-1">(موبائل نمبر)</span>
            </Label>
            <Input
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label>
              CNIC {currentUser ? "(Optional)" : "(Required)"}
              <span className="block text-xs text-gray-500 mt-1">(شناختی کارڈ نمبر)</span>
            </Label>
            <Input
              name="cnic"
              value={formData.cnic}
              onChange={handleChange}
              required={!currentUser}
              className="mt-2"
            />
          </div>

          <div>
            <Label>
              City
              <span className="block text-xs text-gray-500 mt-1">(شہر)</span>
            </Label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!!currentUser}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label>
              District
              <span className="block text-xs text-gray-500 mt-1">(ضلع)</span>
            </Label>
            {currentUser?.district ? (
              <Input name="district" value={formData.district} disabled required className="mt-2" />
            ) : (
              <Select
                onValueChange={(val) => setFormData((prev) => ({ ...prev, district: val, psName: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select District / ضلع منتخب کریں" />
                </SelectTrigger>
                <SelectContent>
                  {formData.city &&
                    Object.keys(locationData[formData.city]?.districts || {}).map((dist) => (
                      <SelectItem key={dist} value={dist}>
                        {dist}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>
              PS Name
              <span className="block text-xs text-gray-500 mt-1">(تھانہ)</span>
            </Label>
            {currentUser?.ps ? (
              <Input name="psName" value={formData.psName} disabled required className="mt-2" />
            ) : (
              <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, psName: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Police Station / تھانہ منتخب کریں" />
                </SelectTrigger>
                <SelectContent>
                  {formData.district &&
                    (locationData[formData.city]?.districts?.[formData.district]?.ps || []).map((ps: string) => (
                      <SelectItem key={ps} value={ps}>
                        {ps}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Incident Info */}
        <h2 className="text-lg font-semibold text-blue-800 mt-8 mb-3">Incident Details / واقعہ کی تفصیلات</h2>

        <div>
          <Label>
            Incident Note
            <span className="block text-xs text-gray-500 mt-1">(واقعہ کا مختصر بیان)</span>
          </Label>
          <Textarea
            name="incidentNote"
            value={formData.incidentNote}
            onChange={handleChange}
            required
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <Label>
              Mobile Model
              <span className="block text-xs text-gray-500 mt-1">(موبائل ماڈل)</span>
            </Label>
            <Input name="mobileModel" value={formData.mobileModel} onChange={handleChange} required className="mt-2" />
          </div>

          <div>
            <Label>
              IMEI 1
              <span className="block text-xs text-gray-500 mt-1">(IMEI نمبر 1)</span>
            </Label>
            <Input name="imei1" value={formData.imei1} onChange={handleChange} required className="mt-2" />
          </div>

          <div>
            <Label>
              IMEI 2 (Optional)
              <span className="block text-xs text-gray-500 mt-1">(IMEI نمبر 2)</span>
            </Label>
            <Input name="imei2" value={formData.imei2} onChange={handleChange} className="mt-2" />
          </div>

          <div>
            <Label>
              Crime Head
              <span className="block text-xs text-gray-500 mt-1">(جرم کی نوعیت)</span>
            </Label>
            <Select onValueChange={(val) => setFormData((prev) => ({ ...prev, crimeHead: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Crime Type / نوعیت منتخب کریں" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snatched">Snatched / چھینا گیا</SelectItem>
                <SelectItem value="theft">Theft / چوری</SelectItem>
                <SelectItem value="lost">Lost / گمشدہ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <Label>
            Other Lost Property
            <span className="block text-xs text-gray-500 mt-1">(دیگر کھوئی ہوئی اشیاء)</span>
          </Label>
          <Input name="otherLostProperty" value={formData.otherLostProperty} onChange={handleChange} className="mt-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <Label>
              Date of Offence
              <span className="block text-xs text-gray-500 mt-1">(واقعہ کی تاریخ)</span>
            </Label>
            <Input type="date" name="dateOfOffence" value={formData.dateOfOffence} onChange={handleChange} required className="mt-2" />
          </div>

          <div>
            <Label>
              Time of Offence
              <span className="block text-xs text-gray-500 mt-1">(واقعہ کا وقت)</span>
            </Label>
            <Input type="time" name="timeOfOffence" value={formData.timeOfOffence} onChange={handleChange} required className="mt-2" />
          </div>
        </div>

        <div className="mt-6">
          <Label>
            Address of Offence
            <span className="block text-xs text-gray-500 mt-1">(واقعہ کا پتہ)</span>
          </Label>
          <Input name="addressOfOffence" value={formData.addressOfOffence} onChange={handleChange} required className="mt-2" />
        </div>

        {/* File Uploads */}
        <h2 className="text-lg font-semibold text-blue-800 mt-8 mb-3">Attachments / منسلکات</h2>

        <div className="mt-2">
          <Label>
            Box Picture (IMEIs must be visible)
            <span className="block text-xs text-gray-500 mt-1">(ڈبے کی تصویر - IMEI نمبر واضح ہوں)</span>
          </Label>
          <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "boxPicture")} required className="mt-2" />
        </div>

        <div className="mt-4 mb-6">
          <Label>
            Attested Application (From PS)
            <span className="block text-xs text-gray-500 mt-1">(تصدیق شدہ درخواست)</span>
          </Label>
          <Input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "attestedApplication")} required className="mt-2" />
        </div>

        <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 transition-all duration-200" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit / جمع کروائیں"}
        </Button>
      </form>
    </div>
  );
}
