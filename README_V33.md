# SPENDA Game Center V33

Perbaikan utama pada `master-guru.html`:
- Dashboard Admin TIDAK dibuka otomatis hanya karena session Supabase tersimpan.
- Email + password Admin wajib diproses melalui Supabase Auth sebelum Dashboard tampil.
- Seluruh panel `LOGIN GURU` dan `LOGIN ADMIN` disembunyikan setelah Admin berhasil login.
- Jika autentikasi/otorisasi gagal, halaman kembali ke form login.
- Login Guru tidak dapat membuka Dashboard Admin.
- Tata letak Master Guru dibuat lebih proporsional dan responsif untuk HP.

Upload seluruh isi folder ini ke GitHub Pages. Edge Function `spenda-admin-teacher-account` berada di `supabase/functions/spenda-admin-teacher-account/index.ts` dan tetap harus dideploy di project Supabase agar fitur pembuatan password Guru berfungsi.
