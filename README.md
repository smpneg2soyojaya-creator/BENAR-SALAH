# Kuis Interaktif BENAR / SALAH – V18

Perbaikan tampilan hasil:
- Kamera tidak lagi ditutup overlay gelap/buram.
- Hasil jawaban menjadi banner kecil di atas tengah.
- Banner tidak memakai blur dan tidak menutup layar.
- Pertanyaan tetap kecil.
- Warna sisi BENAR/SALAH untuk hasil tetap baru aktif setelah timer habis.
- Garis tengah dan label bawah tetap.
- Tidak ada deteksi tubuh/posisi.
- Tidak ada poin.

Perbaikan deployment:
- Service worker V18 dibuat network-first untuk index.html agar deploy GitHub Pages tidak tertahan oleh cache lama.
- Pada pembukaan pertama V18, service worker lama yang terdaftar untuk game ini akan dilepas dan cache game lama dibersihkan sekali.

Database/editor/import/jenjang/kelas/mapel tetap dipertahankan.
