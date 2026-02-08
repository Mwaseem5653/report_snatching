import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductEyeconTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number");
  const code = searchParams.get("code") || "92";

  if (!number) {
    return NextResponse.json({ status: false, message: "Number is required" }, { status: 400 });
  }

  // 🚀 Token Deduction
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
    const decoded: any = jwt.verify(token, SECRET);

    const tokenCheck = await checkAndDeductEyeconTokens(decoded.uid, decoded.role, 1);
    if (!tokenCheck.success) {
        return NextResponse.json({ status: false, message: tokenCheck.error }, { status: 403 });
    }
  } catch (err) {
    return NextResponse.json({ status: false, message: "Authentication failed" }, { status: 401 });
  }

  const rapidApiKey = process.env.RAPID_API_KEY;
  if (!rapidApiKey) {
    return NextResponse.json({ status: false, message: "API Configuration missing" }, { status: 500 });
  }

  const url = "https://eyecon.p.rapidapi.com/api/v1/search";

  try {
    const res = await fetch(`${url}?code=${code}&number=${number}`, {
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": "eyecon.p.rapidapi.com",
      },
    });

    const data = await res.json();

    if (!data.status && !data.fullName) {
      return NextResponse.json({ status: false, message: "No record found" });
    }

    // 🚀 Extract Enriched Data
    const names = new Set<string>();
    if (data.fullName) names.add(data.fullName);
    if (data.otherNames && Array.isArray(data.otherNames)) {
        data.otherNames.forEach((o: any) => names.add(typeof o === 'string' ? o : o.name));
    }

    const responseData = {
        status: true,
        fullName: data.fullName,
        allNames: Array.from(names),
        photo: data.photo || (data.data?.photo) || "",
        facebook: data.facebookID?.url || (data.data?.facebookID?.url) || "",
        raw: data // Keep raw for compatibility
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
