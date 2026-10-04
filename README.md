# SPENDA Game Center V4

Sekarang berisi 4 game dalam satu repository, seluruh file berada sejajar di root:
- index.html
- benar-salah.html
- spenda-family-100.html
- spenda-gesture-battle.html
- clash-of-champions.html
- logo-sekolah.png
- icon-192.png
- icon-512.png
- manifest.webmanifest
- sw.js

Game baru:
**Clash of Champions: Cipher Vault Arena**
diambil dari file yang Anda kirim. Game ini memiliki pengaturan jumlah tim, durasi pertandingan, arena Vault, timer, dashboard guru, dan sistem rebutan bendera.

Tombol kembali ke SPENDA Game Center pada game Clash ditempatkan hanya di halaman setup agar tidak menutupi kontrol/game menu.

## Deploy GitHub Pages
Upload semua file langsung ke root repository. Tidak ada folder `games`.

Settings → Pages → Deploy from branch → main → root.

Karena aplikasi menggunakan beberapa library CDN, koneksi internet tetap diperlukan saat pertama kali memuat resource eksternal.
