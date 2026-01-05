"use client"

import { useState, useEffect } from "react"
import AddUserForm from "../add-users/page"
import ApplicationManagement from "../addapplications/addapplication"
import Psusersapplication from "../PsAddApplic/addaplication"
import IMEISearch from "../searchiemis/searchiemi"
import {
  AppWindow,
  Users,
  BarChart3,
  Search,
  PlusCircle,
  FileCheck,
  Briefcase,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ---------------- DEMO COMPONENTS ----------------
function Applications() {
  return <div><Psusersapplication/></div>
}
function AddApplications() {
  return <div><ApplicationManagement/></div>
}
function GraphReport() {
  return <div>📊 Graph Report Page Content</div>
}
function SearchIMEI() {
  return <div><IMEISearch/></div>
}
function MatchedIMEIs() {
  return <div>✅ Matched IMEIs Page Content</div>
}
function Working() {
  return <div>⚡ Working Page Content</div>
}
function ManageUsers() {
  return <div><AddUserForm /></div>
}

// ---------------- SUPER ADMIN / ADMIN MENU ----------------
const superAdminMenu = [
  { key: "add-app", label: "Add Applications", icon: <PlusCircle size={22} />, component: <AddApplications /> },
  { key: "reports", label: "Graph Report", icon: <BarChart3 size={22} />, component: <GraphReport /> },
  { key: "search", label: "Search IMEI", icon: <Search size={22} />, component: <SearchIMEI /> },
  { key: "matched", label: "Matched IMEIs", icon: <FileCheck size={22} />, component: <MatchedIMEIs /> },
  { key: "users", label: "Manage Users", icon: <Users size={22} />, component: <ManageUsers /> },
]

// ---------------- ROLE BASED MENU CONFIG ----------------
const menuItems: Record<
  string,
  { key: string; label: string; icon: JSX.Element; component: JSX.Element }[]
> = {
  "super_admin": superAdminMenu,
  "admin": superAdminMenu, // ✅ same as super admin

  "officer" : [
    // { key: "applications", label: "Applications", icon: <AppWindow size={22} />, component: <Applications /> },
    { key: "add-app", label: "Add Applications", icon: <PlusCircle size={22} />, component: <AddApplications /> },
    // { key: "working", label: "Working", icon: <Briefcase size={22} />, component: <Working /> },
    { key: "search", label: "Search IMEI", icon: <Search size={22} />, component: <SearchIMEI /> },
    { key: "reports", label: "Graph Report", icon: <BarChart3 size={22} />, component: <GraphReport /> },
    { key: "users", label: "Manage Users", icon: <Users size={22} />, component: <ManageUsers /> },
  ],

  "market_user": [
    { key: "search", label: "Search IMEI", icon: <Search size={22} />, component: <SearchIMEI /> },
    
  ],

  "ps_user": [
    { key: "search", label: "Search IMEI", icon: <Search size={22} />, component: <SearchIMEI /> },
    { key: "applications", label: "Applications", icon: <AppWindow size={22} />, component: <Applications /> },
  ],
}

// ---------------- SIDEBAR COMPONENT ----------------
export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [session, setSession] = useState<{ role: string; name: string; email: string } | null>(null)

  // ✅ Fetch session from API
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/create-session")
        const data = await res.json()
        if (data?.authenticated) {
          setSession({
            role: data.role,
            name: data.name,
            email: data.email,
          })
        }
      } catch (error) {
        console.error("Failed to fetch session:", error)
      }
    }
    fetchSession()
  }, [])

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading session...</p>
      </div>
    )
  }

  const items = menuItems[session.role] || []
  const activeComponent =
    items.find((i) => i.key === activeTab)?.component || (
      <div className="text-gray-500">👋 Select an option from sidebar</div>
    )

  return (
    <TooltipProvider>
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col items-center w-16 bg-neutral-900 text-white py-6 space-y-6">
          {items.map((item) => (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab(item.key)}
                  className={`p-2 rounded-lg hover:bg-neutral-800 ${
                    activeTab === item.key ? "bg-neutral-800" : ""
                  }`}
                >
                  {item.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-50 min-h-screen">
          
          {/* Page content */}
          <div className="p-6">{activeComponent}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
