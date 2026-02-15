import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFDocument } from "pdf-lib";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { deleteFileFromStorageServer } from "@/lib/storageAdmin"; // Import for deletion
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;


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
  let publicIdToClean: string | undefined; // To store publicId for deletion in finally block
  try {
    const formData = await req.formData();
    const cloudinaryUrl = formData.get("cloudinaryUrl") as string;
    const cloudinaryPublicId = formData.get("cloudinaryPublicId") as string;
    const action = formData.get("action") as string; // 'count' or 'process'
    const pageNum = parseInt(formData.get("page") as string || "1");

    publicIdToClean = cloudinaryPublicId; // Set publicId for cleanup in finally block

    if (!cloudinaryUrl || !cloudinaryPublicId) {
      return NextResponse.json({ error: "Cloudinary file reference missing" }, { status: 400 });
    }

    // Download the file from Cloudinary
    const cloudinaryFileRes = await fetch(cloudinaryUrl);
    if (!cloudinaryFileRes.ok) {
        throw new Error(`Failed to download file from Cloudinary: ${cloudinaryFileRes.statusText}`);
    }
    const fileBuffer = await cloudinaryFileRes.arrayBuffer();

    // Determine mimeType for further processing based on URL or original name if available
    // For now, derive from URL if possible, otherwise default
    let mimeType = cloudinaryFileRes.headers.get("Content-Type") || "application/octet-stream";
    if (cloudinaryUrl.includes(".pdf")) mimeType = "application/pdf";
    else if (cloudinaryUrl.match(/\.(jpeg|jpg)$/i)) mimeType = "image/jpeg";
    else if (cloudinaryUrl.match(/\.png$/i)) mimeType = "image/png";


    // 1. Action: Count Pages
    if (action === "count") {
        if (mimeType === "application/pdf") {
            try {
                const pdfDoc = await PDFDocument.load(fileBuffer);
                return NextResponse.json({ success: true, pageCount: pdfDoc.getPageCount() });
            } catch (pdfError: any) {
                console.error("❌ PDF Parsing Error (Count Action):", pdfError);
                return NextResponse.json({ error: "Failed to read PDF from Cloudinary. It might be too large or corrupted for page counting." }, { status: 400 });
            }
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
        console.error("❌ GENAI_API_KEY environment variable is missing.");
        return NextResponse.json({ error: "AI Service key missing. Please configure GENAI_API_KEY." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY); // Initialize here
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let finalBuffer: any;

    // 🚀 Handle PDF Page Extraction
    if (mimeType === "application/pdf") { // Use mimeType from Cloudinary fetch
        try {
            const pdfDoc = await PDFDocument.load(fileBuffer); // Use downloaded buffer
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
            newPdf.addPage(copiedPage);
            const pdfBytes = await newPdf.save();
            finalBuffer = pdfBytes.buffer;
            // mimeType remains application/pdf
        } catch (pdfError: any) {
            console.error("❌ PDF Parsing Error (Process Action):", pdfError);
            return NextResponse.json({ error: "Failed to extract page from PDF from Cloudinary. It might be too large or corrupted." }, { status: 400 });
        }
    } else {
        finalBuffer = fileBuffer; // Use the downloaded buffer directly for images
        // mimeType is already determined
    }

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
