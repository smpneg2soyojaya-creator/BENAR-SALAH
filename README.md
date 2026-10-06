# SPENDA Game Center V15

SMP Negeri 2 Soyo Jaya • Database Soal Sekolah • 4 Game

## Sumber soal
Game **tidak lagi memiliki soal bawaan**. Soal permainan hanya dapat berasal dari bank yang tersimpan di **Database Sekolah (Google Sheets + Google Apps Script)**. Cache browser hanya menyimpan salinan bank yang pernah dimuat dari database untuk membantu editor; cache tidak dipakai sebagai sumber soal ketika permainan dimulai.

## Identitas bank
Setiap bank dipisahkan berdasarkan:

**Game + Nama Guru + Jenjang + Kelas + Mapel + Kesulitan**

Hal ini memungkinkan dua guru yang mengajar mapel yang sama memiliki bank soal yang berbeda tanpa tercampur.

## Alur guru → PID/IFP
1. Guru membuka **Database Soal Guru**.
2. Pilih Game, Nama Guru, Jenjang, Kelas, Mapel, dan Kesulitan.
3. Import Word `.docx`, Excel `.xlsx/.xls`, CSV, atau JSON.
4. Soal disimpan ke Database Sekolah.
5. PID/IFP membuka Game Center.
6. Pilih Nama Guru, Jenjang, Kelas, dan Mapel.
7. Game hanya mengambil soal dari bank yang sesuai.

## Google Apps Script
1. Buat Google Spreadsheet untuk database.
2. Tempel `backend/Code.gs` ke Extensions → Apps Script.
3. Jalankan `setupDatabase()` satu kali.
4. Deploy sebagai Web App, Execute as **Me**, akses **Anyone**.
5. Masukkan URL `/exec` ke `config.js` pada `API_URL`.
6. Pastikan token pada `config.js` sama dengan `SPENDA_TOKEN` pada `Code.gs`.

## Import
Kolom utama per game:
- BENAR/SALAH: `Pernyataan`, `Kunci`
- GESTURE: `Pertanyaan`, `A`, `B`, `C`, `D`, `Kunci`
- FAMILY 100: `Kategori`, `Pertanyaan`, `Jawaban1`, `Skor1`, `Kunci1`, dst.
- CLASH: `Pertanyaan`, `Jawaban`, `Kesulitan`

Metadata identitas pada halaman **Database Soal Guru** adalah sumber utama untuk pengelompokan bank; metadata di file tidak menimpa pilihan identitas halaman.

## Catatan deployment
Semua file aplikasi berada sejajar di root repository. Gunakan GitHub Pages/HTTPS untuk penggunaan di PID/IFP, terutama game yang memakai kamera seperti GESTURE BATTLE.


## Perbaikan V15
- Tampilan BENAR/SALAH menempatkan Nama Guru sebagai pilihan utama dan jelas sebelum Mapel/Jenjang/Kelas.
- SPENDA FAMILY 100 tidak lagi meminta Kode Guru saat membuka Kelola Bank Soal.
- SPENDA FAMILY 100 mengikuti bank soal Database Sekolah berdasarkan Nama Guru + Mata Pelajaran + Kelas.
- Tombol GESTURE tidak lagi menggunakan istilah Reset Contoh Soal; bank soal bawaan tetap kosong.
- Tidak ada bank soal contoh/default yang menjadi sumber permainan.
