# SPENDA Game Center V29

V29 memperbaiki dua masalah utama pada V28:

1. Login Admin gagal karena policy RLS `teacher_profiles` memanggil dirinya sendiri dan menyebabkan `infinite recursion`.
2. `teacher_master_summary` adalah VIEW dan memang read-only. Data Guru diedit di `teacher_master` melalui halaman Master Guru.

## Identitas Guru
NIP adalah ID Guru aplikasi. Email tidak diperlukan pada `teacher_master`. Password Guru dikelola melalui Supabase Auth/Edge Function.

## Perbaikan RLS
V29 tidak memakai policy SELECT pada `teacher_profiles` yang memanggil `teacher_profiles` lagi. Profil login dibaca melalui RPC security-definer `get_my_teacher_profile()`. Fungsi admin `is_spenda_admin()` juga security-definer.

## Pemasangan
1. Jalankan `SUPABASE_V29_RLS_REPAIR.sql` di Supabase SQL Editor.
2. Bila muncul peringatan RLS, pilih **Run and enable RLS**.
3. Upload semua isi folder V29 ke repository GitHub Pages.
4. Buka Game Center seperti biasa.

## Master Guru
- Data Guru diedit melalui form pada halaman Master Guru.
- `teacher_master_summary` hanya ringkasan/read-only.
- Login Admin memakai akun Supabase role `admin`.
- Login Guru memakai dropdown Nama Guru + password; Nama Guru berasal dari `teacher_master`.
