import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { number } = await req.json();

    if (!number) {
      return NextResponse.json({ message: 'Mobile number is missing' }, { status: 400 });
    }

    // 🚀 CLEAN NUMBER: Remove leading '0' or '92'
    let cleanNumber = number.replace(/\D/g, ""); // Remove non-digits
    if (cleanNumber.startsWith("92")) {
        cleanNumber = cleanNumber.substring(2);
    } else if (cleanNumber.startsWith("0")) {
        cleanNumber = cleanNumber.substring(1);
    }

    // 🚀 USE WORKING ENDPOINT
    const API_URL = "https://simsdatabases.com/apis/number_check.php";
    const APP_KEY = process.env.SIMINFO;

    if (!APP_KEY) {
      return NextResponse.json({ error: 'Server configuration error: SIMINFO_KEY missing' }, { status: 500 });
    }

    const fetchFromNadra = async (num: string) => {
        const fullNum = num.startsWith('0') ? num : '0' + num;
        const NADRA_KEY = process.env.NADRA_API_KEY;
        
        console.log(`[Nadra-Lookup] Searching for: ${fullNum}`);
        if (!NADRA_KEY) {
            console.error("[Nadra-Lookup] ERROR: NADRA_API_KEY is missing in environment variables.");
            return null;
        }

        try {
            const url = `https://api.nadra.xyz/sim_api.php?search_term=${fullNum}&api_key=${NADRA_KEY}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                console.error(`[Nadra-Lookup] API Error: ${res.status} ${res.statusText}`);
                return null;
            }

            const text = await res.text();
            console.log(`[Nadra-Lookup] Raw Response: ${text.substring(0, 200)}`);
            
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("[Nadra-Lookup] JSON Parse Error");
                return null;
            }
        } catch (e: any) {
            console.error(`[Nadra-Lookup] Fetch Exception: ${e.message}`);
            return null;
        }
    };

    // --- PRIMARY API (simsdatabases.com) ---
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Dart/3.1 (dart:io)', 
        'Accept': 'application/json',
      },
    
      body: new URLSearchParams({
        'number': cleanNumber,
        'appkey': APP_KEY
      })
    });

    const data = await response.text();
    let jsonData: any = null;
    try {
        jsonData = JSON.parse(data);
    } catch (e) {}

    // Check if primary returned data
    if (jsonData && !jsonData.error && Object.keys(jsonData).length > 0) {
        return NextResponse.json(jsonData);
    }

    // --- NADRA FALLBACK ---
    console.log(`[Sim-Details] Primary failed, trying Nadra for ${number}`);
    const nadraData = await fetchFromNadra(number);
    if (nadraData && nadraData.status === "success" && Array.isArray(nadraData.data) && nadraData.data.length > 0) {
        return NextResponse.json(nadraData.data[0]);
    }

    if (jsonData) {
        return NextResponse.json(jsonData);
    } else {
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
