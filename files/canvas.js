import { Redis } from "@upstash/redis";

const N = 64; // must match index.html and place.js
const PASSWORD = process.env.PIXEL_PASSWORD || "haha";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});

// GET /api/canvas?pw=... -> { n, canvas } where canvas is N*N hex chars (one color index per pixel)
export default async function handler(req, res) {
  if (req.query.pw !== PASSWORD) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(401).json({ error: "Wrong password" });
  }
  try {
    let canvas = await redis.get("canvas");
    if (!canvas) {
      await redis.set("canvas", "0".repeat(N * N), { nx: true });
      canvas = (await redis.get("canvas")) || "0".repeat(N * N);
    }
    // Vercel's CDN caches this for 1s, so 20 people polling = ~1 Redis read per second
    res.setHeader("Cache-Control", "public, s-maxage=1, stale-while-revalidate=1");
    res.status(200).json({ n: N, canvas });
  } catch (e) {
    res.status(500).json({ error: "Canvas unavailable" });
  }
}
