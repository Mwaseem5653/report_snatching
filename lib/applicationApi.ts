// utils/applicationApi.ts

// ADD APPLICATION
export async function addApplication(payload: any) {
  try {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    console.error("API error (addApplication):", err);
    return { success: false, message: "Network error" };
  }
}

// GET APPLICATIONS
export async function getApplications(filters: { status?: string; city?: string } = {}) {
  try {
    const params = new URLSearchParams(filters as any).toString();
    const res = await fetch(`/api/applications?${params}`, {
      method: "GET",
    });

    return await res.json();
  } catch (err) {
    console.error("API error (getApplications):", err);
    return { success: false, message: "Network error" };
  }
}

// UPDATE APPLICATION
export async function updateApplication(payload: any) {
  try {
    const res = await fetch("/api/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    console.error("API error (updateApplication):", err);
    return { success: false, message: "Network error" };
  }
}
