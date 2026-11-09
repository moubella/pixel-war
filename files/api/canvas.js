import { Redis } from "@upstash/redis";

const N = 180;               // board size, must match place.js (the page adapts by itself)
const KEY = `canvas${N}`;    // each board size has its own saved board
// Previous boards: the newest one found is copied into the middle, once
const OLD = [{ key: "canvas128", n: 128 }, { key: "canvas", n: 64 }];
const PASSWORD = process.env.PIXEL_PASSWORD || "haha";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});

// First time this board size is used: start blank, with the old board centered in it
async function createBoard() {
  const cells = new Array(N * N).fill("0");
  for (const prev of OLD) {
    if (prev.n > N) continue;
    const old = await redis.get(prev.key);
    if (!old || old.length < prev.n * prev.n) continue;
    const off = Math.floor((N - prev.n) / 2);
    for (let y = 0; y < prev.n; y++) for (let x = 0; x < prev.n; x++) {
      const ch = old[y * prev.n + x];
      if (/^[0-9a-f]$/.test(ch)) cells[(y + off) * N + (x + off)] = ch;
    }
    break;
  }
  const board = cells.join("");
  await redis.set(KEY, board, { nx: true });
  return (await redis.get(KEY)) || board;
}

// GET /api/canvas?pw=... -> { n, canvas } where canvas is N*N hex chars (one color index per pixel)
export default async function handler(req, res) {
  if (req.query.pw !== PASSWORD) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(401).json({ error: "Wrong password" });
  }
  try {
    const canvas = (await redis.get(KEY)) || (await createBoard());
    // Vercel's CDN caches this for 1s, so 20 people polling = ~1 Redis read per second
    res.setHeader("Cache-Control", "public, s-maxage=1, stale-while-revalidate=1");
    res.status(200).json({ n: N, canvas });
  } catch (e) {
    res.status(500).json({ error: "Canvas unavailable" });
  }
}
