SPENDA GAME CENTER - FINAL

GITHUB
Ekstrak ZIP ini dan upload seluruh isi langsung ke ROOT repository GitHub Pages. Tidak ada folder V21-V37 di dalam paket ini.

LOGIN GURU
1. Nama Guru berasal dari public.teacher_master.
2. Dropdown hanya menampilkan Nama Guru. NIP tidak tampil di samping nama.
3. Password Guru disimpan pada kolom public.teacher_master.password.
4. Guru login dengan memilih Nama Guru + Password.

ADMIN
- Login Admin tetap memakai akun Admin Supabase yang sudah ada.
- Admin tidak membuat akun Guru dari aplikasi. Data Guru dan password dikelola langsung pada tabel teacher_master di Supabase.

PENUGASAN
- Penugasan berada pada public.teacher_assignments.
- Satu Guru dapat memiliki banyak Mapel/Kelas.
- Admin dapat menambahkan beberapa baris penugasan untuk Guru yang sama.

SETUP SUPABASE
Jalankan file SUPABASE_TEACHER_PASSWORD.sql satu kali. File tersebut menambahkan kolom password dan teacher_master_id serta RPC login/penugasan/bank soal.

CATATAN KEAMANAN
Kolom password mengikuti permintaan aplikasi ini dan berarti password tersimpan sebagai teks di database. Jangan memberikan akses baca teacher_master kepada anon/public. Aplikasi tidak membaca kolom password; login dilakukan melalui RPC verifikasi.
