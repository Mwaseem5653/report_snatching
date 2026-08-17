import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;
const APITOKEN = process.env.facekey || ""; 
const TESTING_MODE = true;

function getPlatformFromUrl(url: string) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("facebook.com")) return "Facebook";
    if (lowerUrl.includes("instagram.com")) return "Instagram";
    if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return "Twitter";
    if (lowerUrl.includes("linkedin.com")) return "LinkedIn";
    if (lowerUrl.includes("github.com")) return "GitHub";
    if (lowerUrl.includes("youtube.com")) return "YouTube";
    if (lowerUrl.includes("tiktok.com")) return "TikTok";
    if (lowerUrl.includes("pinterest.com")) return "Pinterest";
    if (lowerUrl.includes("reddit.com")) return "Reddit";
    
    try {
        const domain = new URL(url).hostname;
        return domain.replace("www.", "");
    } catch {
        return "Web";
    }
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded: any = jwt.verify(token, SECRET);
        if (!["super_admin", "admin", "officer", "ps_user", "market_user"].includes(decoded.role)) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const formData = await req.formData();
        const image = formData.get("image") as File;

        if (!image) {
            return NextResponse.json({ success: false, error: "Image is required" }, { status: 400 });
        }

        // --- FACECHECK.ID API LOGIC ---
        const site = 'https://facecheck.id';
        const headers = { 'Authorization': APITOKEN };

        // 1. Upload image
        const uploadFormData = new FormData();
        uploadFormData.append('images', image);

        const uploadRes = await fetch(`${site}/api/upload_pic`, {
            method: 'POST',
            headers,
            body: uploadFormData
        });
        const uploadData = await uploadRes.json();

        if (uploadData.error) {
            throw new Error(`${uploadData.error} (${uploadData.code})`);
        }

        const idSearch = uploadData.id_search;

        // 2. Poll for results
        const searchPayload = {
            id_search: idSearch,
            with_progress: true,
            status_only: false,
            demo: TESTING_MODE
        };

        let outputItems: any = null;

        while (true) {
            const searchRes = await fetch(`${site}/api/search`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(searchPayload)
            });
            const searchData = await searchRes.json();

            if (searchData.error) {
                throw new Error(`${searchData.error} (${searchData.code})`);
            }

            if (searchData.output) {
                outputItems = searchData.output.items;
                break;
            }

            // Wait 1 second before polling again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 3. Map results to FaceSearchResult format (Top 5 only)
        const top5Items = (outputItems || []).slice(0, 5);
        const finalResults = top5Items.map((item: any) => {
            let thumb = item.base64;
            if (thumb && !thumb.startsWith("data:")) {
                thumb = `data:image/jpeg;base64,${thumb}`;
            }
            return {
                platform: getPlatformFromUrl(item.url),
                url: item.url,
                confidence: item.score,
                thumbnail: thumb
            };
        });
        
        // Log the usage
        try {
            await logToolUsage(decoded, "Face Search", { fileName: image.name, api: true });
        } catch (e) {
            console.error("Failed to log tool usage", e);
        }

        return NextResponse.json({ success: true, results: finalResults });
    } catch (error: any) {
        console.error("Facecheck API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
