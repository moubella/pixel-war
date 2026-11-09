import { Redis } from "@upstash/redis";

const N = 64;          // canvas size, must match index.html and canvas.js
const COLORS = 16;     // palette size
const BATCH = 100;     // pixels per round
const COOLDOWN_S = 60; // seconds to wait after each round

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});

// Start the cooldown (if not already running) and reset the round counter
async function startCooldown(id) {
  await redis.set(`cd:${id}`, "1", { nx: true, ex: COOLDOWN_S });
  await redis.del(`n:${id}`);
  return Math.max(Number(await redis.pttl(`cd:${id}`)) || 0, 0);
}

// GET  /api/place?id=...      -> { left, wait }   (your status)
// POST /api/place {x,y,c,id}  -> { ok, left, wait }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const id = req.method === "GET" ? req.query.id : (req.body || {}).id;
  if (typeof id !== "string" || !/^[\w-]{8,64}$/.test(id)) {
    return res.status(400).json({ error: "Bad player id" });
  }

  try {
    const wait = Number(await redis.pttl(`cd:${id}`));

    if (req.method === "GET") {
      if (wait > 0) return res.status(200).json({ left: 0, wait });
      const used = Number(await redis.get(`n:${id}`)) || 0;
      if (used >= BATCH) return res.status(200).json({ left: 0, wait: await startCooldown(id) });
      return res.status(200).json({ left: BATCH - used, wait: 0 });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST" });

    const { x, y, c } = req.body || {};
    const valid =
      [x, y, c].every(Number.isInteger) &&
      x >= 0 && x < N && y >= 0 && y < N && c >= 0 && c < COLORS;
    if (!valid) return res.status(400).json({ error: "Bad pixel" });

    if (wait > 0) return res.status(429).json({ left: 0, wait });

    const used = Number(await redis.incr(`n:${id}`));
    if (used > BATCH) return res.status(429).json({ left: 0, wait: await startCooldown(id) });

    await redis.set("canvas", "0".repeat(N * N), { nx: true });
    await redis.setrange("canvas", y * N + x, c.toString(16)); // atomic, one char per pixel

    if (used === BATCH) return res.status(200).json({ ok: true, left: 0, wait: await startCooldown(id) });
    return res.status(200).json({ ok: true, left: BATCH - used, wait: 0 });
  } catch (e) {
    res.status(500).json({ error: "Could not save pixel" });
  }
}
