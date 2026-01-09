import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;
const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY || "");

// --- Extraction Helper ---
function extractFieldsFromText(text: string) {
    const fields: Record<string, string> = {
        "Name": "", "Phone Number": "", "Police Station": "", "Other Property": "",
        "Mobile Model": "", "Type": "", "Date Of Offence": "", "Time Of Offence": "",
        "IMEI Number": "", "last Num Used": "",
    };

    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
        line = line.trim();
        if (/name[:：]/i.test(line)) fields["Name"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/Police Station[:：]/i.test(line)) fields["Police Station"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/Other Property[:：]/i.test(line)) fields["Other Property"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/last Num Used[:：]/i.test(line)) fields["last Num Used"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/mobile model[:：]/i.test(line)) fields["Mobile Model"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/imei number[:：]/i.test(line)) {
            const imeis = line.match(/\b\d{14,17}\b/g);
            if (imeis) fields["IMEI Number"] = imeis.join(" ");
        }
        else if (/(phone|contact) number[:：]/i.test(line)) fields["Phone Number"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/Date Of Offence[:：]/i.test(line)) fields["Date Of Offence"] = line.split(/[:：]/)[1]?.trim() || "";
        else if (/Time Of Offence[:：]/i.test(line)) {
            const parts = line.split(/[:：]/);
            if (parts.length >= 2) fields["Time Of Offence"] = parts.slice(1).join(":").trim();
        }
        else if (/type[:：]/i.test(line)) fields["Type"] = line.split(/[:：]/)[1]?.trim() || "";
    });
    return fields;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    
    if (token) {
        try {
            const decoded: any = jwt.verify(token, SECRET);
            const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, files.length * 2);
            if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        } catch (e) {
            console.warn("⚠️ Invalid token in extraction.");
        }
    }

    if (!process.env.GENAI_API_KEY) {
        return NextResponse.json({ error: "AI Service not configured" }, { status: 500 });
    }

    // 🤖 Using Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert document analyzer for Sindh Police. 
FIRST: Analyze if the uploaded image is a valid handwritten or printed Urdu/Roman Urdu police application for mobile snatching, theft, or loss. 
IF IT IS NOT A VALID POLICE APPLICATION: Return ONLY the text: "ERROR: INVALID_DOCUMENT"

IF IT IS VALID: Extract ONLY the following fields in roman urdu. If a field is missing, write None.
Output PLAIN TEXT ONLY in the following format:

Name: <applicant name exclude father's name>
Phone Number: <contact number>
IMEI Number: <all IMEIs separated by space>
last Num Used: <snatched sim number>
Mobile Model: <brand and model>
Other Property: <cash, bike etc>
Date Of Offence: <DD.MM.YYYY>
Time Of Offence: <HH:MM AM/PM>
Type: <Snatched/Theft/Lost>
Police Station: <PS Name>`;

    const promises = files.map(async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const base64Data = Buffer.from(buffer).toString("base64");
            
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Data, mimeType: file.type || "image/jpeg" } }
            ]);

            const rawText = result.response.text();
            console.log(`🔍 AI Response [${file.name}]:`, rawText);

            if (rawText.includes("INVALID_DOCUMENT")) return { FileName: file.name, error: "INVALID_DOCUMENT" };

            return { FileName: file.name, ...extractFieldsFromText(rawText) };
        } catch (err: any) {
            console.error(`❌ AI Processing Error [${file.name}]:`, err.message);
            return { FileName: file.name, error: "SERVICE_UNAVAILABLE" };
        }
    });

    const results = await Promise.all(promises);
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("Critical Extraction Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
