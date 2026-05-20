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
        if (!NADRA_KEY) return null;

        try {
            const res = await fetch(`https://api.nadra.xyz/sim_api.php?search_term=${fullNum}&api_key=${NADRA_KEY}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    };

    // --- NADRA API (NOW PRIMARY) ---
    const nadraData = await fetchFromNadra(number);
    if (nadraData && nadraData.status === "success" && Array.isArray(nadraData.data) && nadraData.data.length > 0) {
        return NextResponse.json(nadraData.data[0]);
    }
    
    // Check if Nadra returned an error or empty result before trying fallback
    let fallbackNeeded = !nadraData || nadraData.error || (typeof nadraData === 'object' && Object.keys(nadraData).length === 0);

    if (fallbackNeeded) {
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
        try {
          const jsonData = JSON.parse(data);
          return NextResponse.json(jsonData);
        } catch (e) {
          return new NextResponse(data, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
    }

    // Default return if Nadra structure was non-standard but had data
    return NextResponse.json(nadraData);

  } catch (error: any) {
    console.error("Error fetching sim data:", error);
    return NextResponse.json({ error: 'Failed to connect to sim database' }, { status: 500 });
  }
}
