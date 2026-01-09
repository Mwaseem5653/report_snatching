import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { reg_no, category } = await req.json();

    if (!reg_no || !category) {
      return NextResponse.json({ error: "Reg No and Category are required" }, { status: 400 });
    }

    const apiUrl = "https://api.mahisite.xyz/sindh/api.php";
    const params = new URLSearchParams({
      reg_no: reg_no,
      category: category,
    });

    const res = await fetch(`${apiUrl}?${params.toString()}`);
    
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch from external API" }, { status: res.status });
    }

    const data = await res.json();

    if (data.statusCode === 0 && data.data && data.data.length > 0) {
      const info = data.data[0];
      return NextResponse.json({
        registrationNumber: info.registrationNumber,
        ownerName: info.ownerName,
        ownerCNIC: info.ownerCNIC,
        ownerAddress: info.ownerAddress,
        registrationDate: info.registrationDate,
        engineNumber: info.engineNumber,
        chassisNumber: info.chassisNumber,
        branchName: info.branchName,
        districtName: info.districtName,
        modelYear: info.modelYear,
        manufacturerName: info.manufacturerName,
        modelName: info.modelName,
        color: info.color,
        cplcStatus: info.cplcStatus,
      });
    } else {
      return NextResponse.json({ error: "No vehicle record found." });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
