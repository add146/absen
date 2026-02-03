# 📸 Analisis Gambar Referensi UI/UX

## Overview

Berdasarkan 17 gambar referensi di folder `reverensi/`, berikut adalah analisis fitur dan desain yang dapat ditambahkan ke sistem absensi.

---

## 🆕 Fitur Baru yang Belum Ada di PRD

### 1. Leave Management (Manajemen Cuti)

**Referensi:** Leave Management screens

| Fitur | Deskripsi |
|-------|-----------|
| **Leave Balance** | Dashboard saldo cuti dengan circular progress |
| **Leave Types** | Casual, Medical, Annual, Maternity, Umera, Unpaid |
| **Leave Request** | Form pengajuan cuti dengan date picker |
| **Manager Approval** | Notifikasi dan action approve/reject |
| **Leave History** | Riwayat cuti dengan status |

**Data Structure Tambahan:**
```sql
CREATE TABLE leaves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    approved_by TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_balances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    total_days INTEGER DEFAULT 0,
    used_days INTEGER DEFAULT 0,
    fiscal_year TEXT NOT NULL
);
```

---

### 2. Shift Management (Manajemen Shift)

**Referensi:** Shift Management screens

| Fitur | Deskripsi |
|-------|-----------|
| **Shift Types** | Morning, Day, Evening, Night shift |
| **Shift Calendar** | Kalender visual dengan warna per shift |
| **Shift Assignment** | Drag-drop assign shift ke karyawan |
| **My Schedule** | Jadwal shift personal karyawan |

**Data Structure Tambahan:**
```sql
CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color TEXT, -- Hex color untuk UI
    is_active INTEGER DEFAULT 1
);

CREATE TABLE shift_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'assigned' -- assigned, completed, absent
);
```

---

### 3. Face Verification (Verifikasi Wajah)

**Referensi:** Check In-Out with face verification

| Fitur | Deskripsi |
|-------|-----------|
| **Face Detection** | Capture wajah saat check-in |
| **Verification** | Bandingkan dengan foto profil |
| **Anti-Spoofing** | Deteksi foto/video palsu |

**Implementasi:**
- Gunakan Web API `getUserMedia()` untuk camera
- TensorFlow.js atau face-api.js untuk detection
- Simpan face embedding di R2

---

### 4. Work From Home (WFH) Mode

**Referensi:** Work From Home screens

| Fitur | Deskripsi |
|-------|-----------|
| **WFH Check-in** | Check-in dari rumah tanpa geofence |
| **Location Note** | Keterangan lokasi WFH |
| **WFH Request** | Pengajuan izin WFH |

**Data Structure Tambahan:**
```sql
ALTER TABLE attendances ADD COLUMN work_type TEXT DEFAULT 'office'; 
-- 'office', 'wfh', 'field'
ALTER TABLE attendances ADD COLUMN wfh_note TEXT;
```

---

### 5. Team Location Tracking

**Referensi:** Team Tracking map view

| Fitur | Deskripsi |
|-------|-----------|
| **Live Map** | Peta real-time lokasi tim |
| **Status Indicators** | Badge status (checked-in, break, dll) |
| **History Trail** | Jejak pergerakan field worker |

---

### 6. Organization Analytics Dashboard

**Referensi:** Organisation Analytics Dashboard

| Metric | Visualisasi |
|--------|-------------|
| **Total Offices** | Card dengan icon |
| **Total Teams** | Card dengan icon |
| **Active Employees** | Card dengan counter |
| **On Time Login %** | Line chart trend |
| **On Leave** | Area chart |
| **Outage** | Line chart |
| **Absent Employees** | Donut chart |
| **Avg Check-in Time** | Scatter plot per hari |
| **Avg Check-out Time** | Scatter plot per hari |
| **Avg Working Hours** | Bar chart per bulan |

---

### 7. Time Update Request

**Referensi:** Attendance History screens

| Fitur | Deskripsi |
|-------|-----------|
| **Edit Time Request** | Koreksi waktu check-in/out |
| **Manager Approval** | Persetujuan oleh atasan |
| **Audit Trail** | Log perubahan waktu |

**Data Structure Tambahan:**
```sql
CREATE TABLE time_corrections (
    id TEXT PRIMARY KEY,
    attendance_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    old_check_in DATETIME,
    new_check_in DATETIME,
    old_check_out DATETIME,
    new_check_out DATETIME,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 8. Employee Profile Extended

**Referensi:** Employee Profile screens

| Fitur | Deskripsi |
|-------|-----------|
| **Skills & Certificates** | Daftar keahlian dengan tags |
| **Education History** | Riwayat pendidikan |
| **Document Upload** | KTP, NPWP, ijazah |
| **Assigned Offices** | Multi-location assignment |
| **Assigned Teams** | Membership tim |

**Data Structure Tambahan:**
```sql
CREATE TABLE user_skills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    level TEXT -- 'beginner', 'intermediate', 'expert'
);

CREATE TABLE user_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_type TEXT NOT NULL, -- 'ktp', 'npwp', 'ijazah', 'passport'
    file_url TEXT NOT NULL,
    expires_at DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 9. Team Reports

