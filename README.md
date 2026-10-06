# SPENDA Game Center V13 – Bug Fix

## Database terpusat sekolah
Tahap ini tidak menjadikan database browser sebagai sumber utama.

Alur penggunaan:

**Laptop Guru**
→ Import Word/Excel
→ **Database Sekolah (Google Sheets + Apps Script)**
→ **PID/IFP**
→ Game Center mengambil soal sesuai **Nama Guru + Mapel + Kelas + Jenjang**.

Satu mata pelajaran dapat memiliki lebih dari satu guru. Karena Nama Guru menjadi bagian dari bank, soal guru A dan guru B tidak tercampur.

## Empat game terhubung ke database yang sama
- BENAR / SALAH
- GESTURE BATTLE EDU
- SPENDA FAMILY 100
- CLASH OF CHAMPIONS

Mekanisme permainan yang sudah ada dipertahankan. Jalur MULAI tidak menunggu database/kamera.

## Import soal
Guru dapat menggunakan:
- Word `.docx`
- Excel `.xlsx` / `.xls`
- CSV
- JSON lama

Template tersedia di folder `templates`.

## Backend
File backend berada di `backend/Code.gs`.
Backend memakai Google Sheets sebagai penyimpanan terpusat dan Google Apps Script sebagai API.

### Konfigurasi
1. Buat Google Spreadsheet untuk database SPENDA Game Center.
2. Tempel `backend/Code.gs` ke Extensions → Apps Script.
3. Jalankan `setupDatabase()` satu kali.
4. Deploy sebagai Web App, Execute as **Me**, akses **Anyone**.
5. Salin URL `/exec` ke `config.js` pada `API_URL`.
6. Pastikan `API_TOKEN` pada `config.js` sama dengan `SPENDA_TOKEN` pada `Code.gs`.

Setelah konfigurasi, laptop guru dan PID/IFP dapat menggunakan database sekolah yang sama melalui internet.

## Catatan implementasi
Cache lokal hanya digunakan sebagai cadangan ketika koneksi database sekolah gagal. Sumber utama bank soal adalah database sekolah.

Seluruh file game tetap berada sejajar di root repository; tidak ada folder `games`.

## Perbaikan V13
- Pencarian bank soal lebih toleran terhadap variasi Jenjang, Kelas, dan penulisan Mapel.
- Bila tingkat kesulitan yang dipilih belum memiliki bank, sistem mengambil soal dari bank Guru + Mapel + Jenjang + Kelas yang sama, sehingga soal tidak hilang.
- Import Word/Excel mencari baris header secara otomatis, termasuk bila ada judul atau petunjuk sebelum tabel.
- Semua game tetap memilih soal berdasarkan Game + Nama Guru + Mapel + Jenjang + Kelas.
- Service Worker diperbarui ke V13 agar cache versi lama tidak terus dipakai.
- Cache lokal hanya cadangan; sumber utama tetap Database Sekolah ketika API_URL sudah dikonfigurasi.
