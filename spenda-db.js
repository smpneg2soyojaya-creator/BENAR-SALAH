(() => {
  "use strict";

  const LOCAL_DB_NAME = "SPENDA_GAME_CENTER_CACHE_V26";
  const LOCAL_DB_VERSION = 1;
  const STORE = "questionBanks";
  const FALLBACK_KEY = "SPENDA_GAME_CENTER_CACHE_FALLBACK_V26";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const clean = v => String(v ?? "").trim();
  const norm = v => clean(v).toLowerCase().replace(/\s+/g, " ");
  const clone = v => {
    try { return structuredClone(v); }
    catch { return JSON.parse(JSON.stringify(v)); }
  };

  const romanMap = {i:"1",ii:"2",iii:"3",iv:"4",v:"5",vi:"6",vii:"7",viii:"8",ix:"9",x:"10",xi:"11",xii:"12"};
  function classNorm(v){
    let s=norm(v).replace(/^kelas\s*/,"").trim();
    s=s.replace(/\b(viii|vii|vi|iv|ix|xii|xi|x|v|iii|ii|i)\b/g,m=>romanMap[m]||m);
    const nums=s.match(/\d+/g);
    return nums?nums.join(""):s.replace(/[^0-9]/g,"");
  }
  function classMatch(a,b){
    if(!a||!b)return true;
    const aa=classNorm(a),bb=classNorm(b);
    return aa===bb || (!!aa&&!!bb&&(aa.includes(bb)||bb.includes(aa))) || norm(a)===norm(b);
  }
  function levelNorm(v){
    const s=norm(v).replace(/\(.*?\)/g," ");
    if(/\bsd\b/.test(s))return "sd";
    if(/\bsmp\b/.test(s))return "smp";
    if(/\bsma\b/.test(s))return "sma";
    return s;
  }
  function sameLevel(a,b){return !a||!b||levelNorm(a)===levelNorm(b);}
  function subjectNorm(v){return norm(v).replace(/^(mata\s*pelajaran|mapel|subject)\s*[:\-]?\s*/i,"");}
  function sameSubject(a,b){return !a||!b||subjectNorm(a)===subjectNorm(b);}
  function sameTeacher(a,b){return !a||!b||norm(a)===norm(b);}
  function levelCanonical(v){const s=norm(v);if(/\bsd\b/.test(s))return "SD";if(/\bsmp\b/.test(s))return "SMP";if(/\bsma\b/.test(s))return "SMA";return clean(v);}

  function teacherAuthEmailFromNip(nip){
    const id=clean(nip).toLowerCase().replace(/[^a-z0-9]/g,"");
    if(!id)throw new Error("NIP Guru belum diisi.");
    return `${id}@login.spenda.local`;
  }

  function canonicalMeta(meta={}){
    return {
      school_id:clean(meta.school_id||meta.schoolId||window.SPENDA_CONFIG?.SCHOOL_ID||"SMPN2SOYOJAYA"),
      game:clean(meta.game),
      teacher:clean(meta.teacher),
      teacher_user_id:clean(meta.teacher_user_id||meta.teacherUserId),
      level:levelCanonical(meta.level),
      class_name:clean(meta.className||meta.class_name),
      subject:clean(meta.subject),
      difficulty:clean(meta.difficulty)||"Semua"
    };
  }

  function key(meta){
    const m=canonicalMeta(meta);
    return [m.school_id,m.game,m.teacher_user_id||m.teacher,m.level,m.class_name,m.subject,m.difficulty].join("||");
  }

  function fromRow(row){
    if(!row)return null;
    return {
      id:row.id,
      school_id:clean(row.school_id),
      game:clean(row.game),
      teacher:clean(row.teacher),
      teacher_user_id:clean(row.teacher_user_id),
      level:clean(row.level),
      className:clean(row.class_name),
      subject:clean(row.subject),
      difficulty:clean(row.difficulty)||"Semua",
      questions:clone(Array.isArray(row.questions)?row.questions:[]),
      source:clean(row.source)||"supabase",
      createdAt:row.created_at||null,
      updatedAt:row.updated_at||null
    };
  }

  function toRow(meta,questions,source,teacherUserId){
    const m=canonicalMeta(meta);
    return {
      school_id:m.school_id,
      game:m.game,
      teacher:m.teacher,
      teacher_user_id:clean(teacherUserId||m.teacher_user_id),
      level:m.level,
      class_name:m.class_name,
      subject:m.subject,
      difficulty:m.difficulty,
      questions:clone(Array.isArray(questions)?questions:[]),
      source:source||"manual"
    };
  }

  function readFallback(){try{return JSON.parse(localStorage.getItem(FALLBACK_KEY)||"[]");}catch{return[];}}
  function writeFallback(rows){try{localStorage.setItem(FALLBACK_KEY,JSON.stringify(rows));}catch{}}

  function openLocalDB(){
    return new Promise((resolve,reject)=>{
      if(!window.indexedDB)return reject(new Error("IndexedDB tidak tersedia."));
      const req=indexedDB.open(LOCAL_DB_NAME,LOCAL_DB_VERSION);
      req.onupgradeneeded=e=>{if(!e.target.result.objectStoreNames.contains(STORE))e.target.result.createObjectStore(STORE,{keyPath:"id"});};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error("Gagal membuka cache lokal."));
    });
  }
  async function localInit(){
    if(localPromise)return localPromise;
    localPromise=openLocalDB().then(db=>{localDb=db;return true;}).catch(()=>{localDb=null;return false;});
    return localPromise;
  }
  let localDb=null,localPromise=null,supabaseClient=null,supabasePromise=null;

  async function localAll(){
    await localInit();
    if(localDb){try{return await new Promise((resolve,reject)=>{const r=localDb.transaction(STORE,"readonly").objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}catch{}}
    return readFallback();
  }
  async function localPut(meta,questions,source="cache"){
    const row={id:key(meta),...canonicalMeta(meta),questions:clone(questions||[]),source,updatedAt:new Date().toISOString()};
    await localInit();
    if(localDb){try{localDb.transaction(STORE,"readwrite").objectStore(STORE).put(row);}catch{}}
    writeFallback(readFallback().filter(x=>x.id!==row.id).concat(row));
    return fromRow(row);
  }
  async function localList(filters={}){
    const rows=await localAll();
    return rows.filter(r=>{
      if(filters.game&&norm(r.game)!==norm(filters.game))return false;
      if(filters.teacher&&!sameTeacher(r.teacher,filters.teacher))return false;
      if(filters.teacherUserId&&clean(r.teacher_user_id)!==clean(filters.teacherUserId))return false;
      if(filters.level&&!sameLevel(r.level,filters.level))return false;
      if(filters.className&&!classMatch(r.className,filters.className))return false;
      if(filters.subject&&!sameSubject(r.subject,filters.subject))return false;
      if(filters.difficulty&&norm(filters.difficulty)!=="semua"){
        const d=norm(r.difficulty||"Semua");if(d!==norm(filters.difficulty)&&d!=="semua")return false;
      }
      return true;
    }).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).map(fromRow);
  }
  async function localGet(meta){
    const rows=await localList({game:meta.game,teacher:meta.teacher,teacherUserId:meta.teacher_user_id,level:meta.level,className:meta.className,subject:meta.subject,difficulty:meta.difficulty});
    return rows.find(r=>r.id===key(meta))||rows[0]||null;
  }
  async function localQuestions(filters={}){
    const rows=await localList(filters),out=[],seen=new Set();
    rows.forEach(r=>(r.questions||[]).forEach(q=>{const s=JSON.stringify(q);if(!seen.has(s)){seen.add(s);out.push(clone(q));}}));
    return out;
  }
  async function localRemove(meta){
    const id=key(meta);await localInit();if(localDb){try{localDb.transaction(STORE,"readwrite").objectStore(STORE).delete(id);}catch{}}
    writeFallback(readFallback().filter(x=>x.id!==id));
  }

  function configured(){
    const c=window.SPENDA_CONFIG||{};
    return !!(clean(c.SUPABASE_URL)&&clean(c.SUPABASE_PUBLISHABLE_KEY)&&!/YOUR_PROJECT_REF|xxxxxxxx/i.test(clean(c.SUPABASE_URL)+clean(c.SUPABASE_PUBLISHABLE_KEY)));
  }
  async function loadSupabase(){
    if(window.supabase?.createClient)return window.supabase;
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-spenda-supabase="1"]');
      if(old){old.addEventListener("load",()=>resolve(window.supabase),{once:true});old.addEventListener("error",()=>reject(new Error("Gagal memuat Supabase JS.")),{once:true});return;}
      const s=document.createElement("script");s.src=SUPABASE_CDN;s.async=true;s.dataset.spendaSupabase="1";
      s.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error("Supabase client tidak tersedia."));
      s.onerror=()=>reject(new Error("Gagal memuat library Supabase. Pastikan internet aktif."));
      document.head.appendChild(s);
    });
  }
  async function getClient(){
    if(!configured())throw new Error("Supabase belum dikonfigurasi di config.js.");
    if(supabaseClient)return supabaseClient;
    if(supabasePromise)return supabasePromise;
    supabasePromise=(async()=>{const lib=await loadSupabase();const c=window.SPENDA_CONFIG||{};supabaseClient=lib.createClient(clean(c.SUPABASE_URL),clean(c.SUPABASE_PUBLISHABLE_KEY),{auth:{persistSession:c.AUTH_PERSIST_SESSION!==false,autoRefreshToken:c.AUTH_AUTO_REFRESH_TOKEN!==false,detectSessionInUrl:true}});return supabaseClient;})();
    return supabasePromise;
  }
  async function withTimeout(p,ms){
    const timeout=Number(ms||window.SPENDA_CONFIG?.REQUEST_TIMEOUT_MS||8000);let t;
    try{return await Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error("Waktu koneksi database habis.")),timeout);})]);}
    finally{clearTimeout(t);}
  }
  function dbError(e){
    if(!e)return null;const m=e.message||e.details||e.hint||String(e);
    if(/row-level security|permission denied|not allowed/i.test(m))return new Error("Akses Supabase ditolak. Periksa RLS dan hak akses akun.");
    return new Error(m);
  }
  const table=()=>clean(window.SPENDA_CONFIG?.TABLE)||"question_banks";
  const profileTable=()=>clean(window.SPENDA_CONFIG?.PROFILE_TABLE)||"teacher_profiles";
  const masterTable=()=>clean(window.SPENDA_CONFIG?.MASTER_TABLE)||"teacher_master";
  const assignmentTable=()=>clean(window.SPENDA_CONFIG?.ASSIGNMENT_TABLE)||"teacher_assignments";
  const accountFunction=()=>clean(window.SPENDA_CONFIG?.TEACHER_ACCOUNT_FUNCTION)||"spenda-admin-teacher-account";
  const schoolId=()=>clean(window.SPENDA_CONFIG?.SCHOOL_ID)||"SMPN2SOYOJAYA";

  async function authGetSession(){const c=await getClient();const {data,error}=await withTimeout(c.auth.getSession());if(error)throw dbError(error);return data?.session||null;}
  async function authGetUser(){const c=await getClient();const {data,error}=await withTimeout(c.auth.getUser());if(error)throw dbError(error);return data?.user||null;}
  async function authSignIn(email,password){const c=await getClient();const {data,error}=await withTimeout(c.auth.signInWithPassword({email:clean(email),password:String(password||"")}));if(error)throw dbError(error);return data;}
  async function authSignInByNip(nip,password){return authSignIn(teacherAuthEmailFromNip(nip),password);}
  async function authSignOut(){const c=await getClient();const {error}=await withTimeout(c.auth.signOut());if(error)throw dbError(error);}
  function authOnChange(cb){let sub=null;getClient().then(c=>{sub=c.auth.onAuthStateChange((ev,s)=>cb?.(ev,s))?.data?.subscription||null;}).catch(()=>{});return{unsubscribe:()=>sub?.unsubscribe?.()};}

  async function getTeacherLoginList(){
    const c=await getClient();
    const {data,error}=await withTimeout(c.rpc("get_teacher_login_list"));
    if(error)throw dbError(error);
    return Array.isArray(data)?data:[];
  }
  async function getTeacherProfile(){
    const s=await authGetSession();if(!s?.user)return null;const c=await getClient();
    const {data,error}=await withTimeout(c.from(profileTable()).select("user_id,school_id,teacher_master_id,teacher_nip,full_name,role,active,created_at,updated_at").eq("user_id",s.user.id).eq("school_id",schoolId()).limit(1).maybeSingle());
    if(error)throw dbError(error);return data||null;
  }
  async function requireTeacherSession(){
    const session=await authGetSession();if(!session?.user)throw new Error("Silakan login sebagai Guru terlebih dahulu.");
    const profile=await getTeacherProfile();if(!profile)throw new Error("Profil Guru belum tersedia. Minta Admin membuat akun Guru.");
    if(profile.active===false)throw new Error("Akun Guru sedang dinonaktifkan.");
    return{session,profile};
  }
  async function requireAdminSession(){const r=await requireTeacherSession();if(r.profile.role!=="admin")throw new Error("Akses hanya untuk Admin.");return r;}
  async function getMyAssignments(){
    const r=await requireTeacherSession();const c=await getClient();
    const {data,error}=await withTimeout(c.from(assignmentTable()).select("id,teacher_user_id,teacher_nip,subject,level,class_name,active,created_at,updated_at").eq("teacher_user_id",r.session.user.id).eq("active",true).order("level").order("subject").order("class_name"));
    if(error)throw dbError(error);return data||[];
  }

  async function adminListTeachers(){const c=await getClient();const {data,error}=await withTimeout(c.from(masterTable()).select("id,school_id,user_id,full_name,nip,no_hp,active,created_at,updated_at").eq("school_id",schoolId()).order("full_name"));if(error)throw dbError(error);return data||[];}
  async function adminSaveTeacherMaster(row){
    const c=await getClient();
    const payload={school_id:schoolId(),full_name:clean(row.full_name),nip:clean(row.nip)||null,no_hp:clean(row.no_hp)||null,active:row.active!==false};
    if(row.id)payload.id=row.id;
    const {data,error}=await withTimeout(c.from(masterTable()).upsert(payload,{onConflict:"id"}).select("*").single());if(error)throw dbError(error);return data;
  }
  async function adminDeleteTeacherMaster(id){const c=await getClient();const {error}=await withTimeout(c.from(masterTable()).delete().eq("id",id).eq("school_id",schoolId()));if(error)throw dbError(error);return{ok:true};}
  async function adminSetTeacherPassword(masterId,password){
    if(!clean(password)||clean(password).length<6)throw new Error("Password minimal 6 karakter.");
    const c=await getClient();
    const {data,error}=await withTimeout(c.functions.invoke(accountFunction(),{body:{action:"set_password",teacher_master_id:Number(masterId),password:String(password)}}));
    if(error){let msg=error.message||"Gagal membuat akun Guru.";try{if(error.context){const j=await error.context.json();msg=j?.error||msg;}}catch{}throw new Error(msg);}
    if(!data?.ok)throw new Error(data?.error||"Gagal membuat akun Guru.");
    return data;
  }
  async function adminSyncTeacherAccount(masterId){
    const teachers=await adminListTeachers();const t=teachers.find(x=>String(x.id)===String(masterId));
    if(!t?.user_id)throw new Error("Akun belum ada. Gunakan menu Buat/Ubah Password Guru.");
    return{ok:true,user_id:t.user_id};
  }
  async function adminListAssignments(masterId){
    const c=await getClient();const {data:t,error:te}=await withTimeout(c.from(masterTable()).select("user_id,nip").eq("id",masterId).eq("school_id",schoolId()).maybeSingle());if(te)throw dbError(te);if(!t?.user_id)return[];
    const {data,error}=await withTimeout(c.from(assignmentTable()).select("id,teacher_user_id,teacher_nip,subject,level,class_name,active,created_at,updated_at").eq("teacher_user_id",t.user_id).order("level").order("subject").order("class_name"));if(error)throw dbError(error);return data||[];
  }
  async function adminSaveAssignment(row){
    const c=await getClient();const payload={school_id:schoolId(),teacher_master_id:Number(row.teacher_master_id),teacher_user_id:clean(row.teacher_user_id),teacher_nip:clean(row.teacher_nip),subject:clean(row.subject),level:levelCanonical(row.level),class_name:clean(row.class_name),active:row.active!==false};
    if(row.id)payload.id=row.id;
    const {data,error}=await withTimeout(c.from(assignmentTable()).upsert(payload,{onConflict:"teacher_master_id,teacher_nip,teacher_user_id,subject,level,class_name"}).select("*").single());if(error)throw dbError(error);return data;
  }
  async function adminDeleteAssignment(id){const c=await getClient();const {error}=await withTimeout(c.from(assignmentTable()).delete().eq("id",id));if(error)throw dbError(error);return{ok:true};}

  async function queryBanks(filters={}){
    const c=await getClient();let q=c.from(table()).select("id,school_id,game,teacher,teacher_user_id,level,class_name,subject,difficulty,questions,source,created_at,updated_at").eq("school_id",schoolId()).order("updated_at",{ascending:false});
    if(filters.game)q=q.eq("game",clean(filters.game));
    if(filters.teacher)q=q.eq("teacher",clean(filters.teacher));
    if(filters.teacherUserId)q=q.eq("teacher_user_id",clean(filters.teacherUserId));
    if(filters.level)q=q.eq("level",levelCanonical(filters.level));
    if(filters.subject)q=q.eq("subject",clean(filters.subject));
    if(filters.className)q=q.eq("class_name",clean(filters.className));
    if(filters.difficulty&&norm(filters.difficulty)!=="semua")q=q.eq("difficulty",clean(filters.difficulty));
    const {data,error}=await withTimeout(q);if(error)throw dbError(error);return(data||[]).map(fromRow);
  }
  async function cloudGetBank(meta){
    let rows=await queryBanks({game:meta.game,teacher:meta.teacher,teacherUserId:meta.teacher_user_id,level:meta.level,subject:meta.subject,difficulty:meta.difficulty});
    rows=rows.filter(r=>!meta.className||classMatch(r.className,meta.className));
    return rows[0]||null;
  }
  async function cloudQuestions(filters={}){
    let rows=await queryBanks({game:filters.game,teacher:filters.teacher,teacherUserId:filters.teacherUserId,level:filters.level,subject:filters.subject,className:filters.className,difficulty:filters.difficulty&&norm(filters.difficulty)!=="semua"?filters.difficulty:""});
    if(filters.className&&!rows.length){rows=await queryBanks({game:filters.game,teacher:filters.teacher,teacherUserId:filters.teacherUserId,level:filters.level,subject:filters.subject,difficulty:filters.difficulty&&norm(filters.difficulty)!=="semua"?filters.difficulty:""});rows=rows.filter(r=>classMatch(r.className,filters.className));}
    const out=[],seen=new Set();rows.forEach(r=>(r.questions||[]).forEach(q=>{const s=JSON.stringify(q);if(!seen.has(s)){seen.add(s);out.push(clone(q));}}));return out;
  }
  async function putBank(meta,questions,source="manual"){
    if(!configured())throw new Error("Supabase belum dikonfigurasi di config.js.");
    const access=await requireTeacherSession();
    const row=toRow(meta,questions,source,access.session.user.id);
    row.teacher=clean(access.profile.full_name);row.teacher_user_id=access.session.user.id;row.school_id=clean(access.profile.school_id||schoolId());
    const c=await getClient();const {data,error}=await withTimeout(c.from(table()).upsert(row,{onConflict:"school_id,game,teacher_user_id,level,class_name,subject,difficulty"}).select("*").single());if(error)throw dbError(error);
    const saved=fromRow(data);await localPut(saved,saved.questions,"supabase-cache");return saved;
  }
  async function getBank(meta){if(!configured())return localGet(meta);try{const r=await cloudGetBank(meta);if(r){await localPut(r,r.questions||[],"supabase-cache");return r;}return null;}catch(e){const local=await localGet(meta);if(local)return local;throw e;}}
  async function getQuestionsStrict(filters={}){if(!configured())throw new Error("Supabase belum dikonfigurasi di config.js.");return cloudQuestions(filters);}
  async function getQuestions(filters={}){return configured()?cloudQuestions(filters):localQuestions(filters);}
  async function listBanks(filters={}){return configured()?queryBanks(filters):localList(filters);}
  async function listTeachers(game=""){
    if(configured()){const rows=await queryBanks(game?{game}:{});return[...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id"));}
    const rows=await localList(game?{game}:{});return[...new Set(rows.filter(r=>(r.questions||[]).length).map(r=>r.teacher).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id"));
  }
  async function remove(meta){
    const access=await requireTeacherSession();const c=await getClient();const m=canonicalMeta(meta);
    const {error}=await withTimeout(c.from(table()).delete().eq("school_id",access.profile.school_id||schoolId()).eq("game",m.game).eq("teacher_user_id",access.session.user.id).eq("level",m.level).eq("class_name",m.class_name).eq("subject",m.subject).eq("difficulty",m.difficulty));if(error)throw dbError(error);
    await localRemove({...m,teacher_user_id:access.session.user.id});return{ok:true};
  }
  async function ping(){const c=await getClient();const {data,error}=await withTimeout(c.from(table()).select("id").eq("school_id",schoolId()).limit(1));if(error)throw dbError(error);return true;}

  window.SPENDADB={
    DB_NAME:"SPENDA_SUPABASE_QUESTION_DATABASE_V26",init:localInit,ping,putBank,getBank,getQuestions,getQuestionsStrict,listBanks,listTeachers,remove,
    classMatch,sameSubject,sameLevel,norm,clean,cloudConfigured:configured,
    authGetSession,authGetUser,authSignIn,authSignInByNip,teacherAuthEmailFromNip,authSignOut,authOnChange,
    getTeacherLoginList,getTeacherProfile,requireTeacherSession,requireAdminSession,getMyAssignments,
    adminListTeachers,adminSaveTeacherMaster,adminDeleteTeacherMaster,adminSetTeacherPassword,adminSyncTeacherAccount,adminListAssignments,adminSaveAssignment,adminDeleteAssignment
  };
})();
