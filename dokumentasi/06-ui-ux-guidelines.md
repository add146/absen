# 🎨 UI/UX Guidelines

## Design Philosophy

Aplikasi ini didesain dengan prinsip:
1. **Mobile-First** - Prioritas penggunaan di smartphone
2. **Speed** - Aksi utama dapat dilakukan dalam 3 tap
3. **Clarity** - Informasi jelas tanpa overload
4. **Delight** - Micro-interactions yang menyenangkan

## Design System

### Color Palette

```css
:root {
  /* Primary - Professional Blue */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;  /* Main */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;

  /* Success - Check-in Green */
  --success-50: #f0fdf4;
  --success-500: #22c55e;
  --success-600: #16a34a;

  /* Warning - Late/Pending Orange */
  --warning-50: #fffbeb;
  --warning-500: #f59e0b;
  --warning-600: #d97706;

  /* Error - Absent/Failed Red */
  --error-50: #fef2f2;
  --error-500: #ef4444;
  --error-600: #dc2626;

  /* Neutral Gray */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* Points - Gold */
  --points-500: #eab308;
  --points-600: #ca8a04;
}
```

### Dark Mode

```css
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
}
```

### Typography

```css
/* Font Stack */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-2xl: 1.5rem;   /* 24px */
--radius-full: 9999px;  /* Pill shape */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

## Component Specifications

### 1. Check-in Button

Primary CTA pada dashboard.

```
┌─────────────────────────────────┐
│                                 │
│      🟢 CHECK-IN NOW           │
│                                 │
│      Kantor Pusat              │
│      08:45:23                  │
│                                 │
└─────────────────────────────────┘
```

**Specs:**
- Size: Full width, height 120px minimum
- Background: Gradient `primary-500` → `primary-600`
- Border radius: `radius-2xl`
- Shadow: `shadow-lg`
- Animation: Subtle pulse effect saat dalam area

**States:**
- **Default**: Gradient blue, enabled
- **Outside Area**: Gray, disabled dengan pesan
- **Already Checked In**: Green, menampilkan waktu check-in
- **Loading**: Spinner, disabled

### 2. Points Card

Menampilkan saldo poin dengan efek glassmorphism.

```
┌─────────────────────────────────┐
│ ⭐ POIN LOYALITAS              │
├─────────────────────────────────┤
│                                 │
│      1,250                     │  ← Large number
│      poin                      │
│                                 │
│ +180 bulan ini    Tukar →     │
└─────────────────────────────────┘
```

**Specs:**
- Background: `rgba(255, 255, 255, 0.1)` dengan backdrop blur
- Border: 1px `rgba(255, 255, 255, 0.2)`
- Points number: `text-4xl`, `font-bold`
- Counter animation saat value berubah

### 3. Location Indicator

Real-time GPS status.

```
📍 Kantor Pusat
   ✓ Dalam area (50m dari titik pusat)
```

**Specs:**
- Icon: Location pin dengan animasi pulse
- Status colors:
  - ✓ Green: Dalam area
  - ⚠ Orange: Mendekati batas
  - ✗ Red: Di luar area
- Distance: Real-time update

### 4. Attendance History Card

```
┌─────────────────────────────────┐
│ 📅 Senin, 3 Feb 2026           │
├─────────────────────────────────┤
│ Check-in   08:02  ✅ Tepat waktu│
│ Check-out  17:15  ⏱ 9j 13m     │
│                                 │
│ 📍 Kantor Pusat    ⭐ +15 poin │
└─────────────────────────────────┘
```

**Specs:**
- Card dengan shadow halus
- Status badge dengan warna semantik
- Grouped by date

### 5. Bottom Navigation

```
┌─────────────────────────────────┐
│  🏠      📊      🏪      👤    │
│  Home   Riwayat  Toko  Profil  │
└─────────────────────────────────┘
```

**Specs:**
- Fixed bottom, height 64px
- Safe area padding untuk notch devices
- Active state: Primary color, slight scale up
- Icons: 24px, labels 12px

## Micro-Interactions

### Check-in Success

```javascript
// Sequence:
1. Button ripple effect (200ms)
2. Success checkmark animation (400ms)
3. Confetti particles (1000ms)
4. Points counter animation (600ms)
5. Haptic feedback (vibrate)
```

### Points Earned

```javascript
// Counter animation
numberElement.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.2)' },
  { transform: 'scale(1)' }
], {
  duration: 600,
  easing: 'ease-out'
});
```

### Pull to Refresh

```javascript
// Custom illustration saat pull
// Progress indicator berbentuk lingkaran
// Smooth spring animation saat release
```

### Loading States

Gunakan **skeleton screens** daripada spinner:

```
┌─────────────────────────────────┐
│ ████████████                   │  ← Shimmer effect
│ ██████████████████             │
│                                 │
│ ████████   █████████           │
└─────────────────────────────────┘
```

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## Accessibility (A11y)

### Color Contrast
- Text pada background: minimal 4.5:1
- Large text: minimal 3:1
- Interactive elements: minimal 3:1

### Touch Targets
- Minimum size: 44 × 44 px
- Spacing antar target: minimal 8px

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### Screen Reader
- Semua icon punya `aria-label`
- Dynamic content punya `aria-live`
- Form inputs punya label yang jelas

### Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## PWA Guidelines

### Install Prompt
Tampilkan setelah 2-3 kali kunjungan:

```
┌─────────────────────────────────┐
│ 📱 Install aplikasi Absen      │
│                                 │
│ Akses lebih cepat langsung     │
│ dari home screen               │
│                                 │
│         [Nanti]  [Install]     │
└─────────────────────────────────┘
```

### Offline State
```
┌─────────────────────────────────┐
│ 📴 Tidak ada koneksi           │
│                                 │
│ Check-in akan disimpan dan     │
│ dikirim saat online kembali    │
│                                 │
│      [Coba Lagi]               │
└─────────────────────────────────┘
```

### Push Notifications

**Check-in Reminder (pagi)**
```
🔔 Absen
Jangan lupa check-in hari ini!
📍 Anda dekat dengan Kantor Pusat
```

**Check-out Reminder (sore)**
```
🔔 Absen
Sudah waktunya pulang. Jangan lupa check-out!
```

## Admin Dashboard

### Layout
```
┌─────────────┬───────────────────────────┐
│             │                           │
│  Sidebar    │      Main Content         │
│             │                           │
│  - Dashboard│  ┌─────────────────────┐  │
│  - Users    │  │ Stats Cards         │  │
│  - Locations│  └─────────────────────┘  │
│  - Reports  │                           │
│  - Settings │  ┌─────────────────────┐  │
│             │  │ Data Table          │  │
│             │  │                     │  │
│             │  │                     │  │
│             │  └─────────────────────┘  │
│             │                           │
└─────────────┴───────────────────────────┘
```

### Charts
- Attendance trend: Line chart
- Status distribution: Donut chart
- Location heatmap: Calendar heatmap
- Points distribution: Bar chart

**Library**: Chart.js atau Recharts

## Assets

### Icons
Gunakan **Lucide Icons** atau **Heroicons**:
- Konsisten style (outline atau solid)
- Size: 20px (small), 24px (default), 32px (large)

### Illustrations
- Empty states
- Error states
- Onboarding
- Success celebrations

**Style**: Flat, modern, menggunakan primary colors
