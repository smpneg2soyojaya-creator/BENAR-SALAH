(() => {
"use strict";

/* ================================================================
   SPENDA IMPORT — versi perbaikan
   - Game dikenali dari HEADER FILE (bukan hanya dari dropdown), sehingga
     template yang tidak sesuai dengan game terpilih terdeteksi & dijelaskan.
   - Tidak ada lagi data salah yang masuk diam-diam (kunci kosong/invalid
     tidak lagi dianggap "BENAR" / "A"; baris seperti itu dilewati & dihitung).
   - Library Excel/Word punya beberapa sumber CDN cadangan.
   - CSV dibaca sebagai teks UTF-8 (pemisah koma / titik-koma / tab).
   - Pesan error menyebut sheet & header yang ditemukan.
   ================================================================ */

const XLSX_URLS = [
  "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];
const MAMMOTH_URLS = [
  "https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js",
  "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"
];
const LABEL = {
  "benar-salah": "BENAR / SALAH",
  "gesture-battle": "GESTURE BATTLE EDU",
  "family-100": "SPENDA FAMILY 100",
  "clash-of-champions": "CLASH OF CHAMPIONS",
  "estafet-soal": "ESTAFET SOAL"
};

/* ---------- util ---------- */
function loadOne(src, name) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => window[name] ? resolve(window[name]) : reject(new Error("tidak aktif"));
    s.onerror = () => { s.remove(); reject(new Error("gagal dimuat")); };
    document.head.appendChild(s);
  });
}
async function loadLib(urls, name) {
  if (window[name]) return window[name];
  for (const u of urls) { try { return await loadOne(u, name); } catch (e) { /* coba sumber berikutnya */ } }
  throw new Error("Gagal memuat library " + name + ". Pastikan internet aktif (atau coba jaringan lain), lalu muat ulang halaman.");
}
const clean = x => String(x ?? "").replace(/[\u00a0\u200b\ufeff]/g, " ").replace(/\s+/g, " ").trim();
const hn = x => clean(x).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
function val(row, names) {
  const m = {};
  Object.keys(row || {}).forEach(k => { const key = hn(k); if (!(key in m)) m[key] = row[k]; });
  for (const n of names) {
    const v = m[hn(n)];
    if (v !== undefined && clean(v) !== "") return v;
  }
  return "";
}
const splitKeys = x => String(x ?? "").split(/\r?\n|\||;|,|\t/).map(s => s.trim()).filter(Boolean);

/* ---------- pengenalan header ---------- */
const Q_NAMES = ["pernyataan", "pertanyaan", "soal", "question", "statement", "q"];
function detectFromHeaders(headers) {
  const set = new Set(headers.map(hn).filter(Boolean));
  const has = (...n) => n.some(x => set.has(x));
  const hasQ = has(...Q_NAMES);
  if (has("jawaban1", "answer1", "opsi1")) return hasQ || has("kategori", "category") ? "family-100" : null;
  const abcd = ["a", "b", "c", "d"].every(l => set.has(l) || set.has("opsi" + l) || set.has("jawaban" + l) || set.has("answer" + l));
  // Template Estafet memakai kolom identitas Game agar tidak tertukar dengan Gesture.
  if (hasQ && abcd && has("game", "jenis game", "kode game")) return "estafet-soal";
  if (hasQ && abcd) return "gesture-battle";
  if (has("pernyataan", "statement") || (hasQ && has("kunci", "kuncijawaban"))) return "benar-salah";
  if (hasQ && has("jawaban", "answer")) return "clash-of-champions";
  return null;
}

/* Cari baris header di 40 baris pertama, ubah baris di bawahnya jadi objek. */
function readMatrix(matrix) {
  const rows = Array.isArray(matrix) ? matrix : [];
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = (rows[i] || []).map(clean);
    const detected = detectFromHeaders(cells);
    if (!detected) continue;
    const headers = cells.map((h, k) => h || ("Kolom " + (k + 1)));
    const data = rows.slice(i + 1).map(r => {
      const o = {};
      headers.forEach((h, k) => { o[h] = clean((r || [])[k]); });
      return o;
    }).filter(o => Object.values(o).some(Boolean));
    return { detected, headers: cells.filter(Boolean), rows: data };
  }
  return null;
}

