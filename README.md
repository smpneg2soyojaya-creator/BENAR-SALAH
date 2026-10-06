# SPENDA Game Center V19

V19 menambahkan Master Guru, Penugasan Mapel/Kelas, dan keterkaitan dengan akun Supabase Auth. Pada `bank-soal.html`, Nama Guru otomatis berasal dari akun login dan Jenjang/Mapel/Kelas hanya menampilkan penugasan guru.

## Alur Admin
1. Jalankan `SUPABASE_V19_MASTER_GURU.sql` setelah V18.
2. Lengkapi email guru pada `teacher_master`.
3. Buat akun Guru di Supabase Authentication menggunakan email yang sama.
4. Buka `master-guru.html` sebagai Admin dan Hubungkan Akun bila belum otomatis terhubung.
5. Tambahkan penugasan Mapel + Jenjang + Kelas.

## Alur Guru
Login `bank-soal.html` → Nama Guru otomatis → pilih penugasan → import Word/Excel.

## Game
PID/IFP tetap membaca `question_banks` dari Supabase; mekanisme game dipertahankan.
