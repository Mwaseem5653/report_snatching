import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number");
  const code = searchParams.get("code") || "92";

  if (!number) {
    return NextResponse.json({ status: false, message: "Number is required" }, { status: 400 });
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

    if (!data.status) {
      return NextResponse.json({ status: false, message: "No record found" });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
