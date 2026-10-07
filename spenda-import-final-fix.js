(() => {
"use strict";
const XLSX_URL="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
const MAMMOTH_URL="https://unpkg.com/mammoth/mammoth.browser.min.js";
function loadScript(src,name){return new Promise((resolve,reject)=>{if(window[name]){resolve(window[name]);return}const s=document.createElement("script");s.src=src;s.onload=()=>window[name]?resolve(window[name]):reject(new Error(name+" gagal dimuat."));s.onerror=()=>reject(new Error("Gagal memuat "+name+". Pastikan internet aktif."));document.head.appendChild(s)})}
const hn=x=>String(x??"").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
function val(row,names){const m={};Object.keys(row||{}).forEach(k=>m[hn(k)]=row[k]);for(const n of names){const v=m[hn(n)];if(v!==undefined&&String(v).trim()!=="")return v}return""}
const split=x=>String(x??"").split(/\r?\n|\||;|\t/).map(s=>s.trim()).filter(Boolean);
function meta(row,d){
  // Metadata dari halaman Database Soal Guru adalah sumber utama.
  // Ini sengaja mengabaikan metadata lama di file agar soal selalu masuk ke
  // Game + Guru + Jenjang + Kelas + Mapel yang sedang dipilih guru.
  let level=String(d.level||val(row,["jenjang","level sekolah","level"])||"").trim();
  if(/^SMP\b/i.test(level)) level="SMP"; else if(/^SD\b/i.test(level)) level="SD"; else if(/^SMA\b/i.test(level)) level="SMA";
  return {
    teacher:String(d.teacher||val(row,["nama guru","guru","teacher","pengajar"])||"Umum").trim(),
    subject:String(d.subject||val(row,["mata pelajaran","mapel","subject"])||"").replace(/^(mata\s*pelajaran|mapel|subject)\s*[:\-]?\s*/i,"").trim(),
    level,
    className:String(d.className||val(row,["kelas","class","grade"])||"").trim(),
    difficulty:String(d.difficulty||val(row,["tingkat kesulitan","kesulitan","difficulty","level soal"])||"Sedang").trim()||"Semua"
  }
}
function convert(row,game,d={}){const m=meta(row,d);
if(game==="benar-salah"){const statement=String(val(row,["pernyataan","soal","pertanyaan","question","statement","q"])).trim();const raw=String(val(row,["kunci jawaban","kunci","jawaban","answer","correct"])).trim().toUpperCase();return{meta:m,question:{statement,answer:raw.includes("SALAH")?"SALAH":"BENAR"}}}
if(game==="gesture-battle"){const q=String(val(row,["pernyataan","soal","pertanyaan","question","statement","q"])).trim();const a=["A","B","C","D"].map(x=>String(val(row,[x,"opsi "+x,"jawaban "+x,"answer "+x])||"").trim());const c=String(val(row,["kunci","kunci jawaban","jawaban benar","correct","answer"])).trim().toUpperCase();return{meta:m,question:{q,a,c:["A","B","C","D"].includes(c)?c:"A",s:m.subject}}}
if(game==="family-100"){const kategori=String(val(row,["kategori","category","tema","bab"])||"Tanpa Kategori").trim();const pertanyaan=String(val(row,["pertanyaan","soal","question","statement","q"])).trim();const jawaban=[];for(let i=1;i<=10;i++){const t=String(val(row,[`jawaban ${i}`,`jawaban${i}`,`answer ${i}`,`answer${i}`,`opsi ${i}`,`opsi${i}`])||"").trim();if(!t)continue;const skor=Number(val(row,[`skor ${i}`,`skor${i}`,`score ${i}`,`score${i}`]))||0;const k=split(val(row,[`kunci ${i}`,`kunci${i}`,`keyword ${i}`,`keyword${i}`])).map(x=>x.toLowerCase());jawaban.push({teks:t,skor,kunci:k.length?k:[t.toLowerCase()]})}if(!jawaban.length){const arr=split(val(row,["jawaban","answers","opsi"]));arr.forEach(t=>jawaban.push({teks:t,skor:Math.round(100/Math.max(1,arr.length)),kunci:[t.toLowerCase()]}))}return{meta:m,question:{kategori,pertanyaan,jawaban}}}
if(game==="clash-of-champions"){const q=String(val(row,["pertanyaan","soal","question","statement","q"])).trim();const a=String(val(row,["jawaban","answer","kunci","correct"])).trim();const lvl=String(val(row,["tingkat kesulitan","kesulitan","difficulty","level soal","level"])||m.difficulty||"Sedang").trim();return{meta:{...m,difficulty:lvl},question:{level:lvl,q,a}}}
return{meta:m,question:row}}
function headerScore(headers,game){
  const hs=headers.map(h=>hn(h));
  const wanted={
    "benar-salah":["pernyataan","kunci"],
    "gesture-battle":["pertanyaan","a","b","c","d","kunci"],
    "family-100":["kategori","pertanyaan","jawaban1"],
    "clash-of-champions":["pertanyaan","jawaban"]
  }[game]||[];
  return wanted.reduce((n,w)=>n+(hs.includes(hn(w))?1:0),0);
}
function rowsFromSheetArray(matrix,game){
  const rows=Array.isArray(matrix)?matrix:[];
  let bestIndex=-1,bestScore=0;
  rows.slice(0,40).forEach((r,i)=>{const s=headerScore((r||[]).map(x=>String(x??"")),game);if(s>bestScore){bestScore=s;bestIndex=i;}});
  if(bestIndex<0 || bestScore<1) return [];
  const headers=(rows[bestIndex]||[]).map((h,i)=>String(h??"").trim()||("Kolom "+(i+1)));
  return rows.slice(bestIndex+1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=String((r||[])[i]??"").trim());return o}).filter(o=>Object.values(o).some(Boolean));
}
async function parseExcel(file,game){
  await loadScript(XLSX_URL,"XLSX");
  const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
  let best=[];
  wb.SheetNames.forEach(n=>{
    const matrix=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:""});
    const parsed=rowsFromSheetArray(matrix,game);
    if(parsed.length>best.length) best=parsed;
  });
  return best;
}
function parseWordTables(html,game){
  const d=new DOMParser().parseFromString(html,"text/html");
  const tables=[...d.querySelectorAll("table")]; let best=[];
  for(const t of tables){
    const tr=[...t.querySelectorAll("tr")]; if(tr.length<2) continue;
    const matrix=tr.map(r=>[...r.querySelectorAll("th,td")].map(c=>c.textContent.trim()));
    const parsed=rowsFromSheetArray(matrix,game); if(parsed.length>best.length) best=parsed;
  }
  return best;
}
async function parseWord(file,game){
  await loadScript(MAMMOTH_URL,"mammoth");
  const ab=await file.arrayBuffer();
  const h=(await mammoth.convertToHtml({arrayBuffer:ab})).value;
  const tableRows=parseWordTables(h,game);
  if(tableRows.length) return tableRows;
  const raw=(await mammoth.extractRawText({arrayBuffer:ab})).value;
  return raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const p=line.split(/\t|\||;/).map(x=>x.trim()),o={};
    p.forEach((x,i)=>o["Kolom "+(i+1)]=x); return o;
  });
}
async function parseJSON(file){const o=JSON.parse((await file.text()).replace(/^\uFEFF/,""));return Array.isArray(o)?o:(o.questions||o.data||o.soal||o.items||[])}
async function parse(file,game){const n=file.name.toLowerCase();if(n.endsWith(".docx"))return parseWord(file,game);if(n.endsWith(".xlsx")||n.endsWith(".xls"))return parseExcel(file,game);if(n.endsWith(".csv"))return parseExcel(file,game);if(n.endsWith(".json"))return parseJSON(file);throw new Error("Gunakan .docx, .xlsx/.xls, atau .json")}
async function importFile(file,game,d={}){
  const rows=await parse(file,game);
  const base={game,teacher:String(d.teacher||"").trim(),level:String(d.level||"").trim(),className:String(d.className||"").trim(),subject:String(d.subject||"").trim(),difficulty:String(d.difficulty||"Semua").trim()||"Semua"};
  if(!base.teacher||!base.level||!base.className||!base.subject) throw new Error("Nama Guru, Jenjang, Kelas, dan Mapel wajib diisi.");
  const cv=rows.map(r=>convert(r,game,base)).filter(x=>{const q=x.question;if(game==="benar-salah")return q.statement;if(game==="gesture-battle")return q.q&&q.a.every(Boolean);if(game==="family-100")return q.pertanyaan&&q.jawaban.length;if(game==="clash-of-champions")return q.q&&q.a;return true});
  if(!cv.length)throw new Error("Kolom soal tidak dikenali atau kosong.");
  const questions=cv.map(x=>x.question);
  const saved=[await SPENDADB.putBank(base,questions,"import")];
  return{rows:questions.length,banks:1,saved};
}
window.SPENDAIMPORT={parse,importFile};
})();