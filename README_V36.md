# SPENDA Game Center V36 — Master Guru Simplified

Perubahan utama:

1. Halaman Master Guru tidak lagi membuka Dashboard Admin karena session browser lama. Halaman selalu meminta login Admin.
2. Setelah login Admin berhasil, area Login Guru dan Login Admin disembunyikan sepenuhnya.
3. Bagian "Data Guru" dan "Daftar Guru" dihapus dari tampilan Master Guru. Data Guru yang sudah ada di `teacher_master` cukup dipilih.
4. Pengaturan akun Guru disederhanakan menjadi: pilih Guru → password baru → ulangi password → Simpan Password Guru.
5. NIP tidak perlu diisi/dilihat pada form pengaturan password.
6. Login Guru tetap memakai dropdown nama Guru + password.
7. Satu Guru dapat memiliki banyak penugasan Mapel/Kelas. Setiap kombinasi disimpan sebagai penugasan terpisah.
8. Layout dibuat responsif untuk desktop dan HP.

Catatan Edge Function:
Fitur pembuatan/perubahan password Guru membutuhkan Edge Function `spenda-admin-teacher-account`, karena perubahan password Auth untuk akun lain tidak boleh dilakukan dengan secret key di browser. Source function sudah disertakan pada folder `supabase/functions/spenda-admin-teacher-account/`.


## Perubahan V36
Pesan error pada halaman Admin disederhanakan agar tidak menampilkan istilah teknis Edge Function kepada pengguna.
