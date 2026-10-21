(() => {
  "use strict";

  const BN = '"BN Digits", "Baloo Da 2", "Hind Siliguri", sans-serif';
  const BN2 = '"BN Digits", "Hind Siliguri", "Baloo Da 2", sans-serif';
  const EN = '"Archivo", "Helvetica Neue", Arial, sans-serif';
  const RED = "#E22830";
  const STORE = "amarbangla-photocard-v2";

  const THEMES = [
    { name: "আমার বাংলা", panel: "#FFFFFF", accent: "#E22830", high: "#E22830" },
    { name: "কালো", panel: "#16161A", accent: "#E22830", high: "#E22830" },
    { name: "লাল", panel: "#E22830", accent: "#16161A", high: "#16161A" },
    { name: "নেভি", panel: "#0F1F3D", accent: "#E22830", high: "#E22830" },
    { name: "সবুজ", panel: "#0B3B2E", accent: "#E22830", high: "#F4C430" },
    { name: "কুয়াশা", panel: "#F2F3F5", accent: "#E22830", high: "#16161A" }
  ];
  const CATS = ["জাতীয়", "রাজনীতি", "অর্থনীতি", "সারাদেশ", "আন্তর্জাতিক", "খেলা", "বিনোদন", "প্রযুক্তি", "শিক্ষা", "স্বাস্থ্য", "মতামত", "ব্রেকিং"];

  const $ = (id) => document.getElementById(id);
  const cv = $("card"), ctx = cv.getContext("2d");

  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const defaults = () => ({
    layout: "circle", size: "45", hlStyle: "box", headline: "", sub: "", qName: "", qRole: "", category: "",
    date: todayISO(), showDate: true, bangabda: false, credit: "", fs: 1, align: "center",
    theme: 0, panel: "#FFFFFF", accent: RED, high: RED,
    site: "amarbanglabd.com", logoScale: 0.78, catScale: 1, textColor: "", footer: "বিস্তারিত কমেন্টে", logoPos: "left",
    zoom: 1, bright: 100, contrast: 100, gray: false
  });
  const state = Object.assign(defaults(), load());
  state.date = todayISO();
  const photos = { 1: { img: null, zoom: 1, ox: 0, oy: 0 }, 2: { img: null, zoom: 1, ox: 0, oy: 0 } };
  let regions = [];

  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; } }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { const { date, ...rest } = state; localStorage.setItem(STORE, JSON.stringify(rest)); } catch (e) {} }, 300); }

  // ---------- Bangla date ----------
  const BD = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BD[d]);
  const DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
  const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const BMONTHS = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
  function parseISO(iso) { const [y, m, d] = (iso || todayISO()).split("-").map(Number); return new Date(y, m - 1, d); }
  function bangabda(dt) {
    const y = dt.getFullYear();
    let start = new Date(y, 3, 14), by = y - 593;
    if (dt < start) { start = new Date(y - 1, 3, 14); by = y - 594; }
    const gNext = start.getFullYear() + 1, leap = (gNext % 4 === 0 && gNext % 100 !== 0) || gNext % 400 === 0;
    const len = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, leap ? 30 : 29, 30];
    let days = Math.round((dt - start) / 86400000), m = 0;
    while (m < 11 && days >= len[m]) { days -= len[m]; m++; }
    return `${bn(days + 1)} ${BMONTHS[m]} ${bn(by)}`;
  }
  function dateLabel() {
    const dt = parseISO(state.date);
    let s = `${DAYS[dt.getDay()]}, ${bn(dt.getDate())} ${MONTHS[dt.getMonth()]} ${bn(dt.getFullYear())}`;
    if (state.bangabda) s += `  |  ${bangabda(dt)}`;
    return s;
  }

  // ---------- helpers ----------
  const hexRgb = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
  const isLight = (h) => { const [r, g, b] = hexRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b > 165; };
  function dims() { return { "11": [1080, 1080], "45": [1080, 1350], "916": [1080, 1920], "169": [1280, 720] }[state.size] || [1080, 1350]; }

  const logos = { black: new Image(), white: new Image() };
  logos.black.src = "assets/logo-black.png"; logos.white.src = "assets/logo-white.png";
  logos.black.onload = logos.white.onload = () => schedule();

  // ---------- primitives ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    const k = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + k, y); ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k); ctx.closePath();
  }
  function photoIn(n, x, y, w, h, clip) {
    const p = photos[n];
    regions.push({ n, x, y, w, h });
    ctx.save(); clip(); ctx.clip();
    if (!p.img) {
      ctx.fillStyle = "#C9CCD3"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(22,22,26,.45)"; ctx.font = `600 ${Math.max(18, Math.min(36, w / 12))}px ${BN2}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n === 2 ? "দ্বিতীয় ছবি" : "এখানে ছবি আসবে", x + w / 2, y + h / 2);
      ctx.restore(); ctx.textAlign = "left"; return;
    }
    const s = Math.max(w / p.img.width, h / p.img.height) * p.zoom;
    const dw = p.img.width * s, dh = p.img.height * s, mx = (dw - w) / 2, my = (dh - h) / 2;
    p.ox = Math.max(-mx, Math.min(mx, p.ox)); p.oy = Math.max(-my, Math.min(my, p.oy));
    if (state.bright !== 100 || state.contrast !== 100 || state.gray) ctx.filter = `brightness(${state.bright}%) contrast(${state.contrast}%)${state.gray ? " grayscale(1)" : ""}`;
    ctx.drawImage(p.img, x + (w - dw) / 2 + p.ox, y + (h - dh) / 2 + p.oy, dw, dh);
    ctx.filter = "none"; ctx.restore();
  }
  const photo = (n, x, y, w, h) => photoIn(n, x, y, w, h, () => { ctx.beginPath(); ctx.rect(x, y, w, h); });
  const photoRound = (n, x, y, w, h, r) => photoIn(n, x, y, w, h, () => rr(x, y, w, h, r));
  const photoCircle = (n, cx, cy, r) => photoIn(n, cx - r, cy - r, r * 2, r * 2, () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); });

  function logo(x, y, h, onDark, shadow, alignRight, W) {
    h = h * (state.logoScale || 1);
    const img = onDark ? logos.white : logos.black;
    if (!img.complete || !img.naturalWidth) return 0;
    const lw = h * img.naturalWidth / img.naturalHeight, lx = alignRight ? W - lw - x : x;
    ctx.save();
    if (shadow) { ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = h * 0.4; ctx.shadowOffsetY = h * 0.05; }
    ctx.drawImage(img, lx, y, lw, h); ctx.restore();
    return lw;
  }
  function topShade(x, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, h);
  }
  function pill(text, x, y, h, bg, fg, alignRight, font) {
    ctx.font = font || `700 ${Math.round(h * 0.48)}px ${BN}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const pad = h * 0.5, w = ctx.measureText(text).width + pad * 2, sx = alignRight ? x - w : x;
    ctx.fillStyle = bg; rr(sx, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, sx + pad, y + h * 0.56);
    return { x: sx, w };
  }
  function dot(cx, cy, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }

  function tokens(text) {
    const out = [];
    text.split("\n").forEach((para, pi) => {
      if (pi > 0) out.push({ br: true });
      let unit = null;
      para.split("*").forEach((seg, si) => {
        const hl = si % 2 === 1;
        seg.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { if (unit) { out.push(unit); unit = null; } return; }
          if (!unit) unit = { pieces: [] };
          unit.pieces.push({ t: p, hl });
        });
      });
      if (unit) out.push(unit);
    });
    return out;
  }
  function wrap(toks, fs, maxW, weight) {
    ctx.font = `${weight} ${fs}px ${BN}`;
    const sp = ctx.measureText(" ").width, lines = []; let cur = [], cw = 0;
    for (const tk of toks) {
      if (tk.br) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; continue; }
      const pieces = tk.pieces.map((p) => ({ ...p, w: ctx.measureText(p.t).width }));
      const w = pieces.reduce((a, p) => a + p.w, 0), add = cur.length ? sp + w : w;
      if (cur.length && cw + add > maxW) { lines.push({ words: cur, w: cw }); cur = [{ pieces, w }]; cw = w; }
      else { cur.push({ pieces, w }); cw += add; }
    }
    if (cur.length) lines.push({ words: cur, w: cw });
    return { lines, sp };
  }
  const boxFg = (bg) => isLight(bg) ? "#16161A" : "#FFFFFF";

  // headline: *word* = red rounded box with white text (or coloured text if the box style is off)
  function text(str, box, o) {
    const weight = o.weight || 800, LH = o.lh || 1.28, align = o.align || state.align;
    const ph = !(str || "").trim();
    const toks = tokens(ph ? (o.placeholder || "") : str.trim());
    let fs = Math.round(o.max * state.fs * (story() ? 1.15 : 1)), res;
    for (; fs >= o.min; fs -= 2) { res = wrap(toks, fs, box.w - fs * 0.3, weight); if (res.lines.length <= (o.maxLines || 6) && res.lines.length * fs * LH <= box.h) break; }
    if (fs < o.min) { fs = o.min; res = wrap(toks, fs, box.w - fs * 0.3, weight); }
    const lh = fs * LH, blockH = res.lines.length * lh;
    let top = box.y;
    if (o.valign === "middle") top = box.y + (box.h - blockH) / 2;
    if (o.valign === "bottom") top = box.y + box.h - blockH;
    const useBox = state.hlStyle === "box" && !ph;
    ctx.font = `${weight} ${fs}px ${BN}`; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    res.lines.forEach((ln, i) => {
      let x = align === "center" ? box.x + (box.w - ln.w) / 2 : box.x + (useBox ? fs * 0.15 : 0);
      const y = top + i * lh + fs * 0.92;
      // pass 1: boxes behind runs of highlighted words (সংশোধিত পজিশনিং ও হাইট)
      if (useBox) {
        let runStart = null, cx = x;
        ln.words.forEach((wd, wi) => {
          let px = cx;
          wd.pieces.forEach((p, pi2) => {
            if (p.hl && runStart === null) runStart = px;
            const nextHl = pi2 < wd.pieces.length - 1 ? wd.pieces[pi2 + 1].hl : (wi < ln.words.length - 1 && ln.words[wi + 1].pieces[0].hl);
            px += p.w;
            if (p.hl && !nextHl) { 
              ctx.fillStyle = o.high; 
              rr(runStart - fs * 0.15, y - fs * 0.82, px - runStart + fs * 0.3, fs * 1.08, fs * 0.2); 
              ctx.fill(); 
              runStart = null; 
            }
          });
          cx += wd.w + res.sp;
        });
      }
      ln.words.forEach((wd) => {
        let px = x;
        wd.pieces.forEach((p) => {
          ctx.fillStyle = ph ? rgba(o.color, 0.38) : (p.hl ? (useBox ? boxFg(o.high) : o.high) : o.color);
          ctx.fillText(p.t, px, y); px += p.w;
        });
        x += wd.w + res.sp;
      });
    });
    return { top, blockH, fs, bottom: top + blockH };
  }

  function oneLine(str, x, y, maxW, size, color, align, weight) {
    if (!str) return;
    let fs = size; ctx.font = `${weight || "600"} ${fs}px ${BN2}`;
    while (ctx.measureText(str).width > maxW && fs > 16) { fs -= 1; ctx.font = `${weight || "600"} ${fs}px ${BN2}`; }
    ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.textAlign = align || "left"; ctx.fillText(str, x, y); ctx.textAlign = "left";
  }
  function footer(W, H, dark, pad) {
    pad = pad || 60;
    const y = H - (story() ? 210 : 66), fg = dark ? "rgba(255,255,255,.85)" : "#3B3C42";
    dot(pad + 8, y, 8, state.accent);
    ctx.font = `700 26px ${EN}`; ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillText(state.site.trim(), pad + 26, y);
    if (state.footer.trim()) oneLine(state.footer.trim(), W - pad, y + 2, W / 2 - pad, 27, fg, "right");
  }
  function credit(xRight, yBottom) {
    if (!state.credit.trim()) return;
    ctx.font = `600 21px ${BN2}`; const w = ctx.measureText(state.credit.trim()).width + 26;
    ctx.fillStyle = "rgba(0,0,0,.5)"; rr(xRight - w, yBottom - 36, w, 30, 15); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(state.credit.trim(), xRight - w + 13, yBottom - 20);
  }
  const dark = () => !isLight(state.panel);
  const textCol = () => state.textColor || (dark() ? "#FFFFFF" : "#16161A");
  const subCol = () => dark() ? "rgba(255,255,255,.75)" : "#4A4B52";
  const story = () => state.size === "916";
  const land = () => state.size === "169";
  const catChip = (x, y, h, right) => state.category.trim() && pill(state.category.trim(), x, y, h * (state.catScale || 1), state.accent, boxFg(state.accent), right);

  // ---------- layouts ----------
  function circle(W, H) {
    ctx.fillStyle = state.panel; ctx.fillRect(0, 0, W, H);
    if (land()) {
      const pw = Math.round(W * 0.52);
      photo(1, 0, 0, pw, H); topShade(0, pw, 200); credit(pw - 16, H - 12);
      ctx.save(); ctx.beginPath(); ctx.rect(pw, 0, W - pw, H); ctx.clip(); dot(pw, H / 2, 120, state.accent); ctx.restore();
      logo(36, 32, 52, true, true, state.logoPos === "right", pw);
      const tx = pw + 150, tw = W - tx - 56;
      catChip(tx, 60, 50, false);
      const b = text(state.headline, { x: tx, y: 130, w: tw, h: H - 260 }, { max: 58, min: 28, valign: "middle", align: "left", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে দেখাবে" });
      if (state.sub.trim()) oneLine(state.sub.trim(), tx, b.bottom + 32, tw, 24, subCol());
      if (state.showDate) oneLine(dateLabel(), tx, H - 64, tw, 22, subCol());
      return;
    }
    const ph = Math.round(H * (story() ? 0.5 : state.size === "11" ? 0.55 : 0.57));
    photo(1, 0, 0, W, ph); topShade(0, W, story() ? 520 : 240); credit(W - 18, ph - 60);
    const topY = story() ? 230 : 44;
    logo(48, topY, 72, true, true, state.logoPos === "right", W);
    catChip(state.logoPos === "right" ? 48 : W - 48, topY + 6, 60, state.logoPos !== "right");
    const R = 150;
    dot(W / 2, ph + 20, R, state.accent);
    ctx.fillStyle = state.panel; ctx.fillRect(0, ph + 20, W, H);
    ctx.fillStyle = state.accent; ctx.fillRect(0, ph, W, 6);
    if (state.showDate) {
      const dt = parseISO(state.date);
      ctx.fillStyle = boxFg(state.accent); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.font = `800 64px ${BN}`; ctx.fillText(bn(dt.getDate()), W / 2, ph - 50);
      ctx.font = `600 24px ${BN2}`; ctx.fillText(`${MONTHS[dt.getMonth()]} ${bn(dt.getFullYear())}`, W / 2, ph - 14);
      ctx.textAlign = "left";
    }
    const subH = state.sub.trim() ? 54 : 0, top = ph + 64, bottom = H - (story() ? 280 : 116) - subH;
    const b = text(state.headline, { x: 70, y: top, w: W - 140, h: bottom - top }, { max: 78, min: 36, valign: "middle", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে দেখাবে" });
    if (subH) oneLine(state.sub.trim(), state.align === "center" ? W / 2 : 70, b.bottom + 34, W - 140, 29, subCol(), state.align === "center" ? "center" : "left");
    footer(W, H, dark());
  }

  function full(W, H) {
    ctx.fillStyle = state.panel; ctx.fillRect(0, 0, W, H);
    photo(1, 0, 0, W, H); topShade(0, W, story() ? 520 : 260);
    const topY = story() ? 230 : 44;
    logo(48, topY, land() ? 56 : 72, true, true, state.logoPos === "right", W);
    if (state.showDate) pill(dateLabel(), state.logoPos === "right" ? 48 : W - 48, topY + 8, land() ? 46 : 54, "rgba(255,255,255,.92)", "#16161A", state.logoPos !== "right", `600 ${land() ? 22 : 25}px ${BN2}`);
    const m = land() ? 40 : 44, bottomGap = story() ? 250 : 44;
    const panelH = land() ? Math.round(H * 0.5) : Math.round(H * (story() ? 0.3 : 0.36));
    const py = H - bottomGap - panelH, pw = land() ? Math.round(W * 0.62) : W - m * 2;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10;
    ctx.fillStyle = state.panel; rr(m, py, pw, panelH, 34); ctx.fill(); ctx.restore();
    dot(m + pw - 10, py + 10, 26, state.accent);
    let y = py + 40;
    if (state.category.trim()) { const ch = 48 * (state.catScale || 1); pill(state.category.trim(), m + 40, y, ch, state.accent, boxFg(state.accent)); y += ch + 16; }
    const subH = state.sub.trim() ? 46 : 0, footH = land() ? 50 : 70;
    const b = text(state.headline, { x: m + 40, y, w: pw - 80, h: py + panelH - y - footH - subH }, { max: land() ? 50 : 72, min: 28, valign: "middle", align: "left", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে দেখাবে" });
    if (subH) oneLine(state.sub.trim(), m + 40, b.bottom + 26, pw - 80, 25, subCol());
    ctx.font = `700 22px ${EN}`; ctx.fillStyle = subCol(); ctx.textBaseline = "middle"; ctx.fillText(state.site.trim(), m + 40, py + panelH - 36);
    if (state.footer.trim()) oneLine(state.footer.trim(), m + pw - 40, py + panelH - 34, pw / 2, 23, subCol(), "right");
    credit(W - 18, py - 14);
  }

 function frame(W, H) {
    const bg = dark() ? state.panel : (state.panel.toLowerCase() === "#ffffff" ? "#F2F3F5" : state.panel);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const m = 48;
    if (land()) {
      const pw = Math.round(W * 0.5);
      photoRound(1, m, m, pw - m, H - m * 2, 30); credit(pw - 18, H - m - 12);
      const tx = pw + 44, tw = W - tx - m;
      logo(tx, m + 4, 44, dark(), false);
      catChip(tx, m + 80, 44, false);
      const b = text(state.headline, { x: tx, y: m + 140, w: tw, h: H - m * 2 - 220 }, { max: 54, min: 26, valign: "middle", align: "left", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে দেখাবে" });
      if (state.sub.trim()) oneLine(state.sub.trim(), tx, b.bottom + 12, tw, 23, subCol());
      if (state.showDate) oneLine(dateLabel(), tx, H - m - 18, tw, 21, subCol());
      return;
    }
    const top = story() ? 220 : m, phh = Math.round((W - m * 2) * (story() ? 0.95 : state.size === "11" ? 0.5 : 0.62));
    photoRound(1, m, top, W - m * 2, phh, 36); credit(W - m - 18, top + phh - 12);
    if (state.category.trim()) {
      const cs = state.catScale || 1;
      ctx.font = `700 ${Math.round(26 * cs)}px ${BN}`; const cw = ctx.measureText(state.category.trim()).width;
      const r = Math.max(62 * cs, cw / 2 + 20 * cs);
      dot(W - m - r + 10, top + phh, r, state.accent);
      ctx.fillStyle = boxFg(state.accent); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(state.category.trim(), W - m - r + 10, top + phh + 2); ctx.textAlign = "left";
    }
    let y = top + phh + 24; 
    if (state.showDate) { oneLine(dateLabel(), m, y, W - m * 2 - 160, 25, subCol()); y += 30; }
    const footY = H - (story() ? 300 : 140), subH = state.sub.trim() ? 35 : 0;
    const b = text(state.headline, { x: m, y, w: W - m * 2, h: footY - y - subH - 10 }, { max: 74, min: 34, valign: story() ? "middle" : "top", align: "left", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে দেখাবে" });
    if (subH) oneLine(state.sub.trim(), m, b.bottom + 10, W - m * 2, 27, subCol()); // b.bottom + 10 দিয়ে দূরত্ব আরও কমিয়ে দেওয়া হয়েছে
    logo(m, footY + 34, 52, dark(), false);
    ctx.font = `700 24px ${EN}`; ctx.fillStyle = subCol(); ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(state.site.trim(), W - m, footY + 50); ctx.textAlign = "left";
    if (state.footer.trim()) oneLine(state.footer.trim(), W - m, footY + 86, W / 2, 23, subCol(), "right");
  }

  function breaking(W, H) {
    const A = state.accent === "#16161A" || isLight(state.accent) ? RED : state.accent;
    ctx.fillStyle = A; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 3;
    for (let r = 140; r < Math.max(W, H) * 1.2; r += 90) { ctx.beginPath(); ctx.arc(W - 40, 40, r, 0, Math.PI * 2); ctx.stroke(); }
    const topY = story() ? 220 : land() ? 30 : 48;
    logo(48, topY, land() ? 50 : 64, true, false);
    const label = state.category.trim() || "ব্রেকিং নিউজ";
    const cs = state.catScale || 1;
    ctx.font = `800 ${Math.round((land() ? 30 : 36) * cs)}px ${BN}`;
    const bh = (land() ? 56 : 66) * cs, bw = ctx.measureText(label).width + bh * 1.45;
    const bx = W - 48 - bw, by = topY + (land() ? -3 : 0);
    ctx.fillStyle = "#FFFFFF"; rr(bx, by, bw, bh, bh / 2); ctx.fill();
    dot(bx + bh * 0.52, by + bh / 2, bh * 0.17, A); ctx.strokeStyle = rgba(A, 0.35); ctx.lineWidth = 6 * cs; ctx.beginPath(); ctx.arc(bx + bh * 0.52, by + bh / 2, bh * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = A; ctx.textBaseline = "middle"; ctx.fillText(label, bx + bh * 0.94, by + bh / 2 + 3);
    if (land()) {
      const pw = Math.round(W * 0.48);
      photoRound(1, 48, 110, pw - 48, H - 150, 28); credit(pw - 16, H - 52);
      const tx = pw + 40, tw = W - tx - 48;
      const b = text(state.headline, { x: tx, y: 120, w: tw, h: H - 220 }, { max: 56, min: 26, valign: "middle", align: "left", color: state.textColor || "#FFFFFF", high: "#16161A", placeholder: "ব্রেকিং শিরোনাম এখানে" });
      if (state.showDate) oneLine(dateLabel(), tx, H - 56, tw, 22, "rgba(255,255,255,.85)");
      return;
    }
    const ptop = topY + 110, phh = Math.round(H * (story() ? 0.34 : state.size === "11" ? 0.38 : 0.42));
    photoRound(1, 48, ptop, W - 96, phh, 34); credit(W - 66, ptop + phh - 12);
    let y = ptop + phh + 50;
    if (state.showDate) { oneLine(dateLabel(), state.align === "center" ? W / 2 : 60, y, W - 120, 26, "rgba(255,255,255,.85)", state.align === "center" ? "center" : "left"); y += 30; }
    const subH = state.sub.trim() ? 50 : 0, bottom = H - (story() ? 280 : 116) - subH;
    const b = text(state.headline, { x: 60, y, w: W - 120, h: bottom - y }, { max: 80, min: 36, valign: "middle", color: state.textColor || "#FFFFFF", high: "#16161A", placeholder: "ব্রেকিং শিরোনাম এখানে" });
    if (subH) oneLine(state.sub.trim(), state.align === "center" ? W / 2 : 60, b.bottom + 32, W - 120, 27, "rgba(255,255,255,.85)", state.align === "center" ? "center" : "left");
    const y2 = H - (story() ? 210 : 66);
    ctx.font = `700 26px ${EN}`; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(state.site.trim(), 60, y2);
    if (state.footer.trim()) oneLine(state.footer.trim(), W - 60, y2 + 2, W / 2 - 60, 27, "rgba(255,255,255,.9)", "right");
  }

  function quote(W, H) {
    ctx.fillStyle = state.panel; ctx.fillRect(0, 0, W, H);
    if (land()) {
      const r = 200, cx = 270, cy = H / 2;
      dot(cx, cy, r + 14, state.accent); photoCircle(1, cx, cy, r);
      logo(48, 36, 46, dark(), false, true, W);
      const tx = 540, tw = W - tx - 60;
      ctx.font = `800 160px Georgia, serif`; ctx.fillStyle = state.accent; ctx.textBaseline = "alphabetic"; ctx.fillText("“", tx - 10, 230);
      const b = text(state.headline, { x: tx, y: 170, w: tw, h: H - 330 }, { max: 50, min: 26, weight: 700, lh: 1.35, valign: "middle", align: "left", color: textCol(), high: state.high, placeholder: "উক্তি এখানে লিখুন" });
      oneLine(state.qName.trim() || "বক্তার নাম", tx, b.bottom + 50, tw, 30, textCol(), "left", "700");
      if (state.qRole.trim()) oneLine(state.qRole.trim(), tx, b.bottom + 90, tw, 23, subCol());
      return;
    }
    const topY = story() ? 220 : 48;
    logo(48, topY, 60, dark(), false, state.logoPos === "right", W);
    if (state.showDate) oneLine(dateLabel(), state.logoPos === "right" ? 48 : W - 48, topY + 30, W / 2, 24, subCol(), state.logoPos === "right" ? "left" : "right");
    const r = story() ? 230 : state.size === "11" ? 150 : 190, cy = topY + 120 + r;
    ctx.strokeStyle = rgba(state.accent, 0.25); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, cy, r + 34, 0, Math.PI * 2); ctx.stroke();
    dot(W / 2, cy, r + 12, state.accent); photoCircle(1, W / 2, cy, r);
    dot(W / 2 + r * 0.72, cy + r * 0.72, 46, state.accent);
    ctx.font = `800 96px Georgia, serif`; ctx.fillStyle = boxFg(state.accent); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText("“", W / 2 + r * 0.72, cy + r * 0.72 + 52); ctx.textAlign = "left";
    const top = cy + r + 60, footY = H - (story() ? 300 : 150);
    const b = text(state.headline, { x: 80, y: top, w: W - 160, h: footY - top - 90 }, { max: 76, min: 30, weight: 700, lh: 1.32, valign: "middle", align: "center", color: textCol(), high: state.high, placeholder: "উক্তি এখানে লিখুন" });
    oneLine(state.qName.trim() || "বক্তার নাম", W / 2, b.bottom + 52, W - 160, 34, state.accent, "center", "700");
    if (state.qRole.trim()) oneLine(state.qRole.trim(), W / 2, b.bottom + 92, W - 160, 25, subCol(), "center");
    footer(W, H, dark());
  }

  function split(W, H) {
    ctx.fillStyle = state.panel; ctx.fillRect(0, 0, W, H);
    const topY = story() ? 220 : land() ? 30 : 48;
    logo(48, topY, land() ? 50 : 64, dark(), false, state.logoPos === "right", W);
    catChip(state.logoPos === "right" ? 48 : W - 48, topY + 4, land() ? 46 : 56, state.logoPos !== "right");
    const r = land() ? 170 : story() ? 240 : state.size === "11" ? 190 : 215;
    const cy = land() ? H / 2 - 40 : topY + 110 + r, gap = land() ? 30 : 16;
    const c1 = land() ? 60 + r : W / 2 - r - 10 - gap / 2, c2 = land() ? 60 + r * 3 + gap : W / 2 + r + 10 + gap / 2;
    dot(c1, cy, r + 10, state.accent); dot(c2, cy, r + 10, dark() ? "#FFFFFF" : "#16161A");
    photoCircle(1, c1, cy, r); photoCircle(2, c2, cy, r);
    const vx = (c1 + c2) / 2;
    dot(vx, cy, 52, "#FFFFFF"); ctx.strokeStyle = state.accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(vx, cy, 52, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `800 30px ${BN}`; ctx.fillStyle = state.accent; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("বনাম", vx, cy + 3); ctx.textAlign = "left";
    if (land()) {
      const tx = c2 + r + 50, tw = W - tx - 48;
      text(state.headline, { x: tx, y: 120, w: tw, h: H - 220 }, { max: 46, min: 24, valign: "middle", align: "left", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে" });
      if (state.showDate) oneLine(dateLabel(), tx, H - 56, tw, 20, subCol());
      return;
    }
    let top = cy + r + 60;
    if (state.showDate) { oneLine(dateLabel(), state.align === "center" ? W / 2 : 70, top, W - 140, 25, subCol(), state.align === "center" ? "center" : "left"); top += 32; }
    const bottom = H - (story() ? 280 : 116);
    text(state.headline, { x: 70, y: top, w: W - 140, h: bottom - top }, { max: 72, min: 30, valign: "middle", color: textCol(), high: state.high, placeholder: "শিরোনাম এখানে দেখাবে" });
    footer(W, H, dark());
  }

  const LAYOUTS = { circle, full, frame, breaking, quote, split };

  let raf = 0;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }
  function render() {
    const [W, H] = dims();
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    regions = [];
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "left"; ctx.filter = "none";
    (LAYOUTS[state.layout] || circle)(W, H);
    document.body.classList.toggle("is-quote", state.layout === "quote");
    document.body.classList.toggle("is-split", state.layout === "split");
    $("headlineLabel").textContent = state.layout === "quote" ? "উক্তি" : "শিরোনাম";
  }

  function loadPhoto(file, n) {
    if (!file || !file.type || !file.type.startsWith("image/")) { toast("এটা ছবি না। JPG, PNG বা WebP দিন।", true); return; }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      photos[n] = { img: im, zoom: 1, ox: 0, oy: 0 };
      if (n === 1) { $("zoom").value = 1; $("drop1Text").textContent = "অন্য ছবি দিতে চাপুন"; }
      else $("drop2Text").textContent = "অন্য দ্বিতীয় ছবি দিন";
      schedule();
    };
    im.onerror = () => toast("ছবিটা খোলা যায়নি। অন্য ছবি দিন।", true);
    im.src = url;
  }
  function loadPhotoUrl(url) {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => { photos[1] = { img: im, zoom: 1, ox: 0, oy: 0 }; schedule(); };
    im.onerror = () => toast("লিংকের ছবিটা আনা যায়নি; ছবিটা নামিয়ে এখানে দিন।", true);
    im.src = url;
  }
  $("file1").addEventListener("change", (e) => loadPhoto(e.target.files[0], 1));
  $("file2").addEventListener("change", (e) => loadPhoto(e.target.files[0], 2));

  const stage = $("stage");
  ["dragenter", "dragover"].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove("dragging"); }));
  stage.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = cv.getBoundingClientRect(), k = cv.width / r.width, x = (e.clientX - r.left) * k;
    loadPhoto(f, state.layout === "split" && x > cv.width / 2 ? 2 : 1);
  });
  document.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) { e.preventDefault(); loadPhoto(item.getAsFile(), state.layout === "split" && photos[1].img && !photos[2].img ? 2 : 1); toast("ছবি পেস্ট হয়েছে"); }
  });

  let drag = null;
  function hit(e) {
    const r = cv.getBoundingClientRect(), k = cv.width / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    for (let i = regions.length - 1; i >= 0; i--) { const g = regions[i]; if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return { g, k }; }
    return null;
  }
  cv.addEventListener("pointerdown", (e) => {
    const h = hit(e); if (!h || !photos[h.g.n].img) return;
    drag = { n: h.g.n, x: e.clientX, y: e.clientY, ox: photos[h.g.n].ox, oy: photos[h.g.n].oy, k: h.k };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => { if (!drag) return; const p = photos[drag.n]; p.ox = drag.ox + (e.clientX - drag.x) * drag.k; p.oy = drag.oy + (e.clientY - drag.y) * drag.k; schedule(); });
  const end = () => { drag = null; };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  cv.addEventListener("wheel", (e) => {
    const h = hit(e); if (!h || !photos[h.g.n].img) return;
    e.preventDefault(); const p = photos[h.g.n];
    p.zoom = Math.min(3, Math.max(1, p.zoom - e.deltaY * 0.0015));
    if (h.g.n === 1) $("zoom").value = p.zoom;
    schedule();
  }, { passive: false });

  $("zoom").addEventListener("input", (e) => { photos[1].zoom = +e.target.value; schedule(); });
  $("resetPhoto").addEventListener("click", () => {
    [1, 2].forEach((n) => Object.assign(photos[n], { zoom: 1, ox: 0, oy: 0 }));
    Object.assign(state, { bright: 100, contrast: 100, gray: false });
    $("zoom").value = 1; $("bright").value = 100; $("contrast").value = 100; $("gray").checked = false; save(); schedule();
  });
  $("removePhoto").addEventListener("click", () => {
    photos[1] = { img: null, zoom: 1, ox: 0, oy: 0 }; photos[2] = { img: null, zoom: 1, ox: 0, oy: 0 };
    $("file1").value = ""; $("file2").value = ""; $("drop1Text").textContent = "ছবি বেছে নিন"; $("drop2Text").textContent = "দ্বিতীয় ছবি বেছে নিন"; schedule();
  });

  function seg(id, key) {
    const el = $(id);
    const sync = () => el.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === String(state[key])));
    el.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state[key] = b.dataset.v; sync(); save(); schedule(); });
    sync();
  }
  seg("layouts", "layout"); seg("sizes", "size"); seg("align", "align"); seg("logoPos", "logoPos"); seg("hlStyle", "hlStyle");

  function bindText(id, key) { const el = $(id); el.value = state[key] ?? ""; el.addEventListener("input", () => { state[key] = el.value; if (key === "category") syncChips(); save(); schedule(); }); }
  ["headline", "sub", "qName", "qRole", "category", "credit", "site", "footer"].forEach((k) => bindText(k, k));
  function bindCheck(id, key) { const el = $(id); el.checked = !!state[key]; el.addEventListener("change", () => { state[key] = el.checked; save(); schedule(); }); }
  ["showDate", "bangabda", "gray"].forEach((k) => bindCheck(k, k));
  function bindRange(id, key) { const el = $(id); el.value = state[key]; el.addEventListener("input", () => { state[key] = +el.value; save(); schedule(); }); }
  bindRange("fs", "fs"); bindRange("bright", "bright"); bindRange("contrast", "contrast");
  bindRange("logoScale", "logoScale"); bindRange("catScale", "catScale");
  const tc = $("cText");
  const syncText = () => { tc.value = state.textColor || "#16161A"; $("textAuto").classList.toggle("on", !state.textColor); };
  tc.addEventListener("input", () => { state.textColor = tc.value; syncText(); save(); schedule(); });
  $("textAuto").addEventListener("click", () => { state.textColor = ""; syncText(); save(); schedule(); });
  syncText();
  $("date").value = state.date;
  $("date").addEventListener("input", (e) => { state.date = e.target.value || todayISO(); schedule(); });

  const chips = $("chips");
  CATS.forEach((c) => { const b = document.createElement("button"); b.type = "button"; b.textContent = c; b.addEventListener("click", () => { state.category = state.category === c ? "" : c; $("category").value = state.category; syncChips(); save(); schedule(); }); chips.appendChild(b); });
  function syncChips() { chips.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.textContent === state.category.trim())); }
  syncChips();

  const themes = $("themes");
  THEMES.forEach((t, i) => {
    const b = document.createElement("button"); b.type = "button"; b.title = t.name; b.setAttribute("aria-label", t.name);
    b.innerHTML = `<i style="background:${t.panel}"></i><i style="background:${t.accent}"></i><i style="background:${t.high}"></i>`;
    b.addEventListener("click", () => { Object.assign(state, { theme: i, panel: t.panel, accent: t.accent, high: t.high }); syncColors(); save(); schedule(); });
    themes.appendChild(b);
  });
  function syncColors() {
    $("cPanel").value = state.panel; $("cAccent").value = state.accent; $("cHigh").value = state.high;
    themes.querySelectorAll("button").forEach((b, i) => { const t = THEMES[i]; b.classList.toggle("on", t.panel.toLowerCase() === state.panel.toLowerCase() && t.accent.toLowerCase() === state.accent.toLowerCase() && t.high.toLowerCase() === state.high.toLowerCase()); });
  }
  [["cPanel", "panel"], ["cAccent", "accent"], ["cHigh", "high"]].forEach(([id, key]) => $(id).addEventListener("input", (e) => { state[key] = e.target.value; syncColors(); save(); schedule(); }));
  syncColors();

  $("newCard").addEventListener("click", () => {
    Object.assign(state, { headline: "", sub: "", qName: "", qRole: "", category: "", credit: "", date: todayISO() });
    ["headline", "sub", "qName", "qRole", "category", "credit"].forEach((k) => ($(k).value = ""));
    $("date").value = state.date; syncChips();
    $("removePhoto").click(); save(); schedule(); $("headline").focus();
  });

  function fileName(ext) {
    const words = (state.headline || "card").replace(/\*/g, "").replace(/[\\/:*?"<>|\n]/g, " ").trim().split(/\s+/).slice(0, 5).join("-");
    return `amar-bangla-${state.date}-${words || "card"}.${ext}`;
  }
  function download(type, ext, q) {
    render();
    cv.toBlob((blob) => {
      if (!blob) { toast("ছবি বানানো যায়নি। লিংক থেকে আনা ছবি হলে ছবিটা নামিয়ে আবার দিন।", true); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName(ext);
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("ডাউনলোড হয়েছে");
    }, type, q);
  }
  $("dlPng").addEventListener("click", () => download("image/png", "png"));
  $("dlJpg").addEventListener("click", () => download("image/jpeg", "jpg", 0.92));
  $("copyImg").addEventListener("click", async () => {
    try {
      render();
      const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("কপি হয়েছে, এখন ফেসবুকে Ctrl+V দিয়ে পেস্ট করুন");
    } catch (e) { toast("এই ব্রাউজারে কপি হয় না; ডাউনলোড বাটন ব্যবহার করুন।", true); }
  });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); download("image/png", "png"); } });

  let toastT = 0;
  function toast(msg, err) { const t = $("toast"); t.textContent = msg; t.style.color = err ? "#C8141B" : "#0a7a2f"; clearTimeout(toastT); toastT = setTimeout(() => (t.textContent = ""), 3500); }

  const q = new URLSearchParams(location.search);
  if (q.get("title")) { state.headline = q.get("title"); $("headline").value = state.headline; }
  if (q.get("sub")) { state.sub = q.get("sub"); $("sub").value = state.sub; }
  if (q.get("cat")) { state.category = q.get("cat"); $("category").value = state.category; syncChips(); }
  if (q.get("img")) loadPhotoUrl(q.get("img"));

  Promise.all([
    document.fonts.load(`800 60px "BN Digits"`, "১২৩৪৫৬৭৮৯০"),
    document.fonts.load(`600 30px "BN Digits"`, "১২৩৪৫৬৭৮৯০"),
    document.fonts.load(`800 60px "Baloo Da 2"`, "আমার বাংলা"),
    document.fonts.load(`700 60px "Baloo Da 2"`, "উক্তি"),
    document.fonts.load(`600 30px "Hind Siliguri"`, "তারিখ"),
    document.fonts.load(`700 26px "Archivo"`, "amarbangla.com")
  ]).catch(() => {}).finally(schedule);
  schedule();
})();
