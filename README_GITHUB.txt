SPENDA GAME CENTER — FINAL DELIVERY

Upload ALL files and folders in this package to the ROOT of the GitHub Pages repository.
Do not mix these files with older V21–V38 packages.

GAME CENTER
- BENAR / SALAH
- SPENDA FAMILY 100
- GESTURE BATTLE EDU
- ESTAFET SOAL
- CLASH OF CHAMPIONS

ESTAFET SOAL — VERSI TERINTEGRASI
- File game: estafet-soal.html
- Mode permainan: siswa bergantian menjawab langsung pada laptop/layar/PID.
- Login memakai Nama Guru + password dari teacher_master.
- Penugasan Mapel/Kelas dibaca dari teacher_assignments.
- Soal diambil dari Supabase question_banks dengan filter Guru + Game + Jenjang + Kelas + Mapel + Kesulitan.
- Tidak ada bank soal bawaan di dalam game.
- Tersedia 2–6 kelompok, rotasi pemain otomatis, timer, skor live, combo, animasi, confetti, efek suara, rekap JSON, dan cetak hasil.
- Tersedia tombol kembali ke Tim dan Game Center di halaman permainan.

DATABASE & IMPORT
- Halaman: bank-soal.html
- Importer: spenda-import-final.js
- Template baru:
  templates/Template_Soal_ESTAFET_SOAL.docx
  templates/Template_Soal_ESTAFET_SOAL.xlsx
- Format Estafet:
  No | Pertanyaan | A | B | C | D | Kunci | Kesulitan | Game
- Kolom Game pada template diisi ESTAFET_SOAL dan jangan diubah.
- Kunci harus A, B, C, atau D.
- Nama Guru, Jenjang, Kelas, dan Mapel mengikuti akun serta penugasan saat import.

CACHE / PWA
- Service worker sudah dinaikkan ke cache baru.
- Setelah upload ke GitHub Pages, lakukan Ctrl+F5 satu kali. Jika aplikasi sebelumnya terpasang sebagai PWA dan masih menampilkan versi lama, tutup PWA lalu buka kembali dari alamat GitHub Pages terbaru.
