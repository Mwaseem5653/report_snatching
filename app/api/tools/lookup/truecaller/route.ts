import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const number = searchParams.get("number");

        if (!number) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        // 🚀 Token Deduction & Auth
        let currentUser: any = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("sessionToken")?.value;
            if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            currentUser = jwt.verify(token, SECRET);

            const tokenCheck = await checkAndDeductTokens(currentUser.uid, currentUser.role, 1);
            if (!tokenCheck.success) {
                return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
            }
        } catch (err) {
            return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
        }

        // Ensure number is in international format for Truecaller (+92...)
        let cleanNumber = number.trim().replace(/\D/g, ""); // Remove non-digits
        if (cleanNumber.startsWith('0')) {
            cleanNumber = cleanNumber.substring(1);
        }
        if (cleanNumber.startsWith('92')) {
            cleanNumber = cleanNumber.substring(2);
        }
        const formattedNumber = `+92${cleanNumber}`;

        // 🚀 TRUECALLER TOKEN (Extracted from tc_user cookie)
        const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA0NzMwNDk1NDIsInRva2VuIjoiYTF3MEstMC1yUG1nbFZ5VnFyOXNHa2NIbDh5aVBuR29FREdvS0dqY2xoNFY5bW84UzMtZHV4anMwOEFEU1JzUiIsImNvdW50cnlDb2RlIjoicGsiLCJuYW1lIjoiTXVoaGFtYWQgV2FzZWVtIiwiaW1hZ2UiOiJodHRwczovL2ltYWdlcy1ub25ldS50cnVlY2FsbGVyc3RhdGljLmNvbS9teXZpZXcvMi85OTY2Y2JkZTk0OWM0Mzg3ZjkzODY0YTJiNDMwZmIyMi8zIiwiaXNBcHBBY2NvdW50Ijp0cnVlLCJpYXQiOjE3Nzc3OTQ2NDl9.sfUDbrbUbqIZgs-Te0KhUx3fAKFKL7fowU5Fm0PHWMY";

        // Full Cookie String for Web Authentication
        const FULL_COOKIE = `WZRK_G=f4a9c9411ec1468b9e6e4b100cbb45e7; tc_user=%7B%22token%22%3A%22${TOKEN}%22%7D; tc_searches=%7B%22searchType%22%3A%2244%22%2C%22e3b0c44%22%3A%7B%2244%22%3A7%2C%22country%22%3A%22pk%22%7D%7D`;

        // WEB API ENDPOINT
        const API_URL = `https://www.truecaller.com/api/search?q=${encodeURIComponent(formattedNumber)}&countryCode=PK&type=4`;

        console.log(`[Truecaller] Mimicking Browser Search: ${formattedNumber}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
           const response = await fetch(API_URL, {
    method: "GET",
    signal: controller.signal,
    headers: {
        "accept": "application/json, text/plain, */*",
        "authorization": `Bearer ${TOKEN}`,
        "cookie": FULL_COOKIE,
        "referer": `https://www.truecaller.com/search/pk/${cleanNumber}`,
        "user-agent":
            "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
    },
    cache: "no-store",
});

if (!response.ok) {
    return NextResponse.json(
        { error: `Truecaller API error: ${response.status}` },
        { status: response.status }
    );
}

const data = await response.json();
const contact = data?.data?.[0];

return NextResponse.json({
    success: true,
    summary: contact
        ? {
              name: contact.name ?? "No Name Found",
              carrier: contact.phones?.[0]?.carrier ?? "Unknown Carrier",
              email: contact.internetAddresses?.[0]?.id ?? "No Email",
              address:
                  contact.addresses?.[0]?.city ||
                  contact.addresses?.[0]?.area ||
                  "Pakistan",
              image: contact.image ?? null,
          }
        : { error: "No results found for this number" },
        });
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            throw fetchErr;
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: "Connection timed out" }, { status: 504 });
        }
        console.error("Truecaller Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
