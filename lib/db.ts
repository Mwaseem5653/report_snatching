import { Pool, neon } from "@neondatabase/serverless";

const connectionString = process.env.Neon_db;

if (!connectionString) {
  console.error("❌ Missing Neon_db connection string in .env.local");
}

// Full-featured pool for transactions / connections
export const pool = new Pool({ connectionString });

// Simple sql query executor
export const sql = neon(connectionString || "");
