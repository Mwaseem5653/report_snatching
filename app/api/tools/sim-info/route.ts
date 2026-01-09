import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { phone_number } = await req.json();

    if (!phone_number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const apiUrl = "https://simdataupdates.com/wp-admin/admin-ajax.php";
    const params = new URLSearchParams({
      action: "fetch_sim_data",
      term: phone_number,
    });

    const res = await fetch(`${apiUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://simdataupdates.com/",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP Error ${res.status}` }, { status: res.status });
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Empty response from website (blocked)" }, { status: 502 });
    }

    // Attempt JSON parse
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON response", preview: text.slice(0, 200) }, { status: 502 });
    }

    if (data.success && data.data && data.data.length > 0) {
      return NextResponse.json(data.data);
    } else {
      return NextResponse.json({ error: "No record found for this number." });
    }

  } catch (error: any) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
