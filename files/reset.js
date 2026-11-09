import { Redis } from "@upstash/redis";

const N = 180;                             // board size, must match canvas.js and place.js
const KEY = `canvas${N}`;
const ADMIN = process.env.ADMIN_PASSWORD;  // set in Vercel; reset stays off without it

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});

// POST /api/reset { admin } -> the whole board goes back to white
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!ADMIN) return res.status(403).json({ error: "Reset is off. Add ADMIN_PASSWORD in Vercel, then redeploy." });
  if ((req.body || {}).admin !== ADMIN) return res.status(401).json({ error: "Wrong admin password" });
  try {
    await redis.set(KEY, "0".repeat(N * N)); // overwrite (not delete) so old boards don't come back
    res.status(200).json({ ok: true, message: "Board reset to white" });
  } catch (e) {
    res.status(500).json({ error: "Reset failed" });
  }
}
