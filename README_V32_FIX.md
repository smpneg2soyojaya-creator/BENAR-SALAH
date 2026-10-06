# SPENDA Game Center — Master Guru Fix

## Yang diperbaiki

- Dashboard Admin **tidak lagi terbuka otomatis hanya karena ada sesi Supabase yang tersimpan**. Admin harus menekan tombol **Masuk Admin** dan melewati autentikasi pada form.
- Saat Admin berhasil login, halaman login Guru/Admin disembunyikan sehingga Dashboard Admin tidak bercampur dengan form login.
- Layout Master Guru dibuat lebih responsif untuk desktop, tablet, dan HP.
- Form **Akun Login Guru** disusun ulang agar tidak melebar keluar layar pada perangkat kecil.
- Penugasan Mapel & Kelas mengirim `teacher_master_id` dan NIP dengan benar saat disimpan.
- Pesan error Edge Function dibuat lebih jelas ketika fungsi belum tersedia.
- Service worker menggunakan cache versi baru agar perubahan frontend lebih cepat diterapkan.

## Database Admin yang digunakan

Akun Admin harus mempunyai profil:

- `school_id = SMPN2SOYOJAYA`
- `role = admin`
- `active = true`

Pada kondisi database Anda, profil Admin sudah benar.

## Penting: Edge Function berbeda dengan GitHub Pages

File HTML/CSS/JavaScript aplikasi dapat di-upload ke GitHub Pages.

Namun fungsi server `spenda-admin-teacher-account` **tidak berjalan dari GitHub Pages**. Fungsi tersebut harus di-deploy ke Supabase Edge Functions. Supabase menyediakan deployment melalui Dashboard atau CLI. Setelah fungsi aktif, aplikasi dapat memanggilnya melalui `supabase.functions.invoke(...)`.

Source fungsi tersedia di:

`supabase/functions/spenda-admin-teacher-account/index.ts`

Konfigurasi JWT tersedia di:

`supabase/config.toml`

Fungsi tersebut memerlukan akses server-side untuk operasi pengelolaan akun Auth. Secret key tidak boleh dimasukkan ke `config.js`, HTML, atau repository GitHub.

## Deployment Edge Function melalui Supabase Dashboard

1. Buka project Supabase `gygngkucqzjtgswwenuh`.
2. Buka menu **Edge Functions**.
3. Pilih **Deploy a new function**.
4. Buat function dengan nama tepat:

   `spenda-admin-teacher-account`

5. Gunakan file:

   `supabase/functions/spenda-admin-teacher-account/index.ts`

6. Pastikan `verify_jwt = true` sesuai `supabase/config.toml`.
7. Deploy function.
8. Kembali ke `master-guru.html` dan coba **Buat / Ubah Password Guru**.

## Login Guru

Guru memilih **Nama Guru** dari `teacher_master`.

NIP tetap menjadi ID internal login.

Password dikelola Admin melalui Edge Function.

Email internal Supabase tidak ditampilkan kepada Guru.

## Penugasan

Admin dapat menetapkan:

`Guru → Jenjang → Mapel → Kelas`

Guru dapat mempunyai lebih dari satu penugasan.

## Upload GitHub

Upload seluruh isi folder paket ini ke repository GitHub Pages.

Setelah upload, buka kembali Game Center dan Master Guru.

Tidak perlu mengubah `config.js`; konfigurasi Supabase sudah berada pada file tersebut.
