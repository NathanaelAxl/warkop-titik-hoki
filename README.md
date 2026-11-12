# Kasir Warkop Titik Hoki

Aplikasi kasir (POS) berbasis web untuk Warkop Titik Hoki — Gading Serpong, Sektor 1A.
Dipakai di satu tablet: catat pesanan per meja/pelanggan, hitung total & kembalian,
cetak struk ke printer thermal Bluetooth 58mm, dan rekap penjualan harian untuk owner.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · komponen UI bergaya shadcn/ui ·
Drizzle ORM · PostgreSQL (Supabase) · Web Bluetooth (ESC/POS)

---

## Menjalankan di laptop

### 1. Siapkan database PostgreSQL

Pilih salah satu:

- **Supabase (disarankan, sekalian dipakai saat deploy)**: buat project di region Singapura,
  buka *Connect* → salin connection string **Transaction pooler** (port 6543).
- **Docker lokal**: `docker compose up -d`, lalu pakai
  `postgresql://postgres:postgres@localhost:5432/warkop`.

### 2. Isi file `.env`

```bash
cp .env.example .env
```

Isi `DATABASE_URL` dan `SESSION_SECRET`. Buat secret acak dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Opsional: atur nama & PIN awal akun lewat `SEED_OWNER_*` dan `SEED_PEGAWAI_*`.

### 3. Pasang, migrasi, isi data awal, jalankan

```bash
npm install
npm run db:migrate   # buat tabel (RLS aktif di semua tabel)
npm run db:seed      # menu awal + akun owner & pegawai + pengaturan toko
npm run dev          # buka http://localhost:3000
```

**Akun awal** (kalau `.env` tidak diubah):

| Nama  | Peran   | PIN    |
| ----- | ------- | ------ |
| Owner | owner   | 123456 |
| Budi  | pegawai | 1234   |

> Segera ganti PIN lewat menu **Pegawai → Reset PIN** setelah login pertama.

### Perintah lain

| Perintah              | Fungsi                                               |
| --------------------- | ---------------------------------------------------- |
| `npm run build`       | Build produksi                                       |
| `npm run typecheck`   | Cek tipe TypeScript                                  |
| `npm run db:generate` | Buat file migrasi baru setelah mengubah `lib/db/schema.ts` |
| `npm run db:studio`   | Lihat isi database di browser (Drizzle Studio)       |

---

## Fitur (sesuai PRD)

| Fitur | Halaman | Akses |
| --- | --- | --- |
| Login pilih nama + PIN 4–6 digit, kunci 5 menit setelah 5x salah | `/login` | Semua |
| Daftar pesanan terbuka (kartu meja/nama, jumlah item, total, waktu) | `/` | Semua |
| Layar pesanan 2 kolom, cari menu, popup varian/rasa/topping/catatan, item sama otomatis digabung | `/order/...` | Semua |
| Simpan (tetap terbuka) & Bayar Tunai (tombol Uang Pas/20rb/50rb/100rb) atau QRIS | `/order/...` | Semua |
| Cetak struk otomatis setelah bayar, tombol Cetak Ulang kalau gagal | — | Semua |
| Riwayat transaksi hari ini + cetak ulang (`** CETAK ULANG **`) | `/transactions` | Semua (pegawai: hari ini saja) |
| Batalkan pesanan terbuka | `/order/...` | Semua |
| Batalkan transaksi yang sudah dibayar (wajib alasan) | Riwayat / Laporan | Owner |
| Hubungkan printer, tes cetak, ingat printer terakhir | `/printer` | Semua |
| Kelola kategori, menu, varian & harga, grup pilihan, urutan, nonaktifkan menu habis | `/admin/menu` | Owner |
| Tambah / nonaktifkan pegawai, reset PIN | `/admin/users` | Owner |
| Rekap harian, menu terlaris, daftar transaksi + filter, ekspor Excel (.xlsx) & CSV | `/reports` | Owner |
| Nama toko, alamat, jam buka, catatan kaki struk, jam pergantian hari | `/admin/settings` | Owner |

### Aturan bisnis penting

- **Hak akses dicek di backend** (`requireUser("owner")` di setiap route admin/laporan), bukan hanya disembunyikan di tampilan.
- **Total selalu dihitung ulang di server** dari harga di database; harga dari tablet tidak dipakai.
- **Snapshot harga:** nama, varian, harga, dan pilihan disalin ke `order_items` / `order_item_options`, jadi mengubah harga tidak mengubah transaksi lama.
- **Uang** disimpan sebagai `BIGINT` rupiah.
- **Hari bisnis:** transaksi sebelum jam pergantian (default 06:00 WIB) masuk ke hari sebelumnya. Nomor struk `TH-YYYYMMDD-NNNN` berurutan per hari bisnis.
- **Topping ropang** otomatis memakai harga Jumbo kalau varian yang dipilih bernama “Jumbo”.
- **Audit log:** login, bayar, batal, ubah menu/harga, ubah pegawai, dan ubah pengaturan tercatat di tabel `audit_logs` (siapa dan kapan).
- **Keamanan DB:** Row Level Security aktif di semua tabel tanpa policy publik, sehingga anon key Supabase tidak bisa membaca data. Browser tidak pernah mengakses database langsung.
- **Koneksi putus:** muncul banner merah; pesanan yang belum tersimpan tetap di layar dan tidak hilang diam-diam.

---

## Printer thermal

- Butuh **Chrome di Android** dan aplikasi dibuka lewat **HTTPS** (domain `.vercel.app` sudah HTTPS; `localhost` juga diizinkan Chrome).
- Printer harus mendukung **ESC/POS** dan **Bluetooth Low Energy (BLE)**. Printer yang hanya Bluetooth Classic (SPP) tidak bisa diakses dari browser — pastikan ini saat membeli printer.
- Struk dicetak 32 karakter per baris (kertas 58mm, font standar). Pratinjau struk tampil di layar setelah bayar dan di menu Riwayat, jadi aplikasi tetap bisa didemokan tanpa printer.

---

## Struktur folder

```
app/
  (app)/            halaman setelah login (kasir, riwayat, laporan, admin, printer)
  login/            layar login PIN
  api/              Route Handlers (backend)
components/         komponen UI (layar pesanan, dialog bayar, struk, dll.)
lib/
  db/schema.ts      skema database (Drizzle)
  orders.ts         logika pesanan, bayar, batal, nomor struk
  receipt.ts        format struk 32 kolom + perintah ESC/POS
  printer.ts        koneksi Web Bluetooth
  reports.ts        query laporan & CSV
scripts/seed.ts     data menu awal
drizzle/            file migrasi SQL
middleware.ts       redirect halaman sesuai login & peran
```

## Deploy

Deploy ke Vercel (Hobby) + Supabase (Free) dibahas terpisah sebagai langkah terakhir.
