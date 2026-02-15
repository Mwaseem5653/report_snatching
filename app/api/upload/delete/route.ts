import { NextRequest, NextResponse } from "next/server";
import { deleteFileFromStorageServer } from "@/lib/storageAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        try {
            jwt.verify(token, SECRET);
        } catch (e) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const { publicId } = await req.json(); // publicId here is the Firebase file path
        if (!publicId) {
            return NextResponse.json({ error: "File path required" }, { status: 400 });
        }

        await deleteFileFromStorageServer(publicId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
