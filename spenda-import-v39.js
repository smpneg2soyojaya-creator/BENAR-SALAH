(() => {
"use strict";

const XLSX_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
const MAMMOTH_URL = "https://unpkg.com/mammoth/mammoth.browser.min.js";

function loadScript(src, name) {
  return new Promise((resolve, reject) => {
    if (window[name]) return resolve(window[name]);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => window[name] ? resolve(window[name]) : reject(new Error(name + " gagal dimuat."));
    s.onerror = () => reject(new Error("Gagal memuat " + name + ". Pastikan internet aktif."));
    document.head.appendChild(s);
  });
}

const clean = v => String(v ?? "").replace(/\u00a0/g, " ").trim();
const hn = v => clean(v).toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\u00C0-\u024F]+/gu, "");

function valueByAliases(row, aliases) {
  const map = {};
  Object.keys(row || {}).forEach(k => map[hn(k)] = row[k]);
  for (const alias of aliases) {
    const v = map[hn(alias)];
    if (v !== undefined && clean(v) !== "") return v;
  }
  // Fuzzy fallback for headers such as "Kunci Jawaban (Benar/Salah)"
  const keys = Object.keys(map);
  for (const alias of aliases) {
    const a = hn(alias);
    const found = keys.find(k => k === a || k.includes(a) || a.includes(k));
    if (found && clean(map[found]) !== "") return map[found];
  }
  return "";
}

const split = x => clean(x).split(/\r?\n|\||;|\t/).map(clean).filter(Boolean);

function normalizeLevel(v, fallback="") {
  const s = clean(v || fallback);
  if (/\bsmp\b/i.test(s)) return "SMP";
  if (/\bsd\b/i.test(s)) return "SD";
  if (/\bsma\b/i.test(s)) return "SMA";
  return s;
}

function buildMeta(row, d) {
  return {
    teacher: clean(d?.teacher) || clean(valueByAliases(row, ["nama guru","guru","teacher","pengajar"])),
    subject: clean(d?.subject) || clean(valueByAliases(row, ["mata pelajaran","mapel","subject"])),
    level: normalizeLevel(d?.level, valueByAliases(row, ["jenjang","level sekolah","tingkat","level"])),
    className: clean(d?.className) || clean(valueByAliases(row, ["kelas","class","grade"])),
    difficulty: clean(d?.difficulty) || clean(valueByAliases(row, ["tingkat kesulitan","kesulitan","difficulty","level soal"])) || "Semua"
  };
}

function detectGameFromRows(matrix) {
  const games = ["benar-salah","gesture-battle","family-100","clash-of-champions"];
  let best = {game:null, score:0, row:-1};
  for (let i=0; i<Math.min(matrix.length, 100); i++) {
    const headers = (matrix[i] || []).map(clean);
    for (const game of games) {
      const score = headerScore(headers, game);
      if (score > best.score) best = {game, score, row:i};
    }
  }
  return best.game;
}

function headerScore(headers, game) {
  const hs = headers.map(hn);
  const aliases = {
    "benar-salah": [
      ["pernyataan","pernyataan/soal","soal","pertanyaan","question","statement","q"],
      ["kunci","kunci jawaban","jawaban","answer","correct"]
    ],
    "gesture-battle": [
      ["pertanyaan","pernyataan","soal","question","statement","q"],
      ["a","opsi a","jawaban a","answer a"],
      ["b","opsi b","jawaban b","answer b"],
      ["c","opsi c","jawaban c","answer c"],
      ["d","opsi d","jawaban d","answer d"],
      ["kunci","kunci jawaban","jawaban benar","correct","answer"]
    ],
    "family-100": [
      ["kategori","category","tema","bab"],
      ["pertanyaan","soal","question","statement","q"],
      ["jawaban1","jawaban 1","answer1","answer 1","opsi1","opsi 1"]
    ],
    "clash-of-champions": [
      ["pertanyaan","soal","question","statement","q"],
      ["jawaban","answer","kunci","correct"]
    ]
  }[game] || [];

  let score = 0;
  aliases.forEach(group => {
    if (group.some(a => hs.includes(hn(a)) || hs.some(h => h.includes(hn(a)) && hn(a).length >= 4))) score++;
  });
  return score;
}

function findHeaderRow(matrix, game) {
  let best = {index:-1, score:0};
  for (let i=0; i<Math.min(matrix.length, 100); i++) {
    const score = headerScore(matrix[i] || [], game);
    if (score > best.score) best = {index:i, score};
  }
  return best;
}

