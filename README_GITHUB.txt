SPENDA GAME CENTER — FINAL DELIVERY


Upload ALL files in this folder to the ROOT of the GitHub Pages repository.

Do not mix these files with older V21-V38 files.


The Excel/Word importer is fixed and is loaded as spenda-import-final.js.

The selected game is passed to the parser, so templates are recognized correctly.

Templates are in the templates/ folder.


PERBAIKAN IMPORT (fix2)
- Game dikenali otomatis dari header file. Jika template tidak sama dengan Game yang dipilih,
  aplikasi menawarkan pindah game (sebelumnya: "kosong" atau data salah masuk diam-diam).
- Kunci Benar/Salah kosong/invalid tidak lagi dianggap BENAR; baris tidak valid dilewati dan dihitung.
- Library Excel/Word punya CDN cadangan; CSV (koma/titik-koma) dibaca sebagai UTF-8.
- Pesan error kini menyebut sheet dan kolom yang terbaca.
- Setelah upload ke GitHub, buka aplikasi lalu refresh keras (Ctrl+F5) / hapus cache PWA satu kali.


GAME TAMBAHAN
- ESTAFET SOAL: estafet-soal.html
- Mode utama prototype: siswa bergantian menjawab langsung di layar/PID.
- Dilengkapi timer, skor kelompok, combo, animasi, confetti, dan suara browser.