/* ---------- pembacaan file ---------- */
async function readExcel(file) {
  const X = await loadLib(XLSX_URLS, "XLSX");
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const wb = isCsv
    ? X.read((await file.text()).replace(/^\ufeff/, ""), { type: "string" })
    : X.read(await file.arrayBuffer(), { type: "array" });
  const found = [], sheetsSeen = [];
  wb.SheetNames.forEach(n => {
    const matrix = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", blankrows: false });
    sheetsSeen.push(n);
    const r = readMatrix(matrix);
    if (r) found.push({ sheet: n, ...r });
  });
  return { found, sheetsSeen };
}
async function readWord(file) {
  const M = await loadLib(MAMMOTH_URLS, "mammoth");
  const html = (await M.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const found = [], sheetsSeen = [];
  [...doc.querySelectorAll("table")].forEach((t, i) => {
    const matrix = [...t.querySelectorAll("tr")].map(tr =>
      [...tr.querySelectorAll("th,td")].map(c => c.textContent));
    sheetsSeen.push("Tabel " + (i + 1));
    const r = readMatrix(matrix);
    if (r) found.push({ sheet: "Tabel " + (i + 1), ...r });
  });
  return { found, sheetsSeen };
}
async function readJSON(file) {
  const o = JSON.parse((await file.text()).replace(/^\ufeff/, ""));
  const rows = Array.isArray(o) ? o : (o.questions || o.data || o.soal || o.items || []);
  return { found: [{ sheet: "JSON", detected: null, headers: [], rows }], sheetsSeen: ["JSON"] };
}
async function readFile(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith(".docx")) return readWord(file);
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv")) return readExcel(file);
  if (n.endsWith(".json")) return readJSON(file);
  throw new Error("Format file tidak didukung. Gunakan .docx, .xlsx/.xls, .csv, atau .json");
}

/* ---------- konversi baris -> soal ---------- */
function meta(row, d) {
  let level = clean(d.level || val(row, ["jenjang", "level sekolah", "level"]));
  if (/^SMP\b/i.test(level)) level = "SMP"; else if (/^SD\b/i.test(level)) level = "SD"; else if (/^SMA\b/i.test(level)) level = "SMA";
  return {
    teacher: clean(d.teacher || val(row, ["nama guru", "guru", "teacher", "pengajar"]) || "Umum"),
    subject: clean(d.subject || val(row, ["mata pelajaran", "mapel", "subject"])).replace(/^(mata\s*pelajaran|mapel|subject)\s*[:\-]?\s*/i, ""),
    level,
    className: clean(d.className || val(row, ["kelas", "class", "grade"])),
    difficulty: clean(d.difficulty || val(row, ["tingkat kesulitan", "kesulitan", "difficulty", "level soal"]) || "Sedang") || "Semua"
  };
}
function normDifficulty(x, fallback) {
  const t = clean(x).toLowerCase();
  if (/^(mudah|easy|1)$/.test(t)) return "Mudah";
  if (/^(sedang|medium|2)$/.test(t)) return "Sedang";
  if (/^(sulit|susah|hard|3)$/.test(t)) return "Sulit";
  return fallback || "Sedang";
}
function normTF(raw) {
  const t = clean(raw).toUpperCase();
  if (!t) return null;
  if (/SALAH|FALSE|^S$|^F$|TIDAK|^NO$/.test(t)) return "SALAH";
  if (/BENAR|TRUE|^B$|^T$|^YA$|^YES$/.test(t)) return "BENAR";
  return null;
}
function convert(row, game, d) {
  const m = meta(row, d);
  if (game === "benar-salah") {
    const statement = clean(val(row, Q_NAMES));
    const answer = normTF(val(row, ["kunci jawaban", "kunci", "jawaban", "answer", "correct"]));
    return { meta: m, ok: !!(statement && answer), question: { statement, answer } };
  }
  if (game === "gesture-battle") {
    const q = clean(val(row, Q_NAMES));
    const a = ["A", "B", "C", "D"].map(x => clean(val(row, [x, "opsi " + x, "jawaban " + x, "answer " + x])));
    let c = clean(val(row, ["kunci", "kunci jawaban", "jawaban benar", "correct", "answer"])).toUpperCase();
    let letter = (c.match(/^([A-D])(?:[\s.\):]|$)/) || [])[1];
    if (!letter) { const i = a.findIndex(x => x && x.toUpperCase() === c); if (i >= 0) letter = "ABCD"[i]; }
    return { meta: m, ok: !!(q && a.every(Boolean) && letter), question: { q, a, c: letter || "A", s: m.subject } };
  }
  if (game === "family-100") {
    const kategori = clean(val(row, ["kategori", "category", "tema", "bab"])) || "Tanpa Kategori";
    const pertanyaan = clean(val(row, Q_NAMES));
    const jawaban = [];
    for (let i = 1; i <= 10; i++) {
      const t = clean(val(row, [`jawaban ${i}`, `jawaban${i}`, `answer ${i}`, `answer${i}`, `opsi ${i}`, `opsi${i}`]));
      if (!t) continue;
      const skor = Number(String(val(row, [`skor ${i}`, `skor${i}`, `score ${i}`, `score${i}`])).replace(",", ".")) || 0;
      const k = splitKeys(val(row, [`kunci ${i}`, `kunci${i}`, `keyword ${i}`, `keyword${i}`])).map(x => x.toLowerCase());
      jawaban.push({ teks: t, skor, kunci: k.length ? k : [t.toLowerCase()] });
    }
    if (jawaban.length && jawaban.every(j => !j.skor)) {
      const each = Math.round(100 / jawaban.length);
      jawaban.forEach(j => { j.skor = each; });
    }
    return { meta: m, ok: !!(pertanyaan && jawaban.length), question: { kategori, pertanyaan, jawaban } };
  }
  if (game === "clash-of-champions") {
    const q = clean(val(row, Q_NAMES));
    const a = clean(val(row, ["jawaban", "answer", "kunci", "correct"]));
    const lvl = normDifficulty(val(row, ["tingkat kesulitan", "kesulitan", "difficulty", "level soal", "level"]), normDifficulty(m.difficulty, "Sedang"));
    return { meta: { ...m, difficulty: lvl }, ok: !!(q && a), question: { level: lvl, q, a } };
  }
  if (game === "estafet-soal") {
    const q = clean(val(row, Q_NAMES));
    const a = ["A", "B", "C", "D"].map(x => clean(val(row, [x, "opsi " + x, "jawaban " + x, "answer " + x])));
    let c = clean(val(row, ["kunci", "kunci jawaban", "jawaban benar", "correct", "answer"])).toUpperCase();
    let letter = (c.match(/^([A-D])(?:[\s.\):]|$)/) || [])[1];
    if (!letter) {
      const i = a.findIndex(x => x && x.toUpperCase() === c);
      if (i >= 0) letter = "ABCD"[i];
    }
    return { meta: m, ok: !!(q && a.every(Boolean) && letter), question: { q, a, c: letter || "A" } };
  }
  return { meta: m, ok: true, question: row };
}

