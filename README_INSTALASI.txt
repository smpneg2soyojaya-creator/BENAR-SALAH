SPENDA GAME CENTER - PAKET FINAL BERSIH

GUNAKAN PAKET INI SAJA. Semua file aplikasi berada langsung di ROOT ZIP.

GITHUB
1. Ekstrak ZIP.
2. Upload semua file ke ROOT repository GitHub Pages.
3. Folder templates tetap sebagai folder.

SUPABASE - JALANKAN SEKALI
Jalankan SUPABASE_SETUP_GURU_LOGIN.sql di Supabase SQL Editor. SQL ini hanya menyiapkan login Guru dan membuat teacher_user_id pada penugasan boleh kosong.

DATA GURU
Tambah/edit Guru langsung di public.teacher_master. Aplikasi tidak menyediakan form tambah/edit/hapus Guru.

PASSWORD GURU
Password TIDAK disimpan di teacher_master. Admin mengatur password langsung di Supabase Authentication > Users. Aplikasi tidak lagi memakai Edge Function spenda-admin-teacher-account. Jadi error CORS Edge Function tersebut tidak lagi diperlukan.

LOGIN GURU
Aplikasi menampilkan dropdown berisi NAMA saja. NIP/NIPPPK tidak ditampilkan. Untuk login, sistem memakai NIP di belakang layar sebagai identitas teknis.

Saat membuat user Guru di Supabase Authentication, gunakan email internal berbasis NIP:
NIP dinormalisasi menjadi huruf kecil dan hanya huruf/angka, lalu tambahkan @login.spenda.local
Contoh: NIPPPK. 19990202 202421 2 008 -> nipppk199902022024212008@login.spenda.local
Password ditetapkan saat membuat user tersebut.

PENUGASAN MAPEL & KELAS
Satu Guru boleh memiliki beberapa baris pada teacher_assignments, sehingga satu Guru dapat memegang 2 Mapel atau lebih.

MASTER GURU
Halaman Master Guru hanya dipakai untuk penugasan Mapel/Kelas dan tidak lagi berisi pembuatan password atau daftar manajemen akun Guru.
