import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductEyeconTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

// --- Helper: Fetch Eyecon Info ---
async function fetchEyeconInfo(number: string, code = "92") {
    const rapidApiKey = process.env.RAPID_API_KEY;
    if (!rapidApiKey) {
        return null;
    }
    
    const cleanNumber = number.replace(/^0+/, "");
    const fullUrl = `https://eyecon.p.rapidapi.com/api/v1/search?code=${code}&number=${cleanNumber}`;

    try {
        const res = await fetch(fullUrl, {
            method: 'GET',
            headers: { 
                "x-rapidapi-key": rapidApiKey, 
                "x-rapidapi-host": "eyecon3.p.rapidapi.com",
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });
        
        if (!res.ok) {
            return null;
        }
        const data = await res.json();

        const names = new Set<string>();
        let facebook = "";
        let photo = "";

        const processItem = (item: any) => {
            if (!item) return;
            if (item.fullName) names.add(item.fullName);
            if (item.name) names.add(item.name);
            if (item.displayName) names.add(item.displayName);

            if (Array.isArray(item.otherNames)) {
                item.otherNames.forEach((o: any) => {
                    const n = typeof o === 'string' ? o : (o.name || o.fullName || o);
                    if (n && typeof n === 'string') names.add(n);
                });
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

        const getImagesUrl = (d: any) => {
            if (d && Array.isArray(d.images)) {
                for (const imgEntry of d.images) {
                    if (imgEntry && imgEntry.pictures && typeof imgEntry.pictures === 'object') {
                        const pics = imgEntry.pictures;
                        return pics["200"] || pics["600"] || Object.values(pics)[0] || "";
                    }
                }
            }
            return "";
        };

        let image_url = photo;
        if (!image_url || !String(image_url).startsWith("http")) {
            image_url = getImagesUrl(data) || getImagesUrl(data.data) || image_url;
        }

        if (!image_url || !String(image_url).startsWith("http")) {
            const rawB64 = data.b64 || (data.data && data.data.b64);
            if (rawB64) {
                image_url = String(rawB64).startsWith("data:image") ? rawB64 : `data:image/jpeg;base64,${rawB64}`;
            }
        }

        return {
            number: number,
            name: Array.from(names).join(" | ") || "N/A",
            image: image_url || "",
            facebook: facebook || ""
        };
    } catch (e) { return null; }
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const { numbers } = await req.json();
        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return NextResponse.json({ error: "No numbers provided" }, { status: 400 });
        }

        // 🚀 Deduct Eyecon Tokens
        const tokenCheck = await checkAndDeductEyeconTokens(decoded.uid, decoded.role, numbers.length);
        if (!tokenCheck.success) return NextResponse.json({ error: tokenCheck.error, currentBalance: tokenCheck.currentBalance }, { status: 403 });

        const results = [];
        // Process in small batches to avoid timeouts and rate limits
        const batchSize = 5;
        for (let i = 0; i < numbers.length; i += batchSize) {
            const batch = numbers.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(num => fetchEyeconInfo(num)));
            results.push(...batchResults.filter(r => r !== null));
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
