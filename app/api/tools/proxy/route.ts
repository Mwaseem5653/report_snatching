import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountNumber = searchParams.get("accountNumber");

  if (!accountNumber) {
    return NextResponse.json({ error: "accountNumber is required" }, { status: 400 });
  }

  const apiUrl = "https://easyload.com.pk/dingconnect.php";
  
  try {
    const res = await fetch(`${apiUrl}?action=GetProviders&accountNumber=${accountNumber}`);
    
    if (!res.ok) {
        return NextResponse.json({ error: `HTTP error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 });
  }
}
