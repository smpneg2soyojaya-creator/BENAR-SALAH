(() => {
  "use strict";

  // ================================================================
  // SPENDA GAME CENTER — SUPABASE DATABASE ADAPTER V17
  // Interface dipertahankan untuk semua game yang sudah ada.
  // ================================================================

  const LOCAL_DB_NAME = "SPENDA_GAME_CENTER_CACHE";
  const LOCAL_DB_VERSION = 2;
  const STORE = "questionBanks";
  const FALLBACK_KEY = "SPENDA_GAME_CENTER_CACHE_FALLBACK_V2";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const TABLE_DEFAULT = "question_banks";
  const PROFILE_TABLE_DEFAULT = "teacher_profiles";
  const MASTER_TABLE_DEFAULT = "teacher_master";
  const ASSIGNMENT_TABLE_DEFAULT = "teacher_assignments";

  let localDb = null;
  let localPromise = null;
  let supabaseClient = null;
  let supabasePromise = null;

  const clean = v => String(v ?? "").trim();
  const norm = v => clean(v).toLowerCase().replace(/\s+/g, " ");
  const clone = v => {
    try { return structuredClone(v); }
    catch { return JSON.parse(JSON.stringify(v)); }
  };

  const romanMap = {
    i:"1",ii:"2",iii:"3",iv:"4",v:"5",vi:"6",vii:"7",viii:"8",ix:"9",x:"10",xi:"11",xii:"12"
  };

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

  function sameSubject(a,b){
    return !a || !b || norm(a).replace(/^(mata\s*pelajaran|mapel|subject)\s*[:\-]?\s*/i,"") ===
      norm(b).replace(/^(mata\s*pelajaran|mapel|subject)\s*[:\-]?\s*/i,"");
  }
  function sameLevel(a,b){ return !a || !b || levelNorm(a)===levelNorm(b); }
  function sameTeacher(a,b){ return !a || !b || norm(a)===norm(b); }

  function levelCanonical(v){
    const s=norm(v);
    if(/\bsd\b/.test(s)) return "SD";
    if(/\bsmp\b/.test(s)) return "SMP";
    if(/\bsma\b/.test(s)) return "SMA";
    return clean(v);
  }

  function canonicalMeta(meta={}){
    return {
      school_id: clean(meta.school_id || meta.schoolId || window.SPENDA_CONFIG?.SCHOOL_ID || "SMPN2SOYOJAYA"),
      game: clean(meta.game),
      teacher: clean(meta.teacher) || "Umum",
      teacher_user_id: clean(meta.teacher_user_id || meta.teacherUserId),
      level: levelCanonical(meta.level),
      class_name: clean(meta.className || meta.class_name),
      subject: clean(meta.subject),
      difficulty: clean(meta.difficulty) || "Semua"
    };
  }

  function key(m){
    const x=canonicalMeta(m);
    return [x.school_id,x.game,x.teacher_user_id || x.teacher,x.level,x.class_name,x.subject,x.difficulty].join("||");
  }

  function fromRow(row){
    if(!row) return null;
    return {
      id: row.id,
      school_id: clean(row.school_id),
      game: clean(row.game),
      teacher: clean(row.teacher) || "Umum",
      teacher_user_id: clean(row.teacher_user_id),
      level: clean(row.level),
      className: clean(row.class_name ?? row.className),
      subject: clean(row.subject),
      difficulty: clean(row.difficulty) || "Semua",
      questions: clone(Array.isArray(row.questions) ? row.questions : []),
      source: clean(row.source) || "supabase",
      createdAt: row.created_at || row.createdAt || null,
      updatedAt: row.updated_at || row.updatedAt || null
    };
  }

  function toRow(meta,questions,source="manual",teacherUserId=""){
    const m=canonicalMeta(meta);
    return {
      school_id:m.school_id,
      game:m.game,
      teacher:m.teacher,
      teacher_user_id:clean(teacherUserId || m.teacher_user_id),
      level:m.level,
      class_name:m.class_name,
      subject:m.subject,
      difficulty:m.difficulty,
      questions:clone(Array.isArray(questions)?questions:[]),
      source:source || "manual"
    };
  }

  // ---------------------------------------------------------------
  // LOCAL CACHE — hanya cadangan/offline
  // ---------------------------------------------------------------
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

  async function localInit(){
    if(localPromise) return localPromise;
    localPromise=(async()=>{try{localDb=await openLocalDB();return true}catch{localDb=null;return false}})();
    return localPromise;
  }

  async function localAll(){
    await localInit();
    if(localDb){
      try{
        return await new Promise((resolve,reject)=>{
          const req=localDb.transaction(STORE,"readonly").objectStore(STORE).getAll();
          req.onsuccess=()=>resolve(req.result||[]);
          req.onerror=()=>reject(req.error);
        });
      }catch{}
    }
    return readLocalFallback();
  }

  async function localPut(meta,questions,source="cache"){
    const row={
      id:key(meta),
      ...canonicalMeta(meta),
      questions:clone(Array.isArray(questions)?questions:[]),
      source,
      updatedAt:new Date().toISOString()
    };
    await localInit();
    if(localDb){try{localDb.transaction(STORE,"readwrite").objectStore(STORE).put(row);}catch{}}
    const rows=readLocalFallback().filter(x=>x.id!==row.id).concat(row);
    writeLocalFallback(rows);
    return fromRow(row);
  }

  async function localList(filters={}){
    const rows=await localAll();
    return rows.filter(r=>{
      if(filters.game && norm(r.game)!==norm(filters.game)) return false;
      if(filters.teacher && !sameTeacher(r.teacher,filters.teacher)) return false;
      if(filters.level && !sameLevel(r.level,filters.level)) return false;
      if(filters.className && !classMatch(r.className,filters.className)) return false;
      if(filters.subject && !sameSubject(r.subject,filters.subject)) return false;
      if(filters.difficulty && norm(filters.difficulty)!=="semua"){
        const d=norm(r.difficulty||"Semua");
        if(d!==norm(filters.difficulty) && d!=="semua") return false;
      }
      return true;
    }).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  }

  async function localGet(meta){
    const rows=await localList({
      game:meta.game,teacher:meta.teacher,level:meta.level,className:meta.className,subject:meta.subject,difficulty:meta.difficulty
    });
    const exact=rows.find(x=>x.id===key(meta));
    return exact?fromRow(exact):(rows[0]?fromRow(rows[0]):null);
  }

  async function localQuestions(filters={}){
    const rows=await localList(filters);
    const out=[],seen=new Set();
    rows.forEach(r=>(r.questions||[]).forEach(q=>{
      const s=JSON.stringify(q);
      if(!seen.has(s)){seen.add(s);out.push(clone(q));}
    }));
    return out;
  }

  async function localRemove(meta){
    const id=key(meta);
    await localInit();
    if(localDb){try{localDb.transaction(STORE,"readwrite").objectStore(STORE).delete(id);}catch{}}
    writeLocalFallback(readLocalFallback().filter(x=>x.id!==id));
  }

  // ---------------------------------------------------------------
  // SUPABASE
  // ---------------------------------------------------------------
  function configured(){
    const c=window.SPENDA_CONFIG||{};
    const url=clean(c.SUPABASE_URL);
    const keyValue=clean(c.SUPABASE_PUBLISHABLE_KEY||c.SUPABASE_KEY||c.SUPABASE_ANON_KEY);
    return !!(url && keyValue && !/YOUR_PROJECT_REF|xxxxxxxx/i.test(url+" "+keyValue));
  }

  function loadSupabaseScript(){
    if(window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-spenda-supabase="1"]');
      if(existing){
        existing.addEventListener("load",()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error("Supabase client tidak tersedia.")),{once:true});
        existing.addEventListener("error",()=>reject(new Error("Gagal memuat Supabase JS.")),{once:true});
        return;
      }
      const s=document.createElement("script");
      s.src=SUPABASE_CDN;s.async=true;s.dataset.spendaSupabase="1";
      s.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error("Supabase client tidak tersedia."));
      s.onerror=()=>reject(new Error("Gagal memuat library Supabase. Pastikan internet aktif."));
      document.head.appendChild(s);
    });
  }

  async function getClient(){
    if(!configured()) throw new Error("Supabase belum dikonfigurasi di config.js.");
    if(supabaseClient) return supabaseClient;
    if(supabasePromise) return supabasePromise;
    supabasePromise=(async()=>{
      const lib=await loadSupabaseScript();
      const c=window.SPENDA_CONFIG||{};
      supabaseClient=lib.createClient(
        clean(c.SUPABASE_URL),
        clean(c.SUPABASE_PUBLISHABLE_KEY||c.SUPABASE_KEY||c.SUPABASE_ANON_KEY),
        {
          auth:{
            persistSession:c.AUTH_PERSIST_SESSION!==false,
            autoRefreshToken:c.AUTH_AUTO_REFRESH_TOKEN!==false,
            detectSessionInUrl:true
          },
          global:{headers:{"x-spenda-school-id":clean(c.SCHOOL_ID||"SMPN2SOYOJAYA")}}
        }
      );
      return supabaseClient;
    })();
    return supabasePromise;
  }

  async function withTimeout(promise,ms){
    const timeout=Number(ms||window.SPENDA_CONFIG?.REQUEST_TIMEOUT_MS||8000);
    let t;
    try{
      return await Promise.race([
        promise,
        new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error("Waktu koneksi database habis.")),timeout)})
      ]);
    }finally{clearTimeout(t);}
  }

  function dbError(error){
    if(!error) return null;
    const msg=error.message||error.details||error.hint||String(error);
    if(/row-level security|permission denied|not allowed/i.test(msg)){
      return new Error("Akses Supabase ditolak. Pastikan login guru dan RLS question_banks sudah benar.");
    }
    if(/relation .* does not exist|could not find.*question_banks/i.test(msg)){
      return new Error("Tabel question_banks belum dibuat di Supabase.");
    }
    return new Error(msg);
  }

  const TABLE=()=>clean(window.SPENDA_CONFIG?.TABLE)||TABLE_DEFAULT;
  const PROFILE_TABLE=()=>clean(window.SPENDA_CONFIG?.PROFILE_TABLE)||PROFILE_TABLE_DEFAULT;
  const MASTER_TABLE=()=>clean(window.SPENDA_CONFIG?.MASTER_TABLE)||MASTER_TABLE_DEFAULT;
  const ASSIGNMENT_TABLE=()=>clean(window.SPENDA_CONFIG?.ASSIGNMENT_TABLE)||ASSIGNMENT_TABLE_DEFAULT;

  // ---------------------------------------------------------------
  // AUTH GURU
  // ---------------------------------------------------------------
  async function authGetSession(){
    const c=await getClient();
    const {data,error}=await withTimeout(c.auth.getSession());
    if(error) throw dbError(error);
    return data?.session||null;
  }

  async function authGetUser(){
    const c=await getClient();
    const {data,error}=await withTimeout(c.auth.getUser());
    if(error) throw dbError(error);
    return data?.user||null;
  }

  async function authSignIn(email,password){
    const c=await getClient();
    const {data,error}=await withTimeout(c.auth.signInWithPassword({email:clean(email),password:String(password||"")}));
    if(error) throw dbError(error);
    return data;
  }

  async function getTeacherLoginList(){
    const c=client();
    if(!c) throw new Error("Supabase belum dikonfigurasi.");
    const {data,error}=await withTimeout(c.rpc("get_spenda_teacher_login_list", {p_school_id: SCHOOL_ID()}));
    if(error) throw error;
    return Array.isArray(data)?data:[];
  }

  async function authSignOut(){
    const c=await getClient();
    const {error}=await withTimeout(c.auth.signOut());
    if(error) throw dbError(error);
  }

  function authOnChange(callback){
    let subscription=null;
    getClient().then(c=>{
      const r=c.auth.onAuthStateChange((event,session)=>callback?.(event,session));
      subscription=r?.data?.subscription||null;
    }).catch(()=>{});
    return {unsubscribe:()=>subscription?.unsubscribe?.()};
  }

  async function getTeacherProfile(){
    const session=await authGetSession();
    if(!session?.user) return null;
    const c=await getClient();
    const {data,error}=await withTimeout(
      c.from(PROFILE_TABLE()).select("user_id,school_id,teacher_master_id,full_name,email,nip,no_hp,role,active,created_at,updated_at")
        .eq("user_id",session.user.id).eq("school_id",window.SPENDA_CONFIG?.SCHOOL_ID||"SMPN2SOYOJAYA").limit(1).maybeSingle()
    );
    if(error) throw dbError(error);
    return data||null;
  }

  async function getMyAssignments(){
    const session=await authGetSession();
    if(!session?.user) throw new Error("Silakan login sebagai Guru terlebih dahulu.");
    const c=await getClient();
    const {data,error}=await withTimeout(
      c.from(ASSIGNMENT_TABLE()).select("id,teacher_user_id,subject,level,class_name,active,created_at,updated_at")
        .eq("teacher_user_id",session.user.id).eq("active",true)
        .order("level").order("subject").order("class_name")
    );
    if(error) throw dbError(error);
    return data||[];
  }

  async function adminListTeachers(){
    const c=await getClient();
    const {data,error}=await withTimeout(c.from(MASTER_TABLE()).select("id,school_id,user_id,full_name,nip,email,no_hp,active,created_at,updated_at").order("full_name"));
    if(error) throw dbError(error);
    return data||[];
  }

  async function adminSaveTeacherMaster(row){
    const c=await getClient();
    const payload={school_id:clean(row.school_id||window.SPENDA_CONFIG?.SCHOOL_ID||"SMPN2SOYOJAYA"),full_name:clean(row.full_name),nip:clean(row.nip)||null,email:clean(row.email)||null,no_hp:clean(row.no_hp)||null,active:row.active!==false};
    if(row.id) payload.id=row.id;
    const {data,error}=await withTimeout(c.from(MASTER_TABLE()).upsert(payload,{onConflict:"id"}).select("*").single());
    if(error) throw dbError(error);
    return data;
  }

  async function adminDeleteTeacherMaster(id){
    const c=await getClient();
    const {error}=await withTimeout(c.from(MASTER_TABLE()).delete().eq("id",id));
    if(error) throw dbError(error);
    return {ok:true};
  }

  async function adminSyncTeacherAccount(masterId){
    const c=await getClient();
    const {data,error}=await withTimeout(c.rpc("sync_spenda_teacher_account",{p_teacher_master_id:masterId}));
    if(error) throw dbError(error);
    return data;
  }

  async function adminListAssignments(masterId){
    const c=await getClient();
    const {data:master,error:me}=await withTimeout(c.from(MASTER_TABLE()).select("user_id").eq("id",masterId).maybeSingle());
    if(me) throw dbError(me);
    if(!master?.user_id) return [];
    const {data,error}=await withTimeout(c.from(ASSIGNMENT_TABLE()).select("id,teacher_user_id,subject,level,class_name,active,created_at,updated_at").eq("teacher_user_id",master.user_id).order("level").order("subject").order("class_name"));
    if(error) throw dbError(error);
    return data||[];
  }

  async function adminSaveAssignment(row){
    const c=await getClient();
    const payload={teacher_user_id:clean(row.teacher_user_id),subject:clean(row.subject),level:levelCanonical(row.level),class_name:clean(row.class_name),active:row.active!==false};
    if(row.id) payload.id=row.id;
    const {data,error}=await withTimeout(c.from(ASSIGNMENT_TABLE()).upsert(payload,{onConflict:"teacher_user_id,level,class_name,subject"}).select("*").single());
    if(error) throw dbError(error);
    return data;
  }

  async function adminDeleteAssignment(id){
    const c=await getClient();
    const {error}=await withTimeout(c.from(ASSIGNMENT_TABLE()).delete().eq("id",id));
    if(error) throw dbError(error);
    return {ok:true};
  }

  async function requireAdminSession(){
    const result=await requireTeacherSession();
    if(result.profile.role!=="admin") throw new Error("Akses hanya untuk Admin.");
    return result;
  }

  async function requireTeacherSession(){
    const session=await authGetSession();
    if(!session?.user) throw new Error("Silakan login sebagai Guru terlebih dahulu.");
    const profile=await getTeacherProfile();
    if(!profile) throw new Error("Profil Guru belum tersedia. Minta admin membuat profil Guru untuk akun ini.");
    if(profile.active===false) throw new Error("Akun Guru sedang dinonaktifkan.");
    return {session,profile};
  }

  // ---------------------------------------------------------------
  // QUERY BANK
  // ---------------------------------------------------------------
  async function queryBankExact(meta){
    const c=await getClient();
    const m=canonicalMeta(meta);
    let q=c.from(TABLE()).select("*")
      .eq("school_id",m.school_id)
      .eq("game",m.game)
      .eq("teacher",m.teacher)
      .eq("level",m.level)
      .eq("class_name",m.class_name)
      .eq("subject",m.subject)
      .eq("difficulty",m.difficulty)
      .limit(1);
    if(m.teacher_user_id) q=q.eq("teacher_user_id",m.teacher_user_id);
    const {data,error}=await withTimeout(q);
    if(error) throw dbError(error);
    return data?.[0]?fromRow(data[0]):null;
  }

  async function queryBanks(filters={}){
    const c=await getClient();
    const schoolId=clean(window.SPENDA_CONFIG?.SCHOOL_ID||"SMPN2SOYOJAYA");
    let q=c.from(TABLE()).select("id,school_id,game,teacher,teacher_user_id,level,class_name,subject,difficulty,questions,source,created_at,updated_at")
      .eq("school_id",schoolId).order("updated_at",{ascending:false});
    if(filters.game) q=q.eq("game",clean(filters.game));
    if(filters.teacher && norm(filters.teacher)!=="semua guru") q=q.eq("teacher",clean(filters.teacher));
    if(filters.teacherUserId) q=q.eq("teacher_user_id",clean(filters.teacherUserId));
    if(filters.level) q=q.eq("level",levelCanonical(filters.level));
    if(filters.subject && norm(filters.subject)!=="semua mapel") q=q.eq("subject",clean(filters.subject));
    if(filters.className) q=q.eq("class_name",clean(filters.className));
    if(filters.difficulty && norm(filters.difficulty)!=="semua") q=q.eq("difficulty",clean(filters.difficulty));
    const {data,error}=await withTimeout(q);
    if(error) throw dbError(error);
    return (data||[]).map(fromRow);
  }

  async function cloudGetBank(meta){
    const exact=await queryBankExact(meta);
    if(exact) return exact;
    let rows=await queryBanks({game:meta.game,teacher:meta.teacher,teacherUserId:meta.teacher_user_id,level:meta.level,subject:meta.subject,difficulty:meta.difficulty});
    rows=rows.filter(r=>classMatch(r.className,meta.className));
    return rows[0]||null;
  }

  async function cloudQuestions(filters={}){
    // Strict: game + guru + mapel + jenjang + kelas + difficulty.
    let rows=await queryBanks({
      game:filters.game,
      teacher:filters.teacher,
      teacherUserId:filters.teacherUserId,
      level:filters.level,
      className:filters.className,
      subject:filters.subject,
      difficulty:filters.difficulty && norm(filters.difficulty)!=="semua" ? filters.difficulty : ""
    });

    // Hanya toleransi penulisan kelas: VII <-> Kelas 7.
    if(filters.className && !rows.length){
      rows=await queryBanks({
        game:filters.game,
        teacher:filters.teacher,
        teacherUserId:filters.teacherUserId,
        level:filters.level,
        subject:filters.subject,
        difficulty:filters.difficulty && norm(filters.difficulty)!=="semua" ? filters.difficulty : ""
      });
      rows=rows.filter(r=>classMatch(r.className,filters.className));
    }

    const out=[],seen=new Set();
    rows.forEach(r=>(r.questions||[]).forEach(q=>{
      const s=JSON.stringify(q);
      if(!seen.has(s)){seen.add(s);out.push(clone(q));}
    }));
    return out;
  }

  async function putBank(meta,questions,source="manual"){
    if(!configured()) return localPut(meta,questions,source);

    const teacherAccess=await requireTeacherSession();
    const row=toRow(meta,questions,source,teacherAccess.session.user.id);

    // Nama guru diseragamkan dengan profil login, bukan input bebas.
    row.teacher=clean(teacherAccess.profile.full_name);
    row.teacher_user_id=teacherAccess.session.user.id;
    row.school_id=clean(teacherAccess.profile.school_id||window.SPENDA_CONFIG?.SCHOOL_ID||"SMPN2SOYOJAYA");

    const c=await getClient();
    const up=c.from(TABLE()).upsert(row,{
      onConflict:"school_id,game,teacher_user_id,level,class_name,subject,difficulty"
    }).select("*").single();
    const {data,error}=await withTimeout(up);
    if(error) throw dbError(error);

    const saved=fromRow(data);
    await localPut(saved,saved.questions,"supabase-cache");
    return saved;
  }

  async function getBank(meta){
    if(!configured()) return localGet(meta);
    try{
      const row=await cloudGetBank(meta);
      if(row){await localPut(row,row.questions||[],"supabase-cache");return row;}
      return null;
    }catch(error){
      const local=await localGet(meta);
      if(local) return local;
      throw error;
    }
  }

  async function getQuestionsStrict(filters={}){
    if(!configured()) throw new Error("Supabase belum dikonfigurasi di config.js.");
    return cloudQuestions(filters);
  }

  async function getQuestions(filters={}){
    if(configured()){
      try{return await cloudQuestions(filters);}
      catch(error){
        const cached=await localQuestions(filters);
        if(cached.length) return cached;
        throw error;
      }
    }
    return localQuestions(filters);
  }

  async function listBanks(filters={}){
    if(configured()){
      try{return await queryBanks(filters);}
      catch(error){
        const cached=await localList(filters);if(cached.length) return cached;throw error;
      }
    }
    return localList(filters);
  }

  async function listTeachers(game=""){
    if(configured()){
      try{
        const rows=await queryBanks(game?{game}:{});
        return [...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher||"Umum"))]
          .sort((a,b)=>a.localeCompare(b,"id"));
      }catch(error){
        const rows=await localList(game?{game}:{});
        return [...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher||"Umum"))]
          .sort((a,b)=>a.localeCompare(b,"id"));
      }
    }
    const rows=await localList(game?{game}:{});
    return [...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher||"Umum"))]
      .sort((a,b)=>a.localeCompare(b,"id"));
  }

  async function remove(meta){
    if(!configured()) return localRemove(meta);
    const teacherAccess=await requireTeacherSession();
    const c=await getClient();
    const m=canonicalMeta(meta);
    const q=c.from(TABLE()).delete()
      .eq("school_id",teacherAccess.profile.school_id||m.school_id)
      .eq("game",m.game)
      .eq("teacher_user_id",teacherAccess.session.user.id)
      .eq("level",m.level)
      .eq("class_name",m.class_name)
      .eq("subject",m.subject)
      .eq("difficulty",m.difficulty);
    const {error}=await withTimeout(q);
    if(error) throw dbError(error);
    await localRemove({...m,teacher_user_id:teacherAccess.session.user.id});
    return {ok:true};
  }

  async function ping(){
    if(!configured()) throw new Error("Supabase belum dikonfigurasi di config.js.");
    const c=await getClient();
    const {data,error}=await withTimeout(c.from(TABLE()).select("id").limit(1));
    if(error) throw dbError(error);
    return true;
  }

  window.SPENDADB={
    DB_NAME:"SPENDA_SUPABASE_QUESTION_DATABASE_V17",
    init:localInit,
    ping,
    putBank,getBank,getQuestions,getQuestionsStrict,listBanks,listTeachers,remove,
    classMatch,sameSubject,sameLevel,norm,clean,
    cloudConfigured:configured,
    authGetSession,authGetUser,authSignIn,authSignOut,getTeacherLoginList,authOnChange,getTeacherProfile,requireTeacherSession,requireAdminSession,getMyAssignments,adminListTeachers,adminSaveTeacherMaster,adminDeleteTeacherMaster,adminSyncTeacherAccount,adminListAssignments,adminSaveAssignment,adminDeleteAssignment
  };
})();
