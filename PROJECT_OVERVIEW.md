# Project Overview — `psy-newporto`

Portfolio scrollytelling pribadi milik **Pasya** (Frontend Developer & Creative Technologist).
Konsepnya: website satu halaman bergaya *Awwwards* di mana animasi utama berupa **image sequence** (rangkaian frame `.webp`) yang diputar maju-mundur mengikuti scroll, dipadukan dengan teks sinematik dan beberapa efek tipografi interaktif.

---

## 1. Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | **Next.js 14.2.35** (App Router) |
| UI | **React 18**, **TypeScript 5** |
| Styling | **Tailwind CSS 3.4** |
| Animasi scroll & motion | **Framer Motion 12** (`useScroll`, `useSpring`, `useTransform`) |
| Animasi teks | **GSAP 3.14** + `ScrollTrigger` + `SplitText` plugin (`@gsap/react`) |
| Font | Geist Sans & Geist Mono (lokal, variable font) + Compressa VF (remote, via Cloudinary) |
| Package manager | npm **dan** pnpm (kedua lockfile ada — `package-lock.json` & `pnpm-lock.yaml`) |

Script: `npm run dev` / `build` / `start` / `lint`.

---

## 2. Struktur Folder

```
psy-newporto/
├── app/
│   ├── layout.tsx          # Root layout, setup font Geist + metadata
│   ├── page.tsx            # Halaman utama — seluruh scrollytelling ada di sini
│   ├── globals.css         # Tailwind + scrollbar minimalis + warna dasar #8A8A8A
│   ├── fonts/              # GeistVF.woff, GeistMonoVF.woff
│   └── hooks/
│       └── useImagePreloaderEncoder.ts  # Hook preload frame sequence
├── components/
│   ├── PortraitCanvas.tsx  # Canvas image-sequence untuk Section 1 (folder /sequence-1)
│   ├── Sequence2Canvas.tsx # Canvas image-sequence untuk Section 4 (folder /sequence-2)
│   ├── SplitText.tsx       # Animasi teks per-karakter (GSAP)
│   ├── TextPressure.tsx    # Tipografi variable-font reaktif terhadap kursor
│   └── CurvedLoop.tsx      # Marquee teks melengkung di sepanjang SVG path (saat ini TIDAK dipakai di page.tsx)
├── public/
│   ├── sequence-1/ ... sequence7/   # Banyak folder frame .webp (lihat catatan di bawah)
├── tailwind.config.ts
├── next.config.mjs         # Kosong (default)
└── tsconfig.json           # Path alias "@/*" → root
```

---

## 3. Cara Kerja Inti — Scroll-Driven Image Sequence

Ini jantung dari projek. Polanya sama untuk `PortraitCanvas` dan `Sequence2Canvas`:

1. **Section pembungkus tinggi** (`h-[450vh]`) dengan child `sticky top-0 h-screen`. Karena tinggi 4.5x viewport, scroll dalam section menghasilkan progress 0→1.
2. `useScroll({ target: ref, offset: ["start start","end end"] })` di `page.tsx` menghasilkan `scrollYProgress`, lalu dioper ke komponen canvas sebagai prop.
3. Di dalam canvas, progress dihaluskan dengan `useSpring` (`stiffness 300, damping 30`).
4. Setiap perubahan progress → hitung `frameIndex = floor(progress * FRAME_COUNT)` → gambar frame itu ke `<canvas>` lewat `drawImage` (dengan logika *cover/contain* berbasis aspect ratio).
5. Optimasi: `lastFrameRef` mencegah render ulang frame yang sama; gambar di-`requestAnimationFrame`; canvas memakai `devicePixelRatio` untuk ketajaman.

**Preloader** (`useImagePreloaderEncoder`):
- Loop dari `1..frameCount`, membuat `new Image()` dengan nama file `frame_000001.webp` (padding **6 digit**, satu underscore).
- Melapor progress (`onProgress` → dipakai untuk overlay "LOADING %") dan menandai `isLoaded` saat semua frame selesai.

