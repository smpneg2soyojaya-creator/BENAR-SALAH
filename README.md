# SPENDA Game Center V27

## Fokus versi ini
V27 melanjutkan aplikasi Game Center yang sama. Tidak membuat game baru.

Perubahan inti:
- NIP menjadi ID Guru aplikasi.
- Tidak ada email Guru pada `teacher_master`.
- Guru login dengan dropdown Nama Guru + Password.
- Admin dapat membuat/mengubah password Guru dari halaman Master Guru.
- Master Guru menyimpan penugasan Guru -> Mapel -> Kelas.
- Bank soal tetap terkait Game + Guru + Jenjang + Kelas + Mapel + Kesulitan.
- Game membaca bank soal Supabase; soal bawaan bukan sumber permainan.

## Database Supabase
Jalankan `SUPABASE_V27.sql` pada Supabase SQL Editor.

Jika editor menampilkan peringatan RLS, pilih `Run and enable RLS`.

SQL ini tidak drop table atau drop column.

## Akun Guru
Untuk membuat/mengubah password dari aplikasi, Edge Function `spenda-admin-teacher-account` harus dideploy.

Supabase menyediakan secret keys untuk Edge Functions; jangan pernah memasukkan secret/service key ke GitHub atau kode browser. Publishable key digunakan pada browser. RLS membatasi akses database.

## Edge Function
Folder:
`supabase/functions/spenda-admin-teacher-account/index.ts`

`supabase/config.toml` memastikan `verify_jwt = true`.

### Deploy dengan Supabase CLI
```bash
supabase login
supabase link --project-ref gygngkucqzjtgswwenuh
supabase functions deploy spenda-admin-teacher-account
```

Untuk fungsi ini, platform menyediakan secret key server-side. Jangan menyalin secret key ke `config.js`.

Edge Function menggunakan Supabase Auth Admin API di server untuk membuat atau mengubah password akun Guru. Supabase mendokumentasikan bahwa fungsi admin Auth yang memerlukan secret/service key harus dijalankan hanya di server. 

## Aplikasi GitHub Pages
Upload seluruh isi folder V27 ke repository GitHub Pages.

`config.js` sudah berisi Project URL dan Publishable Key yang digunakan pada project Anda.

## Alur Admin
1. Buka `master-guru.html`.
2. Login Admin.
3. Pilih Guru.
4. Buat/Ubah Password Guru.
5. Tambahkan Mapel + Jenjang + Kelas.

## Alur Guru
1. Buka `bank-soal.html`.
2. Pilih Nama Guru dari dropdown.
3. Masukkan Password yang ditentukan Admin.
4. Mapel dan Kelas muncul sesuai penugasan.
5. Import Word/Excel.

## Alur PID/IFP
1. Buka Game Center.
2. Pilih game.
3. Pilih Guru, Mapel, Kelas.
4. Game membaca hanya bank yang sesuai dari Supabase.

## Catatan keamanan
Password Guru tidak disimpan pada `teacher_master`.
NIP hanya menjadi identitas Guru aplikasi dan dasar untuk membentuk identifier login internal pada Supabase Auth.

Publishable key aman berada di frontend jika RLS dikonfigurasi dengan benar; secret/service key hanya berada di Edge Function. RLS Supabase bekerja berdasarkan policy dan `auth.uid()`.

## V27: akun Guru tanpa email
- NIP menjadi ID Guru.
- Password ditentukan Admin.
- `teacher_master` tidak membutuhkan email Guru.
- Admin membuat/mengubah password melalui Edge Function `spenda-admin-teacher-account`.
- Halaman Bank Soal menampilkan dropdown Nama Guru dan mengambil nama dari `teacher_master`.


## V27 – cache-proof deployment
V27 menggunakan nama file database `spenda-db-v27.js` agar GitHub Pages tidak lagi memuat file database versi lama dari cache browser/service worker. Upload seluruh isi paket V27 ke repository GitHub Pages.
