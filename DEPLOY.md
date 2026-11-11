# Panduan Deploy: Vercel + Supabase

Urutannya: **Supabase** (database) → **GitHub** (simpan kode) → **Vercel** (hosting) → uji coba.
Semua layanan memakai paket gratis.

---

## Tahap 1 — Buat database di Supabase

1. Buka https://supabase.com → **Sign in** (paling mudah pakai akun GitHub).
2. Klik **New project**:
   - **Name:** `warkop-titik-hoki`
   - **Database Password:** klik *Generate a password*, lalu **salin dan simpan** di tempat aman.
     Saran: pakai password yang hanya berisi huruf dan angka. Simbol seperti `@ # / ? %` akan merusak connection string.
   - **Region:** *Southeast Asia (Singapore)*
   - Klik **Create new project** dan tunggu sekitar 2 menit.
3. Klik tombol **Connect** di bagian atas dashboard. Salin dua connection string berikut:

   | Nama di Supabase | Port | Dipakai sebagai |
   | --- | --- | --- |
   | **Transaction pooler** | 6543 | `DATABASE_URL` (untuk aplikasi di Vercel) |
   | **Session pooler** | 5432 | `DIRECT_URL` (untuk migrasi dari laptop) |

   Ganti `[YOUR-PASSWORD]` dengan password dari langkah 2. Hasilnya kira-kira seperti ini:
   ```
   postgresql://postgres.abcdefgh:PasswordAnda@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

4. Buat tabel dan isi data awal **dari laptop**. Buka PowerShell di folder project:

   ```powershell
   $env:DATABASE_URL="postgresql://...:6543/postgres"
   $env:DIRECT_URL="postgresql://...:5432/postgres"
   $env:SEED_OWNER_NAME="Owner"
   $env:SEED_OWNER_PIN="ganti-pin-owner"      # 4-6 digit, jangan 123456
   $env:SEED_PEGAWAI_NAME="Budi"
   $env:SEED_PEGAWAI_PIN="ganti-pin-pegawai"  # 4-6 digit
   npm run db:migrate
   npm run db:seed
   ```

   Variabel `$env:` hanya berlaku di jendela PowerShell itu dan menimpa isi `.env`.
   File `.env` lokal Anda tidak berubah.

5. Cek hasilnya: di Supabase buka **Table Editor**. Harus ada 14 tabel, dan tabel `categories` berisi 8 baris.
   Semua tabel berlabel *RLS enabled*. **Jangan tambahkan policy apa pun**: aplikasi mengakses
   database lewat server, jadi tidak butuh akses publik.

---

## Tahap 2 — Upload kode ke GitHub

Repo git lokal sudah disiapkan (branch `main`, sudah ada commit).

1. Buka https://github.com/new:
   - **Repository name:** `warkop-titik-hoki`
   - Pilih **Private**
   - **Jangan** centang *Add a README* / *.gitignore* / *license*
   - Klik **Create repository**
2. Di terminal, di folder project (ganti `USERNAME`):

   ```bash
   git remote add origin https://github.com/USERNAME/warkop-titik-hoki.git
   git push -u origin main
   ```

   Saat pertama kali push, akan muncul jendela login GitHub.

---

## Tahap 3 — Deploy ke Vercel

1. Buka https://vercel.com → **Sign Up** → pilih **Hobby** → **Continue with GitHub**.
2. Klik **Add New… → Project**, lalu pilih repo `warkop-titik-hoki` dan klik **Import**.
   (Kalau repo tidak muncul, klik *Adjust GitHub App Permissions* dan beri akses ke repo itu.)
3. *Framework Preset* otomatis terdeteksi sebagai **Next.js**. Buka bagian **Environment Variables** dan isi:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | connection string **Transaction pooler** (port 6543) |
   | `SESSION_SECRET` | string acak baru (lihat di bawah) |

   Buat `SESSION_SECRET` dengan perintah:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Variabel `DIRECT_URL`, `DB_POOL_MAX`, dan `SEED_*` **tidak perlu** diisi di Vercel.
4. Klik **Deploy** dan tunggu sekitar 2 menit. Anda akan mendapat alamat seperti
   `https://warkop-titik-hoki.vercel.app`.
5. Region server sudah diatur ke Singapura lewat `vercel.json`. Bisa dicek di
   **Project → Settings → Functions → Function Region**.

---

## Tahap 4 — Uji coba

1. Buka alamat `.vercel.app` → login dengan PIN dari Tahap 1 → buat pesanan → bayar.
2. Di tablet: buka alamat itu di **Chrome Android** → menu ⋮ → **Tambahkan ke layar utama**,
   supaya aplikasi bisa dibuka seperti aplikasi biasa.
3. Printer: menu **Printer → Hubungkan Printer → Tes Cetak**.
4. Login sebagai owner → **Pengaturan Toko** → cek nama, alamat, dan catatan kaki struk.

---

## Setelah online

### Mengubah aplikasi
Setiap `git push` ke branch `main` akan otomatis di-deploy ulang oleh Vercel.

```bash
git add -A
git commit -m "deskripsi perubahan"
git push
```

Kalau Anda mengubah **struktur database** (`lib/db/schema.ts`):
1. Jalankan `npm run db:generate` untuk membuat file migrasi baru.
2. Jalankan migrasi ke Supabase dengan cara yang sama seperti Tahap 1 langkah 4 (set `$env:DIRECT_URL`, lalu `npm run db:migrate`).
3. Baru setelah itu `git push`.

### Mencegah database di-pause
Supabase Free otomatis menjeda project yang **7 hari tidak dipakai**. Buka aplikasi atau
dashboard Supabase minimal seminggu sekali. Kalau sudah terlanjur di-pause, buka dashboard
lalu klik **Restore project**.

### Backup manual (wajib sebelum demo UAS)
Paket Free tidak punya backup otomatis.

1. Pasang *PostgreSQL command line tools* dari https://www.postgresql.org/download/windows/.
   Versinya harus **sama atau lebih baru** dari versi Postgres Supabase (cek di
   **Settings → Infrastructure**).
2. Jalankan:
   ```powershell
   pg_dump "postgresql://...:5432/postgres" --no-owner --no-privileges -n public -f backup-2026-11-11.sql
   ```
   File `backup*.sql` sudah dikecualikan dari git, jadi tidak ikut ter-upload.

Untuk memulihkan backup ke database kosong:
`psql "postgresql://...:5432/postgres" -f backup-2026-11-11.sql`

---

## Kalau ada masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Build gagal: `DATABASE_URL belum diisi` | Environment variable belum diisi di Vercel. Isi, lalu **Deployments → ⋯ → Redeploy**. |
| Layar login kosong / error 500 | Buka **Vercel → Project → Logs**. Biasanya password di connection string salah atau mengandung simbol. |
| `password authentication failed` saat migrasi | Password salah, atau `[YOUR-PASSWORD]` belum diganti. |
| Migrasi macet / timeout | Pakai **Session pooler (5432)** untuk `DIRECT_URL`, bukan Transaction pooler. |
| Data lokal tidak muncul di online | Normal. Database lokal (`.pglite`) dan Supabase adalah dua database yang terpisah. |
| Printer tidak bisa dihubungkan | Wajib Chrome Android + HTTPS (`.vercel.app` sudah HTTPS) + printer yang mendukung BLE. |

> Catatan: Vercel Hobby hanya untuk penggunaan non-komersial, jadi cukup untuk tugas UAS.
> Kalau nanti dipakai warkop sungguhan, pindah ke Vercel Pro atau VPS.
