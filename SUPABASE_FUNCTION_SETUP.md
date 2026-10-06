# SPENDA Game Center V26 — Pengaturan Akun Guru

Bagian ini adalah langkah satu kali agar Admin dapat membuat/mengubah password Guru langsung dari halaman `master-guru.html`.

## Penting

Jangan masukkan `sb_secret_*`, `service_role`, atau secret key apa pun ke `config.js` atau GitHub.

Secret key hanya dipakai di Supabase Edge Function. Supabase saat ini menyediakan secret keys untuk Edge Functions melalui environment variables server-side. Publishable key tetap berada di aplikasi browser. RLS tetap menjadi pengaman tabel. 

## 1. Jalankan SQL

Di Supabase:

`SQL Editor` → `New query`

Jalankan:

`SUPABASE_V26.sql`

Jika Supabase menampilkan peringatan RLS saat membuat tabel, pilih **Run and enable RLS**.

## 2. Pastikan Admin sudah punya profile

Admin yang digunakan untuk masuk ke `master-guru.html` harus mempunyai baris pada `teacher_profiles` dengan:

- `role = 'admin'`
- `active = true`

Contoh jika akun Admin sudah dibuat di Authentication → Users:

```sql
insert into public.teacher_profiles (user_id, full_name, role, active, school_id)
select id, 'ADMIN SPENDA', 'admin', true, 'SMPN2SOYOJAYA'
from auth.users
where email = 'EMAIL_ADMIN_ANDA'
  and not exists (
    select 1 from public.teacher_profiles p where p.user_id = auth.users.id
  );
```

Ganti `EMAIL_ADMIN_ANDA` dengan email akun Admin yang memang digunakan untuk login Admin.

## 3. Deploy Edge Function

Edge Function:

`spenda-admin-teacher-account`

File sumber sudah disertakan pada:

`supabase/functions/spenda-admin-teacher-account/index.ts`

Dan pengaturan JWT:

`supabase/config.toml`

Nilai `verify_jwt = true` dipertahankan karena fungsi ini hanya boleh dipanggil oleh Admin yang sudah login.

Supabase mendokumentasikan bahwa Edge Function secara default dapat mewajibkan JWT, dan fungsi dapat dipanggil dari browser dengan `supabase.functions.invoke(...)`. 

### Cara deploy dengan Supabase CLI

Di komputer yang sudah memasang Supabase CLI:

```bash
supabase login
supabase link --project-ref gygngkucqzjtgswwenuh
supabase functions deploy spenda-admin-teacher-account
```

Setelah berhasil, fungsi akan tersedia pada project Supabase Anda.

## 4. Jangan membuat email Guru

Guru tidak menggunakan email sebagai ID aplikasi.

Aplikasi memakai:

`NIP = ID Guru`

Supabase Auth menggunakan identifier internal yang dibuat otomatis oleh Edge Function dari NIP, misalnya:

`198504162019031004@login.spenda.local`

Identifier ini tidak ditampilkan di halaman Guru dan tidak perlu dimasukkan ke `teacher_master`.

## 5. Membuat password Guru

Setelah Edge Function aktif:

1. Buka `master-guru.html`.
2. Login sebagai Admin.
3. Pada `Akun Login Guru`, pilih Guru.
4. Pastikan NIP terlihat.
5. Isi Password Baru.
6. Isi Ulangi Password.
7. Klik `Buat / Ubah Password Guru`.

Akun Guru akan dibuat atau password-nya diperbarui.

## 6. Penugasan Guru

Setelah akun dibuat:

1. Pilih Guru pada `Penugasan Mapel & Kelas`.
2. Pilih Jenjang.
3. Isi Mapel.
4. Isi Kelas.
5. Klik `Tambah Penugasan`.

Contoh:

`SUYONO, S.Pd → Matematika → SMP → VII`

Guru dapat memiliki banyak penugasan.

## 7. Login Guru

Guru membuka `bank-soal.html`.

Guru cukup:

`Pilih Nama Guru → Password → Masuk`

Tidak ada input email.

Setelah login, Mapel dan Kelas hanya berasal dari penugasan Admin.

## 8. Game Center / PID / IFP

Siswa tidak login.

Game hanya membaca `question_banks` dari Supabase berdasarkan:

`Game + Guru + Jenjang + Kelas + Mapel + Kesulitan`

## 9. Catatan keamanan

RLS harus tetap aktif. Jangan memilih `Run without RLS` untuk tabel yang menyimpan data guru, penugasan, atau bank soal. Supabase menjelaskan bahwa RLS adalah mekanisme authorization level-baris dan menggunakan `auth.uid()` untuk membatasi akses pengguna. 

Secret/service key hanya boleh berada di sisi server/Edge Function dan tidak boleh masuk ke browser atau repository GitHub.