function matrixToObjects(matrix, game) {
  const rows = Array.isArray(matrix) ? matrix : [];
  const found = findHeaderRow(rows, game);

  if (found.index >= 0 && found.score >= 1) {
    const headers = (rows[found.index] || []).map((h,i) => clean(h) || `Kolom ${i+1}`);
    return {
      objects: rows.slice(found.index + 1)
        .map(r => {
          const o = {};
          headers.forEach((h,i) => o[h] = clean((r || [])[i]));
          return o;
        })
        .filter(o => Object.values(o).some(Boolean)),
      headerFound: true,
      headerIndex: found.index,
      headerScore: found.score
    };
  }

  // Positional fallback for the official templates.
  // Used only when the workbook/table has data but its header was altered.
  const nonEmpty = rows.filter(r => (r || []).some(x => clean(x)));
  if (nonEmpty.length) {
    const start = nonEmpty.findIndex(r => (r || []).length >= 2);
    const dataRows = start >= 0 ? nonEmpty.slice(start) : nonEmpty;
    if (game === "benar-salah") {
      return {
        objects: dataRows.map(r => ({
          "No": clean(r[0]),
          "Pernyataan": clean(r[1] ?? r[0]),
          "Kunci": clean(r[2] ?? "")
        })).filter(o => clean(o.Pernyataan) !== ""),
        headerFound:false, headerIndex:-1, headerScore:0
      };
    }
    if (game === "gesture-battle") {
      return {
        objects: dataRows.map(r => ({
          "No":clean(r[0]), "Pertanyaan":clean(r[1] ?? r[0]),
          "A":clean(r[2] ?? ""), "B":clean(r[3] ?? ""),
          "C":clean(r[4] ?? ""), "D":clean(r[5] ?? ""), "Kunci":clean(r[6] ?? "")
        })).filter(o => clean(o.Pertanyaan) !== ""),
        headerFound:false, headerIndex:-1, headerScore:0
      };
    }
    if (game === "clash-of-champions") {
      return {
        objects: dataRows.map(r => ({
          "No":clean(r[0]), "Pertanyaan":clean(r[1] ?? r[0]),
          "Jawaban":clean(r[2] ?? ""), "Kesulitan":clean(r[3] ?? "")
        })).filter(o => clean(o.Pertanyaan) !== ""),
        headerFound:false, headerIndex:-1, headerScore:0
      };
    }
  }

  return {objects:[], headerFound:false, headerIndex:-1, headerScore:0};
}

function convert(row, game, d={}) {
  const m = buildMeta(row, d);

  if (game === "benar-salah") {
    const statement = clean(valueByAliases(row, ["pernyataan","pernyataan/soal","soal","pertanyaan","question","statement","q"]));
    const raw = clean(valueByAliases(row, ["kunci jawaban","kunci","jawaban","answer","correct"])).toUpperCase();
    if (!statement) return {meta:m, question:null};
    const answer = /SALAH/.test(raw) ? "SALAH" : "BENAR";
    return {meta:m, question:{statement, answer}};
  }

  if (game === "gesture-battle") {
    const q = clean(valueByAliases(row, ["pertanyaan","pernyataan","soal","question","statement","q"]));
    const a = ["A","B","C","D"].map(x => clean(valueByAliases(row,[x,`opsi ${x}`,`jawaban ${x}`,`answer ${x}`])));
    const c = clean(valueByAliases(row, ["kunci","kunci jawaban","jawaban benar","correct","answer"])).toUpperCase();
    if (!q || a.some(v => !v)) return {meta:m, question:null};
    return {meta:m, question:{q,a,c:["A","B","C","D"].includes(c) ? c : "A",s:m.subject}};
  }

  if (game === "family-100") {
    const kategori = clean(valueByAliases(row, ["kategori","category","tema","bab"])) || "Tanpa Kategori";
    const pertanyaan = clean(valueByAliases(row, ["pertanyaan","soal","question","statement","q"]));
    const jawaban = [];
    for (let i=1;i<=10;i++) {
      const t = clean(valueByAliases(row,[`jawaban ${i}`,`jawaban${i}`,`answer ${i}`,`answer${i}`,`opsi ${i}`,`opsi${i}`]));
      if (!t) continue;
      const skor = Number(valueByAliases(row,[`skor ${i}`,`skor${i}`,`score ${i}`,`score${i}`])) || 0;
      const k = split(valueByAliases(row,[`kunci ${i}`,`kunci${i}`,`keyword ${i}`,`keyword${i}`])).map(x=>x.toLowerCase());
      jawaban.push({teks:t, skor, kunci:k.length ? k : [t.toLowerCase()]});
    }
    if (!jawaban.length) {
      const arr = split(valueByAliases(row,["jawaban","answers","opsi"]));
      arr.forEach(t=>jawaban.push({teks:t,skor:Math.round(100/Math.max(1,arr.length)),kunci:[t.toLowerCase()]}));
    }
    if (!pertanyaan || !jawaban.length) return {meta:m, question:null};
    return {meta:m, question:{kategori,pertanyaan,jawaban}};
  }

  if (game === "clash-of-champions") {
    const q = clean(valueByAliases(row, ["pertanyaan","soal","question","statement","q"]));
    const a = clean(valueByAliases(row, ["jawaban","answer","kunci","correct"]));
    const lvl = clean(valueByAliases(row, ["tingkat kesulitan","kesulitan","difficulty","level soal","level"])) || m.difficulty || "Sedang";
    if (!q || !a) return {meta:{...m,difficulty:lvl},question:null};
    return {meta:{...m,difficulty:lvl},question:{level:lvl,q,a}};
  }

  return {meta:m,question:row};
}

