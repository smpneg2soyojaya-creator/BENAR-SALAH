# SPENDA Game Center V17 — Supabase Native + Auth Guru + RLS

## 1. Database
Buka Supabase → SQL Editor → New Query.
Jalankan seluruh isi:

`supabase/schema.sql`

SQL tersebut membuat:
- `question_banks`
- `teacher_profiles`
- index pencarian
- trigger `updated_at`
- trigger pembuatan profil setelah akun Auth dibuat
- RLS untuk Guru/Admin
- view ringkasan bank soal

## 2. Buat akun Guru
Buka Supabase:
Authentication → Users → Add user → Create new user.

Gunakan email dan password masing-masing guru.

Profil `teacher_profiles` akan dibuat otomatis oleh trigger.
Nama awal diambil dari `user_metadata.full_name`; jika tidak ada, digunakan bagian email sebelum `@`.

Admin dapat memperbaiki nama melalui SQL:

```sql
update public.teacher_profiles
set full_name='Nama Lengkap Guru'
where user_id=(
  select id from auth.users where email='guru@sekolah.sch.id'
);
```

## 3. Konfigurasi frontend
File `config.js` sudah berisi:

```text
SCHOOL_ID = SMPN2SOYOJAYA
SUPABASE_URL = project URL sekolah
SUPABASE_PUBLISHABLE_KEY = publishable key
TABLE = question_banks
```

Gunakan hanya `sb_publishable_*` pada frontend.
Jangan pernah memasukkan `sb_secret_*` atau `service_role` ke GitHub.

## 4. Alur Guru

Login Guru
→ pilih Game
→ Jenjang
→ Kelas
→ Mapel
→ Tingkat Kesulitan
→ Import Word / Excel
→ tersimpan di Supabase atas nama akun Guru.

Guru tidak mengisi nama guru secara manual pada saat menyimpan. Nama bank diambil dari `teacher_profiles` akun yang sedang login.

## 5. Alur PID / IFP

Game Center tidak meminta login.
Game membaca `question_banks` melalui SELECT dan mencari:

`Game + Nama Guru + Jenjang + Kelas + Mapel + Kesulitan`

Hanya bank dengan kombinasi tersebut yang digunakan. Soal bawaan aplikasi tidak dipakai sebagai sumber permainan.

## 6. Penting untuk keamanan
RLS adalah lapisan keamanan database. Publishable key boleh berada di browser, tetapi `anon` hanya diberi SELECT; INSERT/UPDATE/DELETE diberikan kepada `authenticated` dan dibatasi pada bank milik akun Guru.

## 7. GitHub Pages
Setelah SQL selesai dan akun Guru tersedia, upload seluruh folder aplikasi ke repository GitHub Pages.
Jalankan melalui HTTPS/GitHub Pages, bukan `file:///...`, terutama untuk PWA dan kamera Gesture.

## 8. Jika bank lama sudah ada
SQL V17 mencoba menghubungkan bank lama ke `teacher_profiles` berdasarkan kesamaan nama Guru. Jika tidak ditemukan pasangan, `teacher_user_id` tetap NULL sehingga Game Center masih dapat membaca bank tersebut, tetapi bank tersebut tidak otomatis menjadi milik akun Guru untuk diedit.
