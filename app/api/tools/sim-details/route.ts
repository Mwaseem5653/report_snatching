import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { number } = await req.json();

    if (!number) {
      return NextResponse.json({ message: 'Mobile number is missing' }, { status: 400 });
    }

    const API_URL = "https://simsdatabases.com/apis/simsNumber.php";
    const APP_KEY = process.env.SIMINFO;

    if (!APP_KEY) {
      return NextResponse.json({ error: 'Server configuration error: SIMINFO_KEY missing' }, { status: 500 });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Dart/3.1 (dart:io)', // Mimics the app
        'Accept': 'application/json',
      },
      // The API expects URL encoded body
      body: new URLSearchParams({
        'number': number,
        'appkey': APP_KEY
      })
    });

    const data = await response.text();

    try {
      const jsonData = JSON.parse(data);
      return NextResponse.json(jsonData);
    } catch (e) {
      // If the API returns raw HTML/Text instead of JSON
      return new NextResponse(data, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

  } catch (error: any) {
    console.error("Error fetching sim data:", error);
    return NextResponse.json({ error: 'Failed to connect to sim database' }, { status: 500 });
  }
}
