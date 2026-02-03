# 📚 Dokumentasi Sistem Absensi

Selamat datang di dokumentasi **Sistem Manajemen Kehadiran Terintegrasi Loyalitas**.

## 📖 Daftar Isi

| No | Dokumen | Deskripsi |
|----|---------|-----------|
| 1 | [Overview](./01-overview.md) | Pengenalan sistem dan fitur utama |
| 2 | [Instalasi](./02-instalasi.md) | Panduan setup lokal dan deployment |
| 3 | [API Reference](./03-api-reference.md) | Dokumentasi lengkap API endpoints |
| 4 | [Database Schema](./04-database-schema.md) | Struktur database dan ERD |
| 5 | [Deployment Guide](./05-deployment-guide.md) | Panduan deploy ke Cloudflare |
| 6 | [UI/UX Guidelines](./06-ui-ux-guidelines.md) | Design system dan spesifikasi UI |
| 7 | [Security Guidelines](./07-security-guidelines.md) | Implementasi keamanan |

## 🚀 Quick Start

```bash
# Clone repo
git clone https://github.com/add146/absen.git
cd absen

# Install & run frontend
cd frontend && npm install && npm run dev

# Install & run backend (terminal baru)
cd worker && npm install && npm run dev
```

## 📁 Struktur Project

```
absen/
├── frontend/          # React PWA (Cloudflare Pages)
├── worker/            # API (Cloudflare Workers)
├── schema/            # Database migrations
├── dokumentasi/       # 📍 Anda di sini
└── docs/              # PRD
```

## 🔗 Links

- **Repository**: [github.com/add146/absen](https://github.com/add146/absen)
- **Live Demo**: _Coming soon_
- **API Endpoint**: _After deployment_

## 📝 Changelog

### v0.1.0 (2026-02-03)
- ✅ Initial PRD created
- ✅ Database schema defined
- ✅ Documentation structure
- ✅ GitHub repository setup
- ✅ CI/CD workflow configured

---

© 2026 Sistem Absensi. All rights reserved.