**Referensi:** Reports screens

| Report | Deskripsi |
|--------|-----------|
| **Combine Report** | Gabungan semua metrics |
| **Time Sheet Report** | Jam kerja per karyawan |
| **Leave Report** | Ringkasan cuti |
| **Employee Leave Report** | Detail cuti per orang |
| **Team Monthly Report** | Laporan bulanan tim |
| **Punctuality Chart** | Trend ketepatan waktu |
| **Working Hours Chart** | Distribusi jam kerja |

---

### 10. Notification System

**Referensi:** Notifications screen

| Notification Type | Trigger |
|-------------------|---------|
| **Leave Request** | Pengajuan cuti baru |
| **Leave Approval** | Cuti disetujui/ditolak |
| **Time Update** | Request koreksi waktu |
| **New Device** | Login dari device baru |
| **Reminder** | Belum check-in/out |

---

### 11. Office/Location Management Extended

**Referensi:** Office management screens

| Fitur | Deskripsi |
|-------|-----------|
| **Office Photo** | Foto kantor/lokasi |
| **Website URL** | Link website kantor |
| **Break Timings** | Jam istirahat |
| **Working Days** | Hari kerja (custom) |
| **Holidays Calendar** | Kalender libur per kantor |
| **Fiscal Year Start** | Awal tahun fiskal |
| **Office Summary** | Ringkasan per kantor |

---

## 🎨 UI/UX Improvements dari Referensi

### Color Scheme
- Primary: **#4F46E5** (Indigo) / **#3B82F6** (Blue)
- Success: **#22C55E** (Green)
- Warning: **#F59E0B** (Amber)
- Error: **#EF4444** (Red)
- Background: **#F8FAFC** (Light gray)

### Design Patterns

1. **Cards dengan Shadow**
   - Rounded corners (12-16px)
   - Subtle shadow
   - White background

2. **Status Badges**
   - Pill shape dengan warna semantik
   - Contoh: `Sales`, `Design`, `Accounts`

3. **Data Tables**
   - Sticky header
   - Hover highlight
   - Action buttons (call, email, edit)
   - Avatar + name column

4. **Charts**
   - Donut untuk distribusi
   - Line untuk trend
   - Bar untuk perbandingan
   - Scatter untuk time-based

5. **Mobile Navigation**
   - Bottom nav dengan 5 items
   - Icons: Home, My Teams, Attendance, Notifications, More

6. **Big CTA Button**
   - Circular check-in button
   - Gradient background
   - Hand/tap icon
   - Pulse animation

---

## 📱 Mobile App Screens (dari Referensi)

1. **Home/Dashboard**
   - Time display besar
   - Check-in button prominent
   - Location status
   - Today's stats (check-in, check-out, working hours)
   - Bottom navigation

2. **My Teams**
   - Team list dengan avatar
   - Status indicators
   - Quick actions

3. **Attendance History**
   - Calendar month picker
   - List dengan color-coded status
   - Date, Check-in, Check-out, Working Hrs columns

4. **My Schedule**
   - Calendar view dengan shift colors
   - Today's tasks/meetings

5. **Notifications**
   - Grouped by date
   - Avatar + action description
   - Approve/Reject inline buttons

6. **Profile**
   - Avatar
   - Quick stats
   - Reports, Today's Schedule, Office & Location, My Profile tabs
   - Monthly summary

---

## ✅ Rekomendasi Prioritas Implementasi

### Phase 1 (MVP) - Yang Sudah di PRD
- [x] Basic Check-in/Check-out
- [x] Geofencing
- [x] Points System
- [x] User Management
- [x] Admin Dashboard

### Phase 2 (Enhancement)
- [ ] Leave Management
- [ ] Face Verification
- [ ] WFH Mode
- [ ] Time Update Request
- [ ] Notification System

### Phase 3 (Advanced)
- [ ] Shift Management
- [ ] Team Location Tracking
- [ ] Advanced Reports
- [ ] Employee Skills/Documents
- [ ] Organization Analytics

---

## 📁 File Referensi

| File | Konten |
|------|--------|
| `0ad61c...e3f6c.png` | Employee List |
| `0dc5fe...273ff.png` | Offices & Locations Grid |
| `14af34...8be69.png` | Team Attendance (Mobile) |
| `2bd3e2...52b7b.png` | Check In-Out, WFH, Face Verification |
| `3b9328...523ed.png` | Leave Management |
| `48a708...84ea4.png` | Organization Dashboard + Office Detail |
| `4b31f0...8325d.png` | Landing Page |
| `4c87a7...8d5c4.png` | Attendance History + Time Update |
| `4d8d65...82c24.png` | Employee Profile (Attendance tab) |
| `5bb346...854f8.png` | Reports |
| `9a2aa4...e3298.png` | Add Office Location (Map) |
| `9adcb9...7ffa2.png` | Edit Profile (Modals) |
| `ba93bc...5179d.png` | Mobile App Showcase |
| `c5481d...e396b.png` | Office Summary |
| `dba4d1...7f3d4.png` | Employee Profile Detail |
| `e0a0cc...e4d35.png` | Notifications |
| `e828e5...4fe50.png` | Shift Management |
