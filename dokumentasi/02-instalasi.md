# 🛠️ Panduan Instalasi

## Prerequisites

Sebelum memulai, pastikan sudah terinstall:

- **Node.js** v20 atau lebih baru
- **npm** atau **pnpm** package manager
- **Git** untuk version control
- **Wrangler CLI** (Cloudflare)
- **Akun Cloudflare** (gratis)

## Instalasi Lokal

### 1. Clone Repository

```bash
git clone https://github.com/add146/absen.git
cd absen
```

### 2. Install Wrangler CLI

```bash
npm install -g wrangler

# Login ke Cloudflare
wrangler login
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 4. Setup Worker (Backend)

```bash
cd worker

# Install dependencies
npm install

# Buat file environment lokal
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:
```
JWT_SECRET=your-super-secret-key-here
ENVIRONMENT=development
```

Jalankan worker lokal:
```bash
npm run dev
```

Worker API akan berjalan di `http://localhost:8787`

## Setup Cloudflare Resources

### 1. Buat D1 Database

```bash
# Buat database
wrangler d1 create absen-db

# Catat database_id yang muncul, tambahkan ke wrangler.toml
```

Jalankan migration:
```bash
wrangler d1 execute absen-db --file=./schema/migrations/0001_initial.sql
```

### 2. Buat R2 Bucket

```bash
wrangler r2 bucket create absen-files
```

### 3. Buat KV Namespace

```bash
wrangler kv:namespace create CACHE

# Untuk preview/development
wrangler kv:namespace create CACHE --preview
```

### 4. Update wrangler.toml

```toml
name = "absen-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "absen-db"
database_id = "<your-database-id>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "absen-files"

[[kv_namespaces]]
binding = "CACHE"
id = "<your-kv-id>"
preview_id = "<your-preview-kv-id>"

[vars]
ENVIRONMENT = "production"
```

## Deployment

### Deploy Worker

```bash
cd worker
wrangler deploy
```

### Deploy Frontend ke Cloudflare Pages

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih **Workers & Pages** → **Create**
3. Klik **Connect to Git**
4. Pilih repository `add146/absen`
5. Konfigurasi build:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
6. Tambahkan environment variable:
   - `VITE_API_URL`: URL worker API Anda

## Verifikasi Instalasi

### Cek Worker
```bash
curl https://absen-api.<your-account>.workers.dev/health
# Response: {"status":"ok"}
```

### Cek Database
```bash
wrangler d1 execute absen-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Cek Frontend
Buka URL Cloudflare Pages di browser.

## Troubleshooting

### Error: "Database not found"
- Pastikan `database_id` di `wrangler.toml` benar
- Jalankan migration jika belum

### Error: "KV namespace not found"
- Pastikan ID di `wrangler.toml` sesuai dengan output `wrangler kv:namespace create`

### Error: "R2 bucket not found"
- Cek nama bucket dengan `wrangler r2 bucket list`

### Frontend tidak connect ke API
- Pastikan `VITE_API_URL` diset dengan benar
- Cek CORS settings di worker
