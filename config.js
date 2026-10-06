(() => {
  const existing = window.GAME_CONFIG || {};
  window.GAME_CONFIG = Object.assign({
    gameName: "Kuis Interaktif Benar Salah",
    secondsPerQuestion: 10,
    resultSeconds: 5,
    transitionSeconds: 2,
    selectionHoldMs: 260
  }, existing);

  // Database terpusat SPENDA Game Center.
  // Isi API_URL setelah Google Apps Script Web App selesai dideploy.
  window.SPENDA_CONFIG = Object.assign({
    SCHOOL_ID: "SMPN2SOYOJAYA",
    API_URL: "https://script.google.com/macros/s/AKfycbwq2IZhFveyZpfq9Y8CICR4JpgfJM3Fr3ShK1KaBa0HrFyzllN2Wu1EV03KtmWCDGwg7w/exec",
    API_TOKEN: "SPENDA2026",
    REQUEST_TIMEOUT_MS: 7000
  }, window.SPENDA_CONFIG || {});
})();
