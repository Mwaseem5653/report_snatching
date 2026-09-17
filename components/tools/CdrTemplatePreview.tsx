"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Mail, Check, Calendar, Hash, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CdrGeneratedResult, CdrTemplateConfig } from "@/lib/cdr-templates";
import { 
  generateFilledPerformaDocx, 
  downloadDocxBlob, 
  shareOrAttachPerformaDocx, 
  formatDateDDMMYYYY 
} from "@/lib/docx-performa";

interface CdrTemplatePreviewProps {
  template: CdrTemplateConfig;
  result: CdrGeneratedResult;
  index: number;
}

export default function CdrTemplatePreview({ template, result, index }: CdrTemplatePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [activeTab, setActiveTab] = useState<"rendered" | "text" | "html">("rendered");

  const handleCopy = () => {
    if (!result.text && !result.html) {
      toast.error("Template output is empty.");
      return;
    }

    navigator.clipboard.writeText(result.text);
    setCopied(true);
    toast.success("CDR format copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    const nums = result.items && result.items.length > 0 ? result.items : [];
    if (nums.length === 0) {
      toast.error("No numbers found to populate performa.");
      return;
    }

    try {
      setGeneratingDocx(true);
      const docxBlob = await generateFilledPerformaDocx(nums, {
        referenceDate: new Date(),
        periodDays: 180,
      });
      const fileName = `Technical_Assistance_Performa_${formatDateDDMMYYYY(new Date())}.docx`;
      downloadDocxBlob(docxBlob, fileName);
      toast.success("Performa (.docx) downloaded with current date & numbers!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate DOCX performa");
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handleEmail = async () => {
    if (!result.text) {
      toast.error("Template output is empty.");
      return;
    }

    const isWeb = typeof window !== "undefined" && !window.location.protocol.includes("capacitor");
    let mailWindow: Window | null = null;
    if (isWeb) {
      mailWindow = window.open("", "_blank");
    }

    const nums = result.items && result.items.length > 0 ? result.items : [];
    const fileName = `Technical_Assistance_Performa_${formatDateDDMMYYYY(new Date())}.docx`;
    const emailSubject = `${template.name} - TECHNICAL ASSISTANCE REQUEST`;
    const recipientEmail = "diclandhi1@gmail.com";

    try {
      setGeneratingDocx(true);
      const docxBlob = await generateFilledPerformaDocx(nums, {
        referenceDate: new Date(),
        periodDays: 180,
      });

      // Auto-copy Rich HTML table to clipboard for perfect Ctrl+V paste
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          if (result.html && typeof ClipboardItem !== "undefined") {
            const textBlob = new Blob([result.text], { type: "text/plain" });
            const htmlBlob = new Blob([result.html], { type: "text/html" });
            await navigator.clipboard.write([
              new ClipboardItem({
                "text/html": htmlBlob,
                "text/plain": textBlob,
              }),
            ]);
          } else {
            await navigator.clipboard.writeText(result.text);
          }
        } catch {
          try { await navigator.clipboard.writeText(result.text); } catch {}
        }
      }

      downloadDocxBlob(docxBlob, fileName);

      if (isWeb) {
        const encSubject = encodeURIComponent(emailSubject);
        const encBody = encodeURIComponent(result.text.substring(0, 1800));
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(recipientEmail)}&su=${encSubject}&body=${encBody}`;

        if (mailWindow && !mailWindow.closed) {
          mailWindow.location.href = gmailUrl;
        } else {
          window.location.href = `mailto:${recipientEmail}?subject=${encSubject}&body=${encBody}`;
        }
        toast.success("Performa download ho gaya aur Gmail khul gaya hai!", { duration: 7000 });
      } else {
        await shareOrAttachPerformaDocx(
          docxBlob,
          fileName,
          emailSubject,
          result.text
        );
        toast.success("Performa document ready!");
      }
    } catch (err: any) {
      if (mailWindow && !mailWindow.closed) mailWindow.close();
      console.error(err);
      toast.error("Could not generate docx: " + (err?.message || ""));
    } finally {
      setGeneratingDocx(false);
    }
  };

  return (
    <div className="flex flex-col w-[900px] min-h-[550px] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.06)] rounded-2xl border border-slate-200 overflow-hidden shrink-0 transition-all">
      {/* Header Bar */}
      <div className="h-14 bg-slate-50 border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-black uppercase text-slate-800 tracking-wider">
              {template.name}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              <Hash size={11} />
              {result.totalCount} {template.type === "imei" ? "IMEIs" : "Numbers"}
            </span>
            {result.durationText && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                <Calendar size={11} />
                {result.durationText}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex bg-slate-200/50 p-0.5 rounded-xl text-[10px] font-black uppercase">
            <button
              onClick={() => setActiveTab("rendered")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === "rendered" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Document
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Plain Text
            </button>
            <button
              onClick={() => setActiveTab("html")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === "html" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              HTML
            </button>
          </div>

          {/* Copy Button */}
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all gap-1.5 px-3 bg-white"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-500" />}
            {copied ? "Copied" : "Copy Content"}
          </Button>

          {/* Word (.docx) Button */}
          <Button
            onClick={handleDownloadDocx}
            disabled={generatingDocx}
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-[10px] font-black uppercase border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all gap-1.5 px-3"
            title="Download filled Word Performa (.docx) with current date"
          >
            {generatingDocx ? (
              <Loader2 size={12} className="animate-spin text-blue-600" />
            ) : (
              <FileDown size={12} className="text-blue-600" />
            )}
            Word (.docx)
          </Button>

          {/* Email Button */}
          <Button
            onClick={handleEmail}
            disabled={generatingDocx}
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all gap-1.5 px-3 bg-white"
          >
            {generatingDocx ? (
              <Loader2 size={12} className="animate-spin text-indigo-600" />
            ) : (
              <Mail size={12} className="text-slate-500 hover:text-indigo-600" />
            )}
            Send Email
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 bg-white font-mono text-[13px] leading-relaxed text-slate-800 select-text overflow-auto custom-scrollbar">
        {activeTab === "rendered" && (
          <div
            className="prose max-w-none text-slate-900 font-mono tracking-tight"
            dangerouslySetInnerHTML={{ __html: result.html }}
          />
        )}

        {activeTab === "text" && (
          <pre className="whitespace-pre-wrap font-mono text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {result.text}
          </pre>
        )}

        {activeTab === "html" && (
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600 bg-slate-900 text-emerald-400 p-4 rounded-xl border border-slate-800">
            {result.html}
          </pre>
        )}
      </div>
    </div>
  );
}
