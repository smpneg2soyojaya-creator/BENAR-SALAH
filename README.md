# SPENDA Game Center V18

Versi ini melanjutkan Game Center yang sudah ada dan mengganti database pusat menjadi **Supabase PostgreSQL**, sekaligus menambahkan **Supabase Auth + RLS** untuk pengelolaan bank soal oleh Guru.

## Arsitektur

Laptop Guru → Login Supabase → Import Word/Excel → Supabase `question_banks` → PID/IFP → Game Center.

PID/IFP tidak perlu login. Halaman game hanya membaca bank soal.

Halaman `bank-soal.html` memerlukan login Guru untuk menyimpan, mengubah, dan menghapus bank.

## Identitas bank

Setiap bank dibedakan dengan:

`Game + Akun Guru + Jenjang + Kelas + Mapel + Tingkat Kesulitan`

Dengan demikian dua Guru yang mengajar mapel sama tetap memiliki bank yang terpisah.

## Empat game

- BENAR / SALAH
- GESTURE BATTLE EDU
- SPENDA FAMILY 100
- CLASH OF CHAMPIONS

Mekanisme permainan dipertahankan. `spenda-db.js` menjaga nama fungsi database lama agar game yang sudah ada tidak perlu ditulis ulang total.

## Soal bawaan

Game tidak menggunakan soal contoh/bawaan sebagai sumber permainan. Game meminta soal dari Database Sekolah sesuai filter Guru, Game, Jenjang, Kelas, Mapel, dan Kesulitan.

## Import

`spenda-import.js` menangani import dengan metadata halaman sebagai sumber utama. Jadi pilihan Game, Guru, Jenjang, Kelas, Mapel, dan Kesulitan pada halaman Database Soal Guru menjadi acuan penyimpanan; metadata lama yang tertulis di file tidak boleh memindahkan soal ke bank lain.

`spenda-import.js` menangani:
- Word `.docx`
- Excel `.xlsx` / `.xls`
- CSV
- JSON lama

Template ada di folder `templates`.

## File penting

- `config.js` — URL dan publishable key Supabase
- `spenda-db.js` — adapter Supabase + cache lokal cadangan
- `spenda-import.js` — importer soal
- `bank-soal.html` — portal login dan import Guru
- `supabase/schema.sql` — tabel, trigger, view, RLS
- `SUPABASE_SETUP.md` — langkah instalasi

## Catatan keamanan

Frontend memakai `sb_publishable_*`. Jangan menaruh `sb_secret_*` atau `service_role` di aplikasi browser/GitHub. RLS membatasi operasi tulis pada akun Guru yang sedang login.

## Deployment

Upload seluruh isi folder ke GitHub Pages dan buka melalui HTTPS. Jangan menguji PWA/kamera dengan `file:///...`.

## V18

- Memperbaiki SQL migrasi agar aman untuk database `question_banks` yang sudah dibuat sebelumnya: kolom `teacher_user_id` ditambahkan dengan `ADD COLUMN IF NOT EXISTS` sebelum proses backfill.
- Template Word dan Excel disederhanakan menjadi template isi soal; identitas bank berasal dari halaman Database Soal Guru dan akun Guru.
- Import tidak lagi memprioritaskan Nama Guru/Mapel/Kelas/Jenjang dari file lama jika metadata dari halaman sudah tersedia.
