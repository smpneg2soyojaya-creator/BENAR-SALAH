SPENDA GAME CENTER — PAKET FINAL

GITHUB
1. Ekstrak ZIP ini.
2. Upload seluruh isi ZIP ke ROOT repository GitHub Pages.
3. Tidak ada paket V21/V22/V23 dan tidak ada folder aplikasi bersarang.
4. Folder templates tetap satu folder.

SUPABASE
Data Guru dikelola langsung pada public.teacher_master.
Password akun dikelola langsung pada Supabase Authentication > Users.
Penugasan Mapel/Kelas dikelola pada public.teacher_assignments.

PASSWORD GURU
Aplikasi tidak membuat password Guru. Tidak ada Edge Function password.
Buat user Guru di Supabase Authentication > Users dengan email teknis berdasarkan NIP:
[NIP tanpa spasi/tanda]@login.spenda.local
Contoh NIP 19850416 2019031004 menjadi:
198504162019031004@login.spenda.local
Password ditetapkan langsung saat membuat user.

LOGIN GURU
Dropdown hanya menampilkan nama Guru. NIP/NIPPPK tidak ditampilkan.
Setelah nama dipilih, Guru memasukkan password dan login.

PENUGASAN
Satu Guru dapat memiliki banyak penugasan. Setiap Mapel/Kelas dibuat sebagai satu baris pada teacher_assignments.
Contoh:
Guru A + IPA + VII
Guru A + Matematika + VIII

DATABASE SOAL
Setelah Guru login, nama Guru otomatis mengikuti akun. Mapel, Jenjang, dan Kelas diambil dari teacher_assignments.
