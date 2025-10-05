# Konsensus Bot

Konsensus Bot adalah aplikasi web yang memungkinkan Anda membandingkan jawaban dari banyak model AI secara bersamaan. Antarmukanya menonjolkan kategori model gratis dan berbayar, riwayat percakapan, arsip percakapan yang dapat dimuat ulang, serta panel tampilan Markdown lengkap dengan highlight kode.

## Fitur
- **Perbandingan model**: Pilih beberapa model sekaligus dari daftar yang diambil dari `public/extracted_status.json` dan bandingkan jawabannya secara berdampingan.
- **Kategori model**: Beralih antara tab `Gratis` dan `Berbayar` untuk memfilter model berdasarkan statusnya.
- **Riwayat & arsip**: Simpan tiap prompt ke riwayat lokal, arsipkan percakapan lengkap, muat ulang, atau hapus arsip yang tidak diperlukan.
- **Markdown & highlight kode**: Jawaban dirender memakai `marked` dan `PrismJS`, mendukung blok kode dengan pewarnaan sintaks.
- **Mode gelap & terang**: Toggle tema disimpan di `localStorage` dan menghormati preferensi sistem pengguna.

## Teknologi yang Digunakan
- **Framework**: Vue 3 dengan `<script setup>`.
- **Build tool**: Vite.
- **Styling**: Tailwind CDN dan styling kustom di `src/style.css`.
- **Markdown**: `marked` untuk parsing dan `PrismJS` untuk highlight.
- **Penyimpanan lokal**: Arsip percakapan disimpan sementara di memori (`src/services/chatArchive.ts`).

## Struktur Proyek
- `src/App.vue`: Antarmuka utama yang menampilkan daftar model, riwayat, arsip, dan panel jawaban.
- `src/composables/useChatModels.ts`: Logika utama untuk memilih model, mengirim prompt, memproses streaming jawaban OpenRouter, serta mengelola riwayat/arsip.
- `src/services/chatArchive.ts`: Utilitas untuk menyimpan dan mengambil arsip percakapan di memori.
- `public/extracted_status.json`: Daftar model yang tersedia dan status gratis/berbayar.
- `vite.config.js`: Konfigurasi Vite dengan plugin Vue.

## Prasyarat
- Node.js 18 atau lebih baru.
- npm (bundled dengan Node) atau pengelola paket lain (yarn/pnpm).

## Memulai
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
   Aplikasi biasanya tersedia di `http://localhost:5173`.
3. Untuk build produksi:
   ```bash
   npm run build
   ```
4. Pratinjau build produksi:
   ```bash
   npm run preview
   ```

## Konfigurasi OpenRouter
Aplikasi meminta jawaban dari API OpenRouter (`https://openrouter.ai/api/v1/chat/completions`). Secara default, kunci API disetel di `useChatModels.ts` lewat konstanta `OPENROUTER_KEY`. Demi keamanan, gantilah dengan variabel lingkungan dan hindari menyimpan kunci pribadi di kode sumber:

```ts
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY
```

Kemudian buat file `.env` (terabaikan oleh Git) dengan isi:

```
VITE_OPENROUTER_KEY=sk-or-...
```

Pastikan juga menambahkan header `HTTP-Referer` dan `X-Title` sesuai panduan OpenRouter.

## Menambah atau Memperbarui Daftar Model
- Sunting `public/extracted_status.json` untuk memutakhirkan daftar model.
- Setiap entri harus memiliki `id`, `name`, dan `status` (`gratis` atau `bayar`).

## Catatan Pengembangan
- Riwayat dan arsip hanya hidup selama sesi aplikasi. Implementasi penyimpanan permanen (misalnya database) belum tersedia.
- Tailwind di-load melalui CDN di `index.html`. Anda dapat memigrasikan ke integrasi penuh Tailwind/Tailwind CLI bila diperlukan.

## Lisensi
Lisensi proyek belum ditentukan. Tambahkan atau perbarui bagian ini sesuai kebutuhan organisasi Anda.
