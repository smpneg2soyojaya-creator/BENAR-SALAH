SPENDA GAME CENTER — FINAL IMPORT FIXED

Gunakan paket ini saja. Upload semua isinya ke ROOT repository GitHub Pages.
Halaman Bank Soal utama sekarang: bank-soal-final.html
bank-soal.html hanya menjadi pengarah ke halaman baru agar file importer lama tidak digunakan.

TEMPLATE RESMI:
BENAR/SALAH = No | Pernyataan | Kunci
GESTURE = No | Pertanyaan | A | B | C | D | Kunci
FAMILY 100 = No | Kategori | Pertanyaan | Jawaban1 | Skor1 | Kunci1 ...
CLASH = No | Pertanyaan | Jawaban | Kesulitan

IMPORTER V39:
- menemukan header pada sheet SOAL meskipun ada baris petunjuk/judul di atasnya
- memiliki fallback kolom jika header diubah
- meneruskan game yang dipilih ke parser
- tidak memakai spenda-import-final.js lama
