---
name: PipelineGuard AI
description: Light industrial corrosion-risk dashboard for pipeline operators
colors:
  surface: "#ffffff"
  surface-soft: "#f8fbff"
  ink: "#102a43"
  ink-soft: "#486581"
  border: "#d9e2ec"
  accent: "#1d4ed8"
  accent-deep: "#1e40af"
  safe: "#22c55e"
  warning: "#f59e0b"
  critical: "#ef4444"
  sidebar: "#0d1b2a"
  sidebar-elevated: "#1b263b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

## Overview

PipelineGuard memakai tema light industri: permukaan putih/soft-blue, tinta navy, satu aksen biru interaktif, dan warna semantik risiko (hijau / amber / merah). Sidebar navigasi tetap gelap sebagai kontras shell. Desain melayani kepadatan data dashboard, bukan hero marketing.

## Colors

- **Surface** `#ffffff` / **Surface soft** `#f8fbff` — kanvas halaman
- **Ink** `#102a43` / **Ink soft** `#486581` — teks utama dan sekunder
- **Border** `#d9e2ec` — pemisah lembut
- **Accent** `#1d4ed8` — fokus interaktif tunggal (CTA, tab aktif, tautan)
- **Safe / Warning / Critical** — hanya untuk status risiko dan metrik terkait
- **Sidebar** `#0d1b2a` — navigasi; elevated `#1b263b`

Jangan menambah aksen ungu atau cream AI-default. Gradient permukaan dihindari kecuali highlight sangat lembut yang sudah di token.

## Typography

Plus Jakarta Sans untuk UI; IBM Plex Mono untuk angka tabular (akurasi, F1, probabilitas). Judul halaman `text-wrap: balance`. Hindari uppercase tracked eyebrow di setiap section — label kecil boleh untuk KPI/grid data saja.

## Elevation

Kartu: border 1px + shadow sangat ringan (`shadow-sm`). Tidak ada multi-layer glow. Panel aktif boleh ring tipis aksen biru. Sidebar tidak memakai glass.

## Components

- **pg-card / metrics-panel / shap-main-panel** — permukaan putih, border token, radius lg
- **KPI** — angka besar + deskripsi singkat; badge status semantik
- **Filter / tab** — pill atau rounded-lg; aktif = ink atau accent solid
- **Sidebar nav** — item aktif elevated gelap + ikon critical sebagai penanda, bukan ungu
- **Footer note** — tint biru lembut untuk catatan operator

## Do's and Don'ts

**Do**

- Pakai token `pg-*` sebelum hard-code hex
- Satu aksen interaktif (navy/blue); status warna hanya untuk risiko
- Kepadatan informasi tinggi di tabel/chart adalah benar untuk produk ini
- Hormati `prefers-reduced-motion`

**Don't**

- Ungu SaaS, cream paper, atau dark-flip seluruh kanvas
- Grid kartu identik (ikon + judul + teks) berulang tanpa hierarki
- Gradient text, glassmorphism dekoratif, shadow berlapis
- Eyebrow uppercase di setiap section sebagai scaffolding