async function parseExcel(file, game) {
  await loadScript(XLSX_URL,"XLSX");
  const wb = XLSX.read(await file.arrayBuffer(), {type:"array", cellDates:false});
  let best = null;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(ws, {header:1, defval:"", raw:false});
    const actualGame = game || detectGameFromRows(matrix) || "benar-salah";
    const parsed = matrixToObjects(matrix, actualGame);

    if (!best || parsed.objects.length > best.objects.length) {
      best = {sheetName, game:actualGame, ...parsed};
    }
  }

  if (!best || !best.objects.length) {
    throw new Error("File Excel tidak berisi data soal. Isi soal pada sheet SOAL lalu simpan sebelum Import.");
  }

  return best.objects;
}

function parseWordTables(html, game) {
  const d = new DOMParser().parseFromString(html,"text/html");
  const tables = [...d.querySelectorAll("table")];
  let best = [];
  for (const t of tables) {
    const tr = [...t.querySelectorAll("tr")];
    if (tr.length < 1) continue;
    const matrix = tr.map(r => [...r.querySelectorAll("th,td")].map(c => clean(c.textContent)));
    const parsed = matrixToObjects(matrix, game);
    if (parsed.objects.length > best.length) best = parsed.objects;
  }
  return best;
}

async function parseWord(file, game) {
  await loadScript(MAMMOTH_URL,"mammoth");
  const ab = await file.arrayBuffer();
  const html = (await mammoth.convertToHtml({arrayBuffer:ab})).value;
  const tableRows = parseWordTables(html, game);
  if (tableRows.length) return tableRows;

  const raw = (await mammoth.extractRawText({arrayBuffer:ab})).value;
  const lines = raw.split(/\r?\n/).map(clean).filter(Boolean);
  if (!lines.length) return [];

  return lines.map(line => {
    const p = line.split(/\t|\||;/).map(clean);
    const o = {};
    if (game === "benar-salah") {
      o.No=p[0]||""; o.Pernyataan=p[1]||p[0]||""; o.Kunci=p[2]||"";
    } else if (game === "gesture-battle") {
      o.No=p[0]||""; o.Pertanyaan=p[1]||p[0]||""; ["A","B","C","D"].forEach((x,i)=>o[x]=p[i+2]||""); o.Kunci=p[6]||"";
    } else if (game === "clash-of-champions") {
      o.No=p[0]||""; o.Pertanyaan=p[1]||p[0]||""; o.Jawaban=p[2]||""; o.Kesulitan=p[3]||"";
    } else {
      p.forEach((x,i)=>o["Kolom "+(i+1)] = x);
    }
    return o;
  });
}

async function parseJSON(file) {
  const text = (await file.text()).replace(/^\uFEFF/,"");
  const obj = JSON.parse(text);
  return Array.isArray(obj) ? obj : (obj.questions || obj.data || obj.soal || obj.items || []);
}

async function parse(file, game) {
  const n = clean(file?.name).toLowerCase();
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv")) return parseExcel(file, game);
  if (n.endsWith(".docx")) return parseWord(file, game);
  if (n.endsWith(".json")) return parseJSON(file);
  throw new Error("Gunakan file .docx, .xlsx, .xls, .csv, atau .json.");
}

async function importFile(file, game, d={}) {
  if (!file) throw new Error("Pilih file soal terlebih dahulu.");
  const rows = await parse(file, game);
  const base = {
    game:clean(game),
    teacher:clean(d.teacher),
    level:normalizeLevel(d.level),
    className:clean(d.className),
    subject:clean(d.subject),
    difficulty:clean(d.difficulty) || "Semua"
  };

  if (!base.teacher || !base.level || !base.className || !base.subject) {
    throw new Error("Nama Guru, Jenjang, Kelas, dan Mapel wajib diisi.");
  }

  const converted = rows.map(r => convert(r, base.game, base)).filter(x => x && x.question);
  if (!converted.length) {
    throw new Error("Soal tidak terbaca. Pastikan template sesuai game dan kolom pertanyaan/soal terisi.");
  }

  const questions = converted.map(x => x.question);
  const saved = await SPENDADB.putBank(base, questions, "import");
  return {rows:questions.length, banks:1, saved};
}

window.SPENDAIMPORT = {parse, importFile};
})();