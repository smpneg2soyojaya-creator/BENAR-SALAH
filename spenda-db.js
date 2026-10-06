(() => {
  "use strict";

  const LOCAL_DB_NAME = "SPENDA_GAME_CENTER_CACHE";
  const LOCAL_DB_VERSION = 1;
  const STORE = "questionBanks";
  const FALLBACK_KEY = "SPENDA_GAME_CENTER_CACHE_FALLBACK_V1";
  let db = null, promise = null;

  const clean = v => String(v ?? "").trim();
  const norm = v => clean(v).toLowerCase().replace(/\s+/g, " ");
  const clone = v => {
    try { return structuredClone(v); }
    catch { return JSON.parse(JSON.stringify(v)); }
  };

  const romanMap = {i:"1",ii:"2",iii:"3",iv:"4",v:"5",vi:"6",vii:"7",viii:"8",ix:"9",x:"10",xi:"11",xii:"12"};
  function classNorm(v){
    let s = norm(v).replace(/^kelas\s*/, "").trim();
    s = s.replace(/\b(viii|vii|vi|iv|ix|xii|xi|x|v|iii|ii|i)\b/g, m => romanMap[m] || m);
    const nums = s.match(/\d+/g);
    return nums ? nums.join("") : s.replace(/[^0-9]/g, "");
  }
  function classMatch(a,b){
    if(!a || !b) return true;
    const aa=classNorm(a), bb=classNorm(b);
    if(aa===bb) return true;
    if(aa && bb && (aa.includes(bb) || bb.includes(aa))) return true;
    return norm(a)===norm(b);
  }
  function levelNorm(v){
    const s=norm(v).replace(/\(.*?\)/g," ");
    if(/\bsd\b/.test(s)) return "sd";
    if(/\bsmp\b/.test(s)) return "smp";
    if(/\bsma\b/.test(s)) return "sma";
    return s;
  }
  function subjectNorm(v){
    return norm(v).replace(/^(mata\s*pelajaran|mapel|subject)\s*[:\-]?\s*/i,"");
  }
  function sameTeacher(a,b){
    return !a || !b || norm(a)===norm(b);
  }
  function sameSubject(a,b){
    return !a || !b || subjectNorm(a)===subjectNorm(b);
  }
  function sameLevel(a,b){
    return !a || !b || levelNorm(a)===levelNorm(b);
  }

  function key(m){
    return [
      clean(m.game), clean(m.teacher || "Umum"), clean(m.level), clean(m.className),
      clean(m.subject), clean(m.difficulty || "Semua")
    ].join("||");
  }

  function readLocalFallback(){
    try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]"); }
    catch { return []; }
  }
  function writeLocalFallback(rows){
    try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows)); }
    catch {}
  }

  function openLocalDB(){
    return new Promise((resolve,reject)=>{
      if(!window.indexedDB){ reject(new Error("IndexedDB tidak tersedia.")); return; }
      const req=indexedDB.open(LOCAL_DB_NAME,LOCAL_DB_VERSION);
      req.onupgradeneeded=e=>{
        const d=e.target.result;
        if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:"id"});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error("Gagal membuka cache lokal."));
    });
  }

  async function init(){
    if(promise) return promise;
    promise=(async()=>{try{db=await openLocalDB();return true}catch{db=null;return false}})();
    return promise;
  }

  async function localAll(){
    await init();
    if(db){
      try{
        return await new Promise((resolve,reject)=>{
          const req=db.transaction(STORE,"readonly").objectStore(STORE).getAll();
          req.onsuccess=()=>resolve(req.result||[]);
          req.onerror=()=>reject(req.error);
        });
      }catch{}
    }
    return readLocalFallback();
  }

  async function localPut(meta,questions,source){
    await init();
    const row={
      id:key(meta),game:clean(meta.game),teacher:clean(meta.teacher)||"Umum",
      level:clean(meta.level),className:clean(meta.className),subject:clean(meta.subject),
      difficulty:clean(meta.difficulty)||"Semua",questions:clone(questions||[]),source:source||"cache",
      updatedAt:new Date().toISOString()
    };
    if(db){try{db.transaction(STORE,"readwrite").objectStore(STORE).put(row)}catch{}}
    const rows=readLocalFallback().filter(x=>x.id!==row.id).concat(row);
    writeLocalFallback(rows);
    return row;
  }

  async function localGet(meta){
    const rows=await localAll();
    const exact=rows.find(x=>x.id===key(meta));
    if(exact) return exact;
    const candidates=rows.filter(r=>
      norm(r.game)===norm(meta.game) && sameTeacher(r.teacher,meta.teacher||"Umum") &&
      sameLevel(r.level,meta.level) && classMatch(r.className,meta.className) && sameSubject(r.subject,meta.subject)
    );
    if(!candidates.length) return null;
    const d=norm(meta.difficulty||"Semua");
    const sameDiff=candidates.find(r=>d==="semua"||norm(r.difficulty)==d||norm(r.difficulty)==="semua");
    return sameDiff||candidates[0];
  }

  function filterRows(rows,filters,difficultyStrict){
    return rows.filter(r=>{
      if(filters.game && norm(r.game)!==norm(filters.game)) return false;
      if(filters.teacher && norm(filters.teacher)!=="semua guru" && !sameTeacher(r.teacher,filters.teacher)) return false;
      if(filters.level && !sameLevel(r.level,filters.level)) return false;
      if(filters.className && !classMatch(r.className,filters.className)) return false;
      if(filters.subject && norm(filters.subject)!=="semua mapel" && !sameSubject(r.subject,filters.subject)) return false;
      if(difficultyStrict && filters.difficulty && norm(filters.difficulty)!=="semua"){
        const rd=norm(r.difficulty||"Semua");
        if(rd!==norm(filters.difficulty) && rd!=="semua") return false;
      }
      return true;
    });
  }

  async function localQuestions(filters={}){
    const rows=await localAll();
    let matched=filterRows(rows,filters,true);
    if(!matched.length && filters.difficulty && norm(filters.difficulty)!=="semua") matched=filterRows(rows,{...filters,difficulty:""},false);
    const res=[],seen=new Set();
    matched.forEach(r=>(r.questions||[]).forEach(q=>{
      const s=JSON.stringify(q);
      if(!seen.has(s)){seen.add(s);res.push(clone(q));}
    }));
    return res;
  }

  async function localList(filters={}){
    const rows=await localAll();
    return rows.filter(r=>!filters.game||norm(r.game)===norm(filters.game)).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  }

  async function localRemove(meta){
    await init();
    const id=key(meta);
    if(db){try{db.transaction(STORE,"readwrite").objectStore(STORE).delete(id)}catch{}}
    writeLocalFallback(readLocalFallback().filter(x=>x.id!==id));
  }

  function cloudConfigured(){ return !!(window.SPENDA_CONFIG && clean(window.SPENDA_CONFIG.API_URL)); }

  async function cloudRequest(action,payload={},method="POST"){
    if(!cloudConfigured()) throw new Error("Database sekolah belum dikonfigurasi.");
    const cfg=window.SPENDA_CONFIG;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),Number(cfg.REQUEST_TIMEOUT_MS||15000));
    try{
      let res;
      if(method==="GET"){
        const u=new URL(cfg.API_URL);
        u.searchParams.set("action",action);u.searchParams.set("schoolId",cfg.SCHOOL_ID||"");u.searchParams.set("token",cfg.API_TOKEN||"");
        Object.entries(payload||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,typeof v==="string"?v:JSON.stringify(v))});
        res=await fetch(u.toString(),{method:"GET",cache:"no-store",signal:controller.signal});
      }else{
        const u=new URL(cfg.API_URL);
        res=await fetch(u.toString(),{method:"POST",mode:"cors",cache:"no-store",signal:controller.signal,headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({action,schoolId:cfg.SCHOOL_ID||"",token:cfg.API_TOKEN||""},payload||{}))});
      }
      const text=await res.text();
      let data;try{data=JSON.parse(text)}catch{throw new Error("Respons database sekolah tidak valid.")}
      if(!res.ok||data.ok===false)throw new Error(data.error||("HTTP "+res.status));
      return data;
    }finally{clearTimeout(timer)}
  }

  async function putBank(meta,questions,source="manual"){
    const row={game:clean(meta.game),teacher:clean(meta.teacher)||"Umum",level:clean(meta.level),className:clean(meta.className),subject:clean(meta.subject),difficulty:clean(meta.difficulty)||"Semua",questions:clone(questions||[]),source,updatedAt:new Date().toISOString()};
    if(cloudConfigured()){
      const r=await cloudRequest("upsert",{bank:row});
      const saved=Object.assign(row,r.bank||{});
      await localPut(saved,saved.questions,"cloud-cache");
      return saved;
    }
    return localPut(row,row.questions,source);
  }

  async function getBank(meta){
    if(cloudConfigured()){
      try{
        const r=await cloudRequest("getBank",{bankId:key(meta)},"GET");
        if(r.bank){await localPut(r.bank,r.bank.questions||[],"cloud-cache");return r.bank}
        return await localGet(meta);
      }catch(e){
        const local=await localGet(meta);if(local)return local;throw e;
      }
    }
    return localGet(meta);
  }

  async function getQuestionsStrict(filters={}){
    if(!cloudConfigured()) throw new Error("Database sekolah belum dikonfigurasi.");
    let r=await cloudRequest("getQuestions",{game:filters.game||"",teacher:filters.teacher||"",level:filters.level||"",className:filters.className||"",subject:filters.subject||"",difficulty:filters.difficulty||""},"GET");
    let questions=Array.isArray(r.questions)?r.questions:[];
    if(!questions.length && filters.difficulty && norm(filters.difficulty)!=="semua"){
      r=await cloudRequest("getQuestions",{game:filters.game||"",teacher:filters.teacher||"",level:filters.level||"",className:filters.className||"",subject:filters.subject||"",difficulty:""},"GET");
      questions=Array.isArray(r.questions)?r.questions:[];
    }
    return questions;
  }

  async function getQuestions(filters={}){
    if(cloudConfigured()){
      try{
        // 1) Cari persis sesuai game + guru + mapel + jenjang + kelas + kesulitan.
        let r=await cloudRequest("getQuestions",{game:filters.game||"",teacher:filters.teacher||"",level:filters.level||"",className:filters.className||"",subject:filters.subject||"",difficulty:filters.difficulty||""},"GET");
        let questions=Array.isArray(r.questions)?r.questions:[];
        // 2) Jika kesulitan yang dipilih belum memiliki bank tersimpan,
        //    jangan menghilangkan soal yang sebenarnya cocok. Ambil semua
        //    tingkat kesulitan dari guru/mapel/kelas yang sama.
        if(!questions.length && filters.difficulty && norm(filters.difficulty)!=="semua"){
          r=await cloudRequest("getQuestions",{game:filters.game||"",teacher:filters.teacher||"",level:filters.level||"",className:filters.className||"",subject:filters.subject||"",difficulty:""},"GET");
          questions=Array.isArray(r.questions)?r.questions:[];
        }
        return questions;
      }catch(e){
        const cached=await localQuestions(filters);if(cached.length)return cached;throw e;
      }
    }
    return localQuestions(filters);
  }

  async function listBanks(filters={}){
    if(cloudConfigured()){
      try{const r=await cloudRequest("listBanks",{game:filters.game||""},"GET");return Array.isArray(r.banks)?r.banks:[]}
      catch(e){const cached=await localList(filters);if(cached.length)return cached;throw e}
    }
    return localList(filters);
  }

  async function listTeachers(game=""){
    if(cloudConfigured()){
      try{const r=await cloudRequest("listTeachers",{game:game||""},"GET");return Array.isArray(r.teachers)?r.teachers:[]}
      catch(e){const rows=await localList(game?{game}:{});return [...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher||"Umum"))].sort((a,b)=>a.localeCompare(b,"id"))}
    }
    const rows=await localList(game?{game}:{});return [...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher||"Umum"))].sort((a,b)=>a.localeCompare(b,"id"));
  }

  async function remove(meta){
    if(cloudConfigured()){
      const r=await cloudRequest("delete",{bankId:key(meta)});await localRemove(meta);return r;
    }
    return localRemove(meta);
  }

  window.SPENDADB={
    DB_NAME:"SPENDA_CENTRAL_QUESTION_DATABASE",
    init,putBank,getBank,getQuestions,getQuestionsStrict,listBanks,listTeachers,remove,
    key,norm,clean,cloudConfigured,classMatch,sameSubject,sameLevel
  };
})();
