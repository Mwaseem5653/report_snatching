"use client"

import SessionHeader from "@/components/session-avtar/page"
import Sidebar from "@/components/sa-landing/landing-view"

export default function SuperAdminLanding() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <SessionHeader />

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar (Vertical Strip) */}
        <Sidebar />

        {/* Page Content (Future Components Render Here) */}
        <main className="flex-1 p-4 bg-gray-50">
          
        </main>
      </div>
    </div>
  )
}
