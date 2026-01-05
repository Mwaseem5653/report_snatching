"use client";

import SessionHeader from "@/components/session-avtar/page";
import Sidebar from "@/components/sa-landing/landing-view";

export default function SuperAdminLanding({ children }: { children?: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col w-full overflow-hidden">
      {/* 🔹 Header */}
      <SessionHeader />

      {/* 🔹 Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* 🔹 Sidebar (Fixed Width) */}
        <div className="w-full bg-white border-r shadow-sm">
          <Sidebar />
        </div>

        {/* 🔹 Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {children /* Page Components Render Here, e.g. <UserManagement /> */}
        </main>
      </div>
    </div>
  );
}
