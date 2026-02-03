# Absen - Sistem Manajemen Kehadiran

Aplikasi manajemen kehadiran berbasis web dengan integrasi sistem loyalitas poin.

## 🚀 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS (PWA)
- **Backend**: Cloudflare Workers (Hono)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV

## 📁 Struktur Project

```
absen/
├── frontend/          # React PWA
├── worker/            # Cloudflare Worker API
├── schema/            # Database migrations
├── docs/              # Documentation
└── .github/           # CI/CD workflows
```

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm atau pnpm
- Wrangler CLI (`npm install -g wrangler`)
- Akun Cloudflare

### Setup Lokal

```bash
# Clone repository
git clone https://github.com/add146/absen.git
cd absen

# Install dependencies (frontend)
cd frontend
npm install

# Install dependencies (worker)
cd ../worker
npm install

# Run development server
npm run dev
```

### Environment Variables

Buat file `.dev.vars` di folder `worker/`:

```
JWT_SECRET=your-secret-key
```

## 🚢 Deployment

### Cloudflare Resources

1. **D1 Database**
   ```bash
   wrangler d1 create absen-db
   wrangler d1 execute absen-db --file=./schema/migrations/0001_initial.sql
   ```

2. **R2 Bucket**
   ```bash
   wrangler r2 bucket create absen-files
   ```

3. **KV Namespace**
   ```bash
   wrangler kv:namespace create CACHE
   ```

### Deploy

```bash
# Deploy worker
cd worker
wrangler deploy

# Deploy frontend (via Cloudflare Pages)
# Connect GitHub repo → Cloudflare Pages Dashboard
```

## 📚 Documentation

- [PRD (Product Requirement Document)](./docs/PRD.md)

## 📄 License

MIT License
