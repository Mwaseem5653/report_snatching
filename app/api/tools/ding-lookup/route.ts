import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { execFile } from "child_process";
import path from "path";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

type LookupResult = { number: string; operator: string };

function runDingLookup(numbers: string[]): Promise<LookupResult[]> {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(process.cwd(), "lib", "ding_lookup_worker.py");

    execFile(
      pythonCmd,
      [scriptPath, JSON.stringify(numbers)],
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Ding lookup worker error:", error, stderr);
          // Fallback response with API Error for all numbers
          return resolve(numbers.map((n) => ({ number: n, operator: "API Error" })));
        }

        try {
          const results = JSON.parse(stdout.trim());
          if (Array.isArray(results)) {
            return resolve(results);
          }
          return resolve(numbers.map((n) => ({ number: n, operator: "API Error" })));
        } catch (parseErr) {
          console.error("Ding lookup JSON parse error:", parseErr, stdout);
          return resolve(numbers.map((n) => ({ number: n, operator: "API Error" })));
        }
      }
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const { numbers } = await req.json();

    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json({ error: "Invalid numbers provided" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = jwt.verify(token, SECRET);

    // 10 tokens per number for live API identification
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 10);
    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results = await runDingLookup(numbers);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Ding Lookup Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
