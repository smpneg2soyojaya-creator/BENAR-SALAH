# SETUP V19

1. Jalankan `SUPABASE_V19_MASTER_GURU.sql` di Supabase SQL Editor.
2. Jalankan SQL V19 sekali saja; SQL ini dirancang aman bila V18 sudah ada atau baru sebagian.
3. Isi kolom email di `teacher_master`.
4. Buat akun Guru di Authentication > Users dengan email yang sama.
5. Buat/siapkan satu akun Admin, lalu set `teacher_profiles.role = admin` untuk akun tersebut.
6. Upload V19 ke GitHub Pages.
7. Login Admin di `master-guru.html`, hubungkan akun guru bila diperlukan, lalu tambahkan Mapel/Jenjang/Kelas.
8. Guru login di `bank-soal.html`. Nama Guru tidak lagi diketik manual.

## Menjadikan akun sebagai Admin
```sql
update public.teacher_profiles set role='admin', active=true where email='EMAIL_ADMIN_ANDA';
```

## Cek master & penugasan
```sql
select * from public.teacher_master_summary order by full_name;
select * from public.teacher_assignments order by teacher_user_id, level, subject, class_name;
```
