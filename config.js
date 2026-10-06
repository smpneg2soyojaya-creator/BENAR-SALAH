(() => {
  const existing = window.GAME_CONFIG || {};
  window.GAME_CONFIG = Object.assign({
    gameName: "Kuis Interaktif Benar Salah",
    secondsPerQuestion: 10,
    resultSeconds: 5,
    transitionSeconds: 2,
    selectionHoldMs: 260
  }, existing);

  // ================================================================
  // SPENDA GAME CENTER — SUPABASE DATABASE TERPUSAT
  // ================================================================
  // Publishable key aman untuk ditempatkan pada aplikasi browser.
  // Keamanan data dikendalikan oleh Row Level Security (RLS) di Supabase.
  // JANGAN menaruh sb_secret_* / service_role key di file ini.
  // ================================================================
  window.SPENDA_CONFIG = Object.assign({
    SCHOOL_ID: "SMPN2SOYOJAYA",
    SUPABASE_URL: "https://gygngkucqzjtgswwenuh.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fRZZw6by12tqRXZQCudU7w_atHQj7Az",
    TABLE: "question_banks",
    PROFILE_TABLE: "teacher_profiles",
    REQUEST_TIMEOUT_MS: 8000,
    AUTH_PERSIST_SESSION: true,
    AUTH_AUTO_REFRESH_TOKEN: true
  }, window.SPENDA_CONFIG || {});
})();
