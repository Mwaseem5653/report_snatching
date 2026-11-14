import { NextRequest, NextResponse } from "next/server";
import { runDingLookup } from "@/lib/dingLookup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountNumber = searchParams.get("accountNumber");

  if (!accountNumber) {
    return NextResponse.json({ error: "accountNumber is required" }, { status: 400 });
  }

  try {
    const results = await runDingLookup([accountNumber]);
    const operator = results[0]?.operator || "Not Found";
    return NextResponse.json({
      ResultCode: 0,
      Items: [{ Name: operator }],
    });
  } catch (error: any) {
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 });
  }
}
