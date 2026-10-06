# SPENDA Game Center V31

## Fokus V31
- Dropdown Login Guru menampilkan NAMA GURU saja.
- NIP tetap dipakai internal sebagai ID Guru, tetapi tidak ditampilkan di dropdown.
- Admin login diperbaiki dengan RPC `get_my_teacher_profile()` SECURITY DEFINER.
- RLS `teacher_profiles` tidak lagi menyebabkan infinite recursion.
- `teacher_master` adalah tabel utama yang dapat dikelola Admin dari halaman Master Guru.
- `teacher_master_summary` tetap VIEW/read-only dan bukan tempat input data.

## Instalasi
1. Jalankan `SUPABASE_V31_FIX.sql` di Supabase SQL Editor.
2. Jika Supabase menampilkan peringatan RLS, pilih **Run and enable RLS**.
3. Upload seluruh isi folder ini ke GitHub Pages.
4. Buka Game Center dari alamat GitHub Pages seperti biasa.
5. Buka Master Guru.

## Login Admin
Akun Admin harus sudah ada di Supabase Authentication > Users, dan harus memiliki row `teacher_profiles` dengan `role = 'admin'`, `active = true`, dan `school_id = 'SMPN2SOYOJAYA'`.

## Login Guru
Nama dipilih dari `teacher_master`. Password dikelola Admin melalui sistem akun Guru.