const listCols = h => h.length > 8 ? h.slice(0, 6).join(", ") + ", … (" + h.length + " kolom)" : h.join(", ");

/* ---------- API publik ---------- */
async function detect(file) {
  const r = await readFile(file);
  const hit = r.found.find(f => f.detected && f.rows.length) || r.found.find(f => f.detected);
  return hit ? hit.detected : null;
}
async function parse(file, game) {
  const r = await readFile(file);
  const pick = r.found.filter(f => !f.detected || !game || f.detected === game).sort((a, b) => b.rows.length - a.rows.length)[0];
  return pick ? pick.rows : [];
}
async function importFile(file, game, d = {}) {
  const base = {
    game,
    teacher: clean(d.teacher), level: clean(d.level), className: clean(d.className), subject: clean(d.subject),
    difficulty: clean(d.difficulty || "Semua") || "Semua"
  };
  if (!base.teacher || !base.level || !base.className || !base.subject)
    throw new Error("Nama Guru, Jenjang, Kelas, dan Mapel wajib diisi.");

  const r = await readFile(file);
  const withHeader = r.found.filter(f => f.detected !== undefined);

  // Pilih tabel/sheet: utamakan yang sesuai dengan game terpilih dan berisi baris.
  let pick = withHeader.filter(f => (!f.detected || f.detected === game) && f.rows.length)
                       .sort((a, b) => b.rows.length - a.rows.length)[0];

  if (!pick) {
    const other = withHeader.filter(f => f.detected && f.detected !== game)[0];
    if (other) {
      throw new Error(
        `File ini adalah template ${LABEL[other.detected]}, tetapi Game yang dipilih adalah ${LABEL[game]}. ` +
        `Ubah pilihan Game menjadi "${LABEL[other.detected]}" lalu import ulang.`);
    }
    const emptyHeader = withHeader.find(f => f.detected === game);
    if (emptyHeader) {
      throw new Error(
        `Template ${LABEL[game]} terbaca (sheet "${emptyHeader.sheet}", kolom: ${listCols(emptyHeader.headers)}) ` +
        `tetapi belum ada baris soal yang terisi di bawah header. Isi soal mulai baris ke-2, lalu simpan dan import ulang.`);
    }
    throw new Error(
      `Header kolom tidak dikenali untuk ${LABEL[game]}. Sheet/tabel yang diperiksa: ${r.sheetsSeen.join(", ") || "-"}. ` +
      `Jangan ubah nama kolom pada template. Contoh Estafet: No | Pertanyaan | A | B | C | D | Kunci | Kesulitan | Game.`);
  }

  const conv = pick.rows.map(row => convert(row, game, base));
  const valid = conv.filter(x => x.ok);
  const skipped = conv.length - valid.length;
  if (!valid.length) {
    throw new Error(
      `Ada ${conv.length} baris di sheet "${pick.sheet}", tetapi tidak ada yang valid. ` +
      (game === "benar-salah" ? "Pastikan kolom Kunci berisi BENAR atau SALAH. " :
       game === "gesture-battle" ? "Pastikan opsi A–D terisi semua dan Kunci berisi A/B/C/D. " :
       game === "family-100" ? "Pastikan Pertanyaan dan minimal Jawaban1 terisi. " :
       "Pastikan kolom Pertanyaan dan Jawaban terisi. ") +
      `Kolom terbaca: ${listCols(pick.headers)}.`);
  }
  const questions = valid.map(x => x.question);
  const saved = [await SPENDADB.putBank(base, questions, "import")];
  return { rows: questions.length, skipped, banks: 1, saved, sheet: pick.sheet };
}

window.SPENDAIMPORT = { parse, importFile, detect, LABEL };
})();
