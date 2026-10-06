# SPENDA Game Center V34

## Perubahan
- Akun Login Guru dibuat sesederhana mungkin: pilih Guru, buat password, simpan.
- Form password Admin tidak menampilkan NIP; NIP tetap dipakai internal sebagai ID login.
- Guru login: pilih nama dari dropdown + masukkan password.
- Satu Guru dapat memiliki banyak Mapel/Kelas.
- Penugasan dengan Mapel/Kelas berbeda disimpan sebagai baris terpisah, jadi 2 Mapel untuk guru yang sama didukung.
- Layout Master Guru tetap responsive untuk desktop dan HP.
- Database JS dan service worker diberi versi V34 agar perubahan lebih mudah terbaca setelah upload GitHub.

## Alur Admin
1. Login Admin dengan email + password Supabase.
2. Buka `Akun Login Guru`.
3. Pilih Guru.
4. Isi Password dan Ulangi Password.
5. Klik `Simpan Password Guru`.

## Alur Guru
1. Buka Login Guru.
2. Pilih nama Guru.
3. Masukkan password yang dibuat Admin.
4. Login.

## Guru dengan 2 Mapel
Pilih Guru yang sama pada `Penugasan Mapel & Kelas`, misalnya:
- Matematika — SMP — VII
- Bahasa Inggris — SMP — VIII
Keduanya akan tersimpan sebagai dua penugasan. Saat Guru login, halaman Database Soal akan membaca semua penugasannya sehingga kedua Mapel dapat dipilih.

## Catatan password
Pembuatan/perubahan password Supabase Auth dari halaman Admin menggunakan Edge Function `spenda-admin-teacher-account`. Function harus dideploy satu kali di project Supabase. Setelah dideploy, Admin tidak perlu memasukkan email internal Guru.
