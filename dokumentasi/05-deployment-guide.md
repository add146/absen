# 🚀 Deployment Guide

## Overview

Aplikasi ini di-deploy ke **Cloudflare** dengan arsitektur:
- **Frontend**: Cloudflare Pages
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV

## Prerequisites

1. Akun Cloudflare (gratis dapat digunakan)
2. Repository GitHub sudah ter-push
3. Wrangler CLI terinstall dan login

## Step 1: Buat Cloudflare Resources

### 1.1 Buat D1 Database

```bash
# Buat database production
wrangler d1 create absen-db

# Output:
# ✅ Successfully created DB 'absen-db' in region 'APAC'
# Created your database using D1's new storage backend.
#
# [[d1_databases]]
# binding = "DB"
# database_name = "absen-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Simpan `database_id` untuk digunakan di `wrangler.toml`.

### 1.2 Jalankan Migration

```bash
wrangler d1 execute absen-db --file=./schema/migrations/0001_initial.sql
```

Verifikasi tabel:
```bash
wrangler d1 execute absen-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 1.3 Buat R2 Bucket

```bash
wrangler r2 bucket create absen-files

# Output:
# ✅ Created bucket 'absen-files'
```

### 1.4 Buat KV Namespace

```bash
# Production namespace
wrangler kv:namespace create CACHE

# Output:
# ✅ Created namespace 'absen-api-CACHE' with ID 'xxxxx'

# Preview namespace (untuk development)
wrangler kv:namespace create CACHE --preview

# Output:
# ✅ Created namespace 'absen-api-CACHE_preview' with ID 'xxxxx'
```

## Step 2: Konfigurasi wrangler.toml

Update file `worker/wrangler.toml`:

```toml
name = "absen-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "absen-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Ganti dengan ID Anda

# R2 Storage
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "absen-files"

# KV Cache
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxx"  # Ganti dengan ID production
preview_id = "xxxxxxxx"  # Ganti dengan ID preview

# Environment Variables
[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "https://absen.pages.dev"

# Secrets (diset via wrangler secret)
# JWT_SECRET - set via: wrangler secret put JWT_SECRET
```

## Step 3: Set Secrets

```bash
cd worker

# Set JWT secret
wrangler secret put JWT_SECRET
# Masukkan secret key yang aman (minimal 32 karakter random)
```

## Step 4: Deploy Worker

```bash
cd worker

# Deploy ke Cloudflare
wrangler deploy

# Output:
# ✅ Deployed absen-api to https://absen-api.<account>.workers.dev
```

Verifikasi deployment:
```bash
curl https://absen-api.<account>.workers.dev/health
```

## Step 5: Setup Cloudflare Pages

### Via Dashboard (Recommended)

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih **Workers & Pages** → **Create application**
3. Tab **Pages** → **Connect to Git**
4. Authorize GitHub dan pilih repository `add146/absen`
5. Konfigurasi build:

| Setting | Value |
|---------|-------|
| Project name | `absen` |
| Production branch | `main` |
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `frontend` |

6. Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://absen-api.<account>.workers.dev` |
| `NODE_VERSION` | `20` |

7. Klik **Save and Deploy**

### Via Wrangler CLI

```bash
cd frontend

# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=absen
```

## Step 6: Setup GitHub Actions (CI/CD)

### 6.1 Buat API Token

1. Buka [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Klik **Create Token**
3. Gunakan template **Edit Cloudflare Workers**
4. Tambahkan permissions:
   - Account: Cloudflare Pages - Edit
   - Account: D1 - Edit
   - Account: Workers R2 Storage - Edit
   - Account: Workers KV Storage - Edit
5. Simpan token

### 6.2 Tambahkan GitHub Secrets

Di repository GitHub → Settings → Secrets and variables → Actions:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Token dari step 6.1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID (Dashboard → Overview → kanan bawah) |

### 6.3 Push untuk Trigger Deploy

```bash
git add .
git commit -m "chore: trigger deployment"
git push origin main
```

GitHub Actions akan otomatis:
1. Deploy Worker API
2. Build dan deploy Frontend ke Pages

## Step 7: Custom Domain (Optional)

### Untuk Pages

1. Cloudflare Dashboard → Pages → Project `absen`
2. Tab **Custom domains**
3. Klik **Set up a custom domain**
4. Masukkan domain (contoh: `app.yourdomain.com`)
5. Ikuti instruksi DNS

### Untuk Worker

1. Workers & Pages → Worker `absen-api`
2. Tab **Triggers**
3. **Custom Domains** → Add Custom Domain
4. Masukkan domain (contoh: `api.yourdomain.com`)

## Monitoring & Logs

### Real-time Logs

```bash
wrangler tail absen-api
```

### Dashboard Analytics

1. Workers & Pages → `absen-api` → Analytics
2. Lihat metrics:
   - Request volume
   - CPU time
   - Errors
   - Geographic distribution

### D1 Analytics

1. D1 → `absen-db` → Metrics
2. Lihat:
   - Query volume
   - Rows read/written
   - Database size

## Rollback

### Worker Rollback

```bash
# Lihat deployment history
wrangler deployments list

# Rollback ke versi sebelumnya
wrangler rollback
```

### Pages Rollback

1. Pages → `absen` → Deployments
2. Klik deployment sebelumnya
3. Klik **Rollback to this deployment**

## Cost Estimation

### Free Tier (Per Bulan)

| Resource | Free Limit | Typical Usage |
|----------|------------|---------------|
| Workers Requests | 100,000 | ✅ Cukup untuk MVP |
| D1 Reads | 5M rows | ✅ Cukup |
| D1 Writes | 100K rows | ✅ Cukup |
| R2 Storage | 10 GB | ✅ Cukup |
| R2 Operations | 1M Class A, 10M Class B | ✅ Cukup |
| KV Reads | 100K | ✅ Cukup |
| KV Writes | 1K | ⚠️ Monitor |
| Pages Builds | 500/month | ✅ Cukup |

### Paid Plan

Jika melebihi free tier:
- Workers: $5/month + $0.30/million requests
- D1: $5/month + usage-based
- R2: $0.015/GB storage + operations
