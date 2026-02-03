# 📋 Overview Sistem Absensi

## Tentang Aplikasi

**Sistem Manajemen Kehadiran Terintegrasi Loyalitas** adalah aplikasi web modern yang mengubah data kehadiran karyawan menjadi poin reward yang dapat ditukarkan dengan diskon di platform toko online.

## Fitur Utama

### 1. Manajemen Kehadiran
- ✅ Check-in/Check-out dengan validasi GPS
- ✅ Geofencing (radius & polygon)
- ✅ Anti-fraud detection (GPS spoofing, IP validation)
- ✅ Riwayat kehadiran lengkap
- ✅ Laporan kehadiran per periode

### 2. Sistem Poin Loyalitas
- ⭐ Earning poin otomatis saat check-in
- ⭐ Bonus poin untuk tepat waktu
- ⭐ Streak bonus untuk kehadiran berturut-turut
- ⭐ Buku besar poin (ledger) transparan

### 3. Integrasi Toko Online
- 🛒 Tukar poin untuk diskon
- 🛒 Aturan diskon fleksibel per tenant
- 🛒 Real-time balance sync

### 4. Multi-Tenant
- 🏢 Satu platform untuk banyak perusahaan
- 🏢 Konfigurasi independen per tenant
- 🏢 Data terisolasi dan aman

## Target Pengguna

| Role | Deskripsi |
|------|-----------|
| **Employee** | Karyawan yang melakukan check-in/out harian |
| **Admin** | Pengelola kehadiran dan laporan perusahaan |
| **Owner** | Pemilik toko yang mengatur aturan diskon |
| **Super Admin** | Pengelola platform keseluruhan |

## Arsitektur High-Level

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile/Web    │────▶│  Cloudflare     │
│   PWA Client    │     │  Pages          │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Cloudflare     │
                        │  Workers API    │
                        └────────┬────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  D1 Database  │   │  R2 Storage   │   │  KV Cache     │
    │  (SQLite)     │   │  (Files)      │   │  (Sessions)   │
    └───────────────┘   └───────────────┘   └───────────────┘
```

## Keunggulan

1. **Performa Global** - Cloudflare edge network di 300+ kota
2. **Biaya Efisien** - Pay-per-request, tanpa idle cost
3. **Skalabilitas** - Auto-scale tanpa konfigurasi
4. **Keamanan** - Built-in DDoS protection, HTTPS
5. **Offline Support** - PWA dengan service worker