> ⚠️ **Catatan penting soal frame count vs konstanta:**
> - `PortraitCanvas` → `FRAME_COUNT = 169`, baca dari `/sequence-1` (folder punya 169 file ✓).
> - `Sequence2Canvas` → `FRAME_COUNT = 168`, baca dari `/sequence-2` (folder punya 168 file ✓).
> - Folder lain (`sequence`, `sequence1`..`sequence7`) tampaknya **aset sisa eksperimen** yang tidak dipakai komponen saat ini.

---

## 4. Struktur Halaman (`app/page.tsx`)

Satu komponen `ScrollytellingPortfolio` berisi semua section. Ada 2 helper lokal:

- **`SectionOverlay`** — overlay hitam `#050505` untuk fade-in/fade-out antar section (berbasis `useTransform` pada progress).
- **`Beat`** — blok teks yang muncul/hilang (opacity + geser `y`) pada rentang progress `start..end` tertentu. Mendukung `align` kiri/tengah/kanan dan flag `isLast`.

### Alur Section

| Section | Tinggi | Isi |
|---------|--------|-----|
| **Loading Overlay** | fixed | Bar progress + teks "LOADING %", fade out saat `isLoaded`. |
| **Section 1** | `450vh` | `PortraitCanvas` (sequence-1) + 3 `Beat`: "PASYA.", "PIXEL PERFECT.", "THE VINTAGE LENS." + hint "Scroll to Begin". |
| **Section 2** | `min-h-screen` | "Beyond The Canvas" (pakai `SplitText`) + 2 paragraf profil. Gradient abu→hitam. |
| **Section 3** | `90vh` | `TextPressure` "Always Updated With The Newest Technology" (desktop) / `<h2>` biasa (mobile) + daftar tech stack. |
| **Section 4** | `450vh` | `Sequence2Canvas` (sequence-2) + 3 `Beat`: "ELEVATING REALITIES.", "SEAMLESS MOTION.", dan CTA "INITIATE SEQUENCE." dengan tombol Email & GitHub. |

Kontak: `mailto:pasya0129@gmail.com`, GitHub `github.com/cpasya`.

**Pola anti-hydration-mismatch:** state `isMounted` dipakai agar komponen berat (`SplitText`, `TextPressure`) hanya dirender setelah mount; sebelum itu menampilkan teks statis fallback.

---

## 5. Komponen Pendukung

- **`SplitText.tsx`** — Memecah teks jadi char/word/line via GSAP `SplitText`, lalu animasi `from→to` dengan `stagger`, dipicu `ScrollTrigger` (`once: true`). Menunggu `document.fonts.ready` agar tidak salah ukur.
- **`TextPressure.tsx`** — Port dari CodePen Juan Fuentes. Tiap huruf adalah `<span>` dengan variable font; `font-variation-settings` (`wght`, `wdth`, `ital`) berubah menurut jarak ke kursor (loop `requestAnimationFrame`). Mendukung stroke outline dan auto-scale.
- **`CurvedLoop.tsx`** — Marquee teks mengalir di sepanjang SVG path melengkung, bisa di-drag. **Belum digunakan** di `page.tsx` (di-import dulu tapi tidak dirender / kandidat fitur).

---

## 6. Catatan & Potensi Perbaikan

- **Metadata default:** `layout.tsx` masih `title: "Create Next App"` — sebaiknya diganti jadi nama Pasya untuk SEO.
- **Aset berat:** total ratusan frame `.webp` di `public/`. Folder yang tak terpakai (`sequence`, `sequence1`, `sequence3`..`sequence7`) bisa dihapus untuk mengecilkan repo/deploy.
- **Dua lockfile** (`package-lock.json` + `pnpm-lock.yaml`) — pilih satu package manager agar konsisten.
- `CurvedLoop` di-import tapi tidak dipakai → ESLint mungkin memperingatkan unused import.
- Komentar kode banyak ditulis dalam Bahasa Indonesia kasual ("lu", "biar", "FIX:") — gaya pengembangan personal.

---

*Dokumen ini dibuat dari pembacaan menyeluruh seluruh file sumber pada 2026-06-24.*
