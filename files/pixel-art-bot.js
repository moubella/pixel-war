// PIXEL WAR M3A L3CHRAN: art bot
// 1. Open your site, enter the password once.
// 2. Open the browser console (F12 → Console), paste this whole file, press Enter.
// 3. Type commands like:  art.image()   art.mandala()   art.text("M3A L3CHRAN", 10, 2)
//    art.image() lets you pick any picture (the Mona Lisa, a meme, a photo) and paints it.
// The bot respects the rules: 1000 pixels, wait 1 minute, repeat.

(() => {
  let N = 180; // board size, updated from the server below
  const pw = localStorage.getItem("pw-pass");
  const id = localStorage.getItem("pw-id");
  if (!pw || !id) { console.log("Open the site and enter the password first, then paste this again."); return; }

  const C = {
    white: 0, lightgrey: 1, grey: 2, black: 3, pink: 4, red: 5, orange: 6, brown: 7,
    yellow: 8, lime: 9, green: 10, cyan: 11, blue: 12, navy: 13, lilac: 14, purple: 15,
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let queue = [];
  let running = false, stopFlag = false;

  // ---------- engine ----------
  async function canvasNow() {
    const r = await fetch(`/api/canvas?pw=${encodeURIComponent(pw)}`, { cache: "no-store" });
    const j = await r.json();
    if (Number.isInteger(j.n)) N = j.n;
    return j.canvas || "";
  }

  async function add(pixels, { shuffle = true } = {}) {
    const now = await canvasNow();
    const seen = new Set(queue.map(([x, y]) => y * N + x));
    let list = [];
    for (const [x, y, c] of pixels) {
      if (x < 0 || y < 0 || x >= N || y >= N || c == null) continue;
      const i = y * N + x;
      if (seen.has(i)) continue;
      seen.add(i);
      if (parseInt(now[i], 16) === c) continue; // already the right color
      list.push([x, y, c]);
    }
    if (shuffle) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    queue.push(...list);
    console.log(`🎨 ${list.length} pixels queued (${queue.length} total, about ${Math.ceil(queue.length / 1000)} min)`);
    run();
  }

  async function run() {
    if (running) return;
    running = true; stopFlag = false;
    let fails = 0;
    while (queue.length && !stopFlag) {
      const [x, y, c] = queue[0];
      let r, j;
      try {
        r = await fetch("/api/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y, c, id, pw }),
        });
        j = await r.json().catch(() => ({}));
      } catch (_) { r = { ok: false, status: 0 }; j = {}; }

      if (r.status === 401) { console.log("🔒 Wrong password. Re-enter it on the site, then paste the script again."); break; }
      if (r.status === 429) {
        console.log(`⏳ Waiting ${Math.ceil((j.wait || 1000) / 1000)}s… ${queue.length} pixels left`);
        await sleep((j.wait || 1000) + 300);
        continue;
      }
      if (!r.ok) {
        if (++fails >= 5) { console.warn("Skipping a pixel after 5 failed tries"); queue.shift(); fails = 0; }
        await sleep(1000 * fails);
        continue;
      }
      fails = 0;
      queue.shift();
      if (j.wait > 0) {
        console.log(`⏳ Round done. Waiting ${Math.ceil(j.wait / 1000)}s… ${queue.length} pixels left`);
        await sleep(j.wait + 300);
      } else {
        await sleep(40);
      }
    }
    running = false;
    if (stopFlag) console.log("⏹ Stopped");
    else if (!queue.length) console.log("✅ Done");
  }

  // ---------- helpers ----------
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Draw a picture from text rows. Each letter is a color; "." = leave alone.
  const KEY = {
    W: C.white, l: C.lightgrey, g: C.grey, K: C.black, P: C.pink, R: C.red, O: C.orange, B: C.brown,
    Y: C.yellow, L: C.lime, G: C.green, c: C.cyan, b: C.blue, N: C.navy, p: C.lilac, U: C.purple,
  };
  function spritePixels(rows, x0, y0, scale = 1) {
    const out = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = KEY[ch];
      if (c == null) return;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) out.push([x0 + x * scale + sx, y0 + y * scale + sy, c]);
    }));
    return out;
  }

  const FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
    E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
    I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
    Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111",
    2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110",
    6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
    "!": "010010010000010", "?": "110001010000010", "-": "000000111000000", ".": "000000000000010",
    " ": "000000000000000",
  };

  // ---------- images ----------
  const HEX = ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42",
               "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"];
  const PAL = HEX.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  function nearest(r, g, b) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < PAL.length; i++) {
      const [pr, pg, pb] = PAL[i], rm = (r + pr) / 2, dr = r - pr, dg = g - pg, db = b - pb;
      const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // Shrink an image to fit the box and map it to the 16 colors
  function convert(img, { x, y, width = N, height = N, dither = true } = {}) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(width / iw, height / ih);
    const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    const ox = x ?? Math.floor((N - w) / 2), oy = y ?? Math.floor((N - h) / 2);
    let src = img, sw = iw, sh = ih;
    while (sw / 2 >= w * 2 && sh / 2 >= h * 2) { // shrink in halves for a cleaner result
      const c = document.createElement("canvas");
      c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data; // throws if the image's site blocks it
    const buf = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) { buf[i * 3] = data[i * 4]; buf[i * 3 + 1] = data[i * 4 + 1]; buf[i * 3 + 2] = data[i * 4 + 2]; }
    const idx = new Int8Array(w * h).fill(-1), pixels = [];
    const spread = (xx, yy, er, eg, eb, f) => {
      if (xx < 0 || xx >= w || yy >= h || data[(yy * w + xx) * 4 + 3] < 128) return;
      const k = (yy * w + xx) * 3; buf[k] += er * f; buf[k + 1] += eg * f; buf[k + 2] += eb * f;
    };
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx;
      if (data[i * 4 + 3] < 128) continue; // transparent: leave the canvas alone
      const r = Math.min(255, Math.max(0, buf[i * 3])), gg = Math.min(255, Math.max(0, buf[i * 3 + 1])), b = Math.min(255, Math.max(0, buf[i * 3 + 2]));
      const ci = nearest(r, gg, b);
      idx[i] = ci;
      pixels.push([ox + xx, oy + yy, ci]);
      if (dither) {
        const [pr, pg, pb] = PAL[ci], er = r - pr, eg = gg - pg, eb = b - pb;
        spread(xx + 1, yy, er, eg, eb, 7 / 16); spread(xx - 1, yy + 1, er, eg, eb, 3 / 16);
        spread(xx, yy + 1, er, eg, eb, 5 / 16); spread(xx + 1, yy + 1, er, eg, eb, 1 / 16);
      }
    }
    return { pixels, w, h, ox, oy, idx };
  }

  // Small floating panel on the page for picking and previewing
  function panel(title) {
    document.getElementById("art-panel")?.remove();
    const el = document.createElement("div");
    el.id = "art-panel";
    el.style.cssText = "position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:30;width:min(300px,calc(100vw - 32px));" +
      "display:grid;gap:10px;padding:14px;border-radius:14px;background:var(--surface,#fff);color:var(--ink,#111);" +
      "border:1px solid var(--line,#ccc);box-shadow:0 16px 48px rgba(0,0,0,.35);font:15px/1.4 system-ui,sans-serif";
    const h = document.createElement("strong"); h.textContent = title; el.appendChild(h);
    const body = document.createElement("div"); body.style.cssText = "display:grid;gap:10px;justify-items:center"; el.appendChild(body);
    const info = document.createElement("div"); info.style.cssText = "font-size:13px;opacity:.8;text-align:center"; el.appendChild(info);
    const row = document.createElement("div"); row.style.cssText = "display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"; el.appendChild(row);
    document.body.appendChild(el);
    const btn = (label, onClick, primary) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label;
      b.style.cssText = "height:38px;padding:0 14px;border-radius:9px;cursor:pointer;font:600 14px system-ui,sans-serif;" +
        (primary ? "border:0;background:var(--ink,#111);color:var(--surface,#fff)" : "border:1px solid var(--line,#ccc);background:transparent;color:inherit");
      b.addEventListener("click", onClick); row.appendChild(b); return b;
    };
    return { el, body, info, row, btn, close: () => el.remove() };
  }

  function preview(img, opts) {
    const ui = panel("Preview");
    let dither = opts.dither !== false, res;
    const show = () => {
      try { res = convert(img, { ...opts, dither }); }
      catch (_) {
        ui.body.textContent = "";
        ui.info.textContent = "That website doesn’t allow reading its images. Save the picture to your computer and use art.image() instead.";
        return;
      }
      const c = document.createElement("canvas"); c.width = res.w; c.height = res.h;
      const g = c.getContext("2d");
      res.idx.forEach((ci, i) => { if (ci >= 0) { g.fillStyle = HEX[ci]; g.fillRect(i % res.w, Math.floor(i / res.w), 1, 1); } });
      const scale = Math.max(1, Math.floor(220 / Math.max(res.w, res.h)));
      c.style.cssText = `width:${res.w * scale}px;height:${res.h * scale}px;image-rendering:pixelated;border:1px solid var(--line,#ccc)`;
      ui.body.replaceChildren(c);
      ui.info.textContent = `${res.w}×${res.h} at (${res.ox}, ${res.oy}), ${res.pixels.length} pixels, about ${Math.ceil(res.pixels.length / 1000)} min`;
    };
    ui.btn("Cancel", ui.close);
    const dBtn = ui.btn(`Dither: ${dither ? "on" : "off"}`, () => { dither = !dither; dBtn.textContent = `Dither: ${dither ? "on" : "off"}`; show(); });
    ui.btn("Draw it", () => { if (res) { ui.close(); add(res.pixels); } }, true);
    show();
  }

  // ---------- designs ----------
  const art = {
    C,

    // art.image()  → pick a picture from your computer, preview it, then draw it
    // Options: art.image({ width: 40, height: 40, x: 2, y: 2, dither: false })
    image(opts = {}) {
      const ui = panel("Draw a picture");
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*"; input.style.display = "none"; ui.el.appendChild(input);
      ui.info.textContent = "Any image works. Big pictures get shrunk to fit.";
      ui.btn("Cancel", ui.close);
      ui.btn("Choose image", () => input.click(), true);
      input.addEventListener("change", () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const img = new Image();
        img.onload = () => { ui.close(); preview(img, opts); };
        img.onerror = () => { ui.info.textContent = "That file isn’t an image I can read. Try a JPG or PNG."; };
        img.src = URL.createObjectURL(f);
      });
    },

    // art.imageUrl("https://…/picture.jpg", { width: 40 })  → same, from a link
    imageUrl(url, opts = {}) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => preview(img, opts);
      img.onerror = () => console.log("Couldn’t load that link. Save the picture to your computer and use art.image() instead.");
      img.src = url;
    },

    // art.text("M3A L3CHRAN", x, y, art.C.purple, { scale: 2, bg: art.C.white })
    text(str, x = 2, y = 2, color = C.black, { scale = 1, bg = null } = {}) {
      const out = [];
      const chars = [...String(str).toUpperCase()];
      if (bg != null) {
        const w = chars.length * 4 * scale + scale, h = 5 * scale + 2 * scale;
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) out.push([x - scale + xx, y - scale + yy, bg]);
      }
      chars.forEach((ch, i) => {
        const g = FONT[ch] || FONT["?"];
        for (let r = 0; r < 5; r++) for (let col = 0; col < 3; col++) {
          if (g[r * 3 + col] !== "1") continue;
          for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
            out.push([x + (i * 4 + col) * scale + sx, y + r * scale + sy, color]);
          }
        }
      });
      // text pixels win over background
      const map = new Map(); out.forEach((p) => map.set(p[1] * N + p[0], p));
      return add([...map.values()], { shuffle: false });
    },

    // art.heart(x, y, scale)
    heart(x = N / 2 - 13, y = N / 2 - 11, scale = 2) {
      return add(spritePixels([
        "..KKK...KKK..",
        ".KRRRK.KRRRK.",
        "KRPPRRKRRRRRK",
        "KRPRRRRRRRRRK",
        "KRRRRRRRRRRRK",
        ".KRRRRRRRRRK.",
        "..KRRRRRRRK..",
        "...KRRRRRK...",
        "....KRRRK....",
        ".....KRK.....",
        "......K......",
      ], x, y, scale));
    },

    // art.smiley(x, y, scale)
    smiley(x = N / 2 - 13, y = N / 2 - 13, scale = 2) {
      return add(spritePixels([
        "....KKKKK....",
        "..KKYYYYYKK..",
        ".KYYYYYYYYYK.",
        ".KYYYYYYYYYK.",
        "KYYYKYYYKYYYK",
        "KYYYKYYYKYYYK",
        "KYPYYYYYYYPYK",
        "KYKYYYYYYYKYK",
        "KYYKYYYYYKYYK",
        ".KYYKKKKKYYK.",
        ".KYYYYYYYYYK.",
        "..KKYYYYYKK..",
        "....KKKKK....",
      ], x, y, scale));
    },

    // art.rainbow(centerX, bottomY, radius)
    rainbow(cx = N / 2, cy = Math.round(N * 0.7), r = Math.round(N * 0.4)) {
      const bands = [C.red, C.orange, C.yellow, C.lime, C.green, C.cyan, C.blue, C.purple];
      const bw = Math.max(1, Math.floor(r / 10));
      const out = [];
      for (let y = cy - r; y <= cy; y++) for (let x = cx - r; x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy);
        const band = Math.floor((r - d) / bw);
        if (d <= r && band >= 0 && band < bands.length) out.push([x, y, bands[band]]);
      }
      return add(out);
    },

    // art.spiral(centerX, centerY, arms)
    spiral(cx = N / 2, cy = N / 2, arms = 3) {
      const cols = [C.red, C.orange, C.yellow, C.lime, C.cyan, C.blue, C.purple, C.pink];
      const out = [];
      for (let a = 0; a < arms; a++) {
        for (let t = 0; t < N * 0.4; t += 0.05) {
          const ang = t + (a * 2 * Math.PI) / arms;
          const rr = 1.1 * t;
          out.push([Math.round(cx + rr * Math.cos(ang)), Math.round(cy + rr * Math.sin(ang)), cols[Math.floor(t / 1.6) % cols.length]]);
        }
      }
      return add(out);
    },

    // art.mandala(centerX, centerY, radius, seed). Change the seed for a new one.
    mandala(cx = N / 2, cy = N / 2, r = Math.round(N * 0.23), seed = Math.floor(Math.random() * 1e9)) {
      const rand = rng(seed);
      const pool = [C.red, C.orange, C.yellow, C.lime, C.green, C.cyan, C.blue, C.navy, C.lilac, C.purple, C.pink];
      const palette = Array.from({ length: 4 }, () => pool[Math.floor(rand() * pool.length)]);
      const out = [];
      for (let i = 0; i <= r; i++) for (let j = 0; j <= i; j++) {
        const d = Math.hypot(i, j);
        if (d > r + 0.5) continue;
        let c;
        if (d > r - 0.7) c = C.black;
        else if (rand() < 0.3) continue;
        else c = palette[(Math.floor(d / 3) + Math.floor(rand() * 2)) % palette.length];
        for (const [a, b] of [[i, j], [j, i]]) for (const sx of [1, -1]) for (const sy of [1, -1]) {
          out.push([cx + a * sx, cy + b * sy, c]);
        }
      }
      console.log(`Mandala seed ${seed}`);
      return add(out);
    },

    // Your own pixel art: art.sprite(["..RR..", ".RRRR.", "RRRRRR"], x, y, scale)
    // Letters: W white, l lightgrey, g grey, K black, P pink, R red, O orange, B brown,
    //          Y yellow, L lime, G green, c cyan, b blue, N navy, p lilac, U purple, "." skip
    sprite(rows, x = 0, y = 0, scale = 1) { return add(spritePixels(rows, x, y, scale)); },

    stop() { stopFlag = true; queue = []; },
    status() { console.log(running ? `Drawing… ${queue.length} pixels left` : "Idle"); },
  };

  window.art = art;
  canvasNow().catch(() => {}); // learn the board size
  console.log(`🖌 Art bot ready. Try:
  art.image()                                  ← pick any picture, preview, draw
  art.text("M3A L3CHRAN", 10, 2, art.C.purple)
  art.mandala()                                ← middle of the board, or art.mandala(x, y, radius)
  art.rainbow()
  art.spiral()
  art.heart()                                  ← or art.heart(x, y, size)
  art.smiley()
  art.stop()`);
})();
