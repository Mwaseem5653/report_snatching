import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFDocument } from "pdf-lib";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;
const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY || "");

// --- Helper: Extract Fields from Plain Text ---
function extractFieldsFromText(text: string) {
    const fields: Record<string, string> = {
        "Name": "", "Phone Number": "", "Police Station": "", "Other Property": "",
        "Mobile Model": "", "Type": "", "Date Of Offence": "", "Time Of Offence": "",
        "IMEI Number": "", "last Num Used": "",
    };

    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
        line = line.trim();
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.startsWith("name:")) fields["Name"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("phone number:")) fields["Phone Number"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("police station:")) fields["Police Station"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("other property:")) fields["Other Property"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("last num used:")) fields["last Num Used"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("mobile model:")) fields["Mobile Model"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("imei number:")) {
            const val = line.split(/[:]/)[1]?.trim() || "";
            // Keep as is or extract digits if needed
            fields["IMEI Number"] = val;
        }
        else if (lowerLine.startsWith("date of offence:")) fields["Date Of Offence"] = line.split(/[:]/)[1]?.trim() || "";
        else if (lowerLine.startsWith("time of offence:")) {
            const parts = line.split(/[:]/);
            if (parts.length >= 2) fields["Time Of Offence"] = parts.slice(1).join(":").trim();
        }
        else if (lowerLine.startsWith("type:")) fields["Type"] = line.split(/[:]/)[1]?.trim() || "";
    });
    return fields;
}

/**
 * 🤖 Application Extractor API (Professional Serial Edition)
 * Handles PDF page extraction and Image processing
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string; // 'count' or 'process'
    const pageNum = parseInt(formData.get("page") as string || "1");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Action: Count Pages
    if (action === "count") {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            const buffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(buffer);
            return NextResponse.json({ success: true, pageCount: pdfDoc.getPageCount() });
        }
        return NextResponse.json({ success: true, pageCount: 1 });
    }

    // 2. Action: Process (Gemini AI)
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    let decoded: any = null;
    if (token) {
        try { decoded = jwt.verify(token, SECRET); } catch (e) {}
    }

    if (!process.env.GENAI_API_KEY) {
        return NextResponse.json({ error: "AI Service key missing" }, { status: 500 });
    }

    let mimeType = file.type;
    let finalBuffer: any;

    // 🚀 Handle PDF Page Extraction
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const fullBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fullBuffer);
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        finalBuffer = pdfBytes.buffer;
        mimeType = "application/pdf";
    } else {
        finalBuffer = await file.arrayBuffer();
        if (!mimeType || mimeType === "undefined") mimeType = "image/jpeg";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 🚀 RESTORED EXACT PYTHON PROMPT WITH ENGLISH NAME REQUIREMENT
    const prompt = `Extract ONLY the following fields from this handwritten Urdu police application image. this application is reporting of snatching /theft/lost of mobile phone and other properties. for police
Kindly answer in roman urdu (EXCEPT for the Name which MUST be in English) and dont puzzle if there is no macth simply write None. 
Output PLAIN TEXT ONLY, Follow EXACT field names and order:

only return following fields
Name: <applicant name (victam of incident) in ENGLISH >
Phone Number: <judge from context which phone number is active, or None>
IMEI Number: <all IMEIs separated by space or None>
Last Num Used: <judge from context which phone number was snatched , or None>
Mobile Model: <models name all phones or None>
Other Property: <snatched properties like cash bike wallet etc or None>
Date Of Offence: <DD.MM.YYYY or None>
Time Of Offence: <HH:MM AM/PM or None>
Type: <Snatched/Theft/Lost judge incident in which catogery lies or None>
Police Station: < Example Ps-Zamatown , Ps-Korangi , Ps-Landhi , Ps-Shahfaisal , Ps-Alflah etc ps name methin start of aplication like than zamantown >`;

    try {
        const base64Data = Buffer.from(finalBuffer).toString("base64");
        
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType } }
        ]);

        const rawText = result.response.text();
        const extractedData = extractFieldsFromText(rawText);

        // Deduct 2 tokens per record (Skip Super Admin)
        if (decoded && decoded.role !== "super_admin") {
            const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 2);
            if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        }

        return NextResponse.json({ success: true, results: [extractedData], raw: rawText });

    } catch (err: any) {
        console.error(`❌ Gemini Error:`, err.message);
        return NextResponse.json({ error: "Gemini AI failed: " + err.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Critical Extraction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
