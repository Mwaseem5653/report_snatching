import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductEyeconTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

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

    // 🚀 LOG USAGE
    await logToolUsage(decoded, "Eyecon/Info Lookup", { number });

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
  const cleanNumber = number.replace(/^0+/, "");

  console.log(`[Eyecon-Lookup] Requesting: code=${code}, number=${cleanNumber}`);

  try {
    const res = await fetch(`${url}?code=${code}&number=${cleanNumber}`, {
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": "eyecon.p.rapidapi.com",
      },
    });

    if (!res.ok) {
        console.error(`[Eyecon-Lookup] API Error: ${res.status} ${res.statusText}`);
        return NextResponse.json({ status: false, message: `API Error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    console.log(`[Eyecon-Lookup] Raw Response: ${JSON.stringify(data).substring(0, 500)}`);

    // 🚀 Robust extraction logic
    const names = new Set<string>();
    let photo = "";
    let facebook = "";

    const processItem = (item: any) => {
        if (!item) return;
        const n = item.fullName || item.name;
        if (n) names.add(n);
        if (item.otherNames && Array.isArray(item.otherNames)) {
            item.otherNames.forEach((o: any) => names.add(typeof o === 'string' ? o : o.name));
        }
        if (!photo && item.photo) photo = item.photo;
        if (!facebook && item.facebookID?.url) facebook = item.facebookID.url;
    };

    if (Array.isArray(data)) {
        data.forEach(processItem);
    } else {
        processItem(data);
        if (data.data) {
            if (Array.isArray(data.data)) data.data.forEach(processItem);
            else processItem(data.data);
        }
    }

    if (names.size === 0) {
      return NextResponse.json({ status: false, message: "No record found", raw: data });
    }

    const responseData = {
        status: true,
        fullName: Array.from(names).join(" | "),
        allNames: Array.from(names),
        photo: photo || (data.photo) || "",
        facebook: facebook || (data.facebookID?.url) || "",
        raw: data
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
