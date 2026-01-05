import { NextResponse } from "next/server";
import { db } from "@/firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get("query")?.toLowerCase() || "";
    const role = searchParams.get("role");
    const district = searchParams.get("district");

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    let users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    if (role) users = users.filter((u: any) => u.role === role);
    if (district) users = users.filter((u: any) => u.district === district);

    if (queryParam) {
      users = users.filter(
        (u: any) =>
          u.name?.toLowerCase().includes(queryParam) ||
          u.email?.toLowerCase().includes(queryParam) ||
          u.buckle?.toLowerCase().includes(queryParam)
      );
    }

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Get Users API Error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
