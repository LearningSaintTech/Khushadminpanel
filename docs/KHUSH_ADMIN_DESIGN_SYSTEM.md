# Khush Admin ERP — Design System

**Codename:** Khush Midnight Plum  
**Scope:** Admin panel, subadmin, designer portal, driver app, influencer portal (all `Khushadminpanel/src` UI).  
**Last updated:** June 2026

Use this document whenever adding or changing UI (colors, spacing, tables, layout). Do not introduce new accent families without updating this file.

---

## 1. Design principles

1. **One brand** — Plum for navigation, primary actions, links, focus.
2. **One neutral** — Warm stone canvas and ink text (not cold `slate` + random `gray`).
3. **One commerce accent** — Champagne gold **only** for money: wallet, points, gift cards, coins, ₹ highlights.
4. **Four semantics** — Success, warning, danger, info. No rainbow status badges.
5. **No double backgrounds** — Layout owns the canvas; page content should not add `min-h-screen bg-slate-50` inside white `<main>` unless intentional full-bleed.
6. **Compact admin UX** (existing convention): small type (`text-sm` / `text-xs` / `text-[11px]`), tight padding, sticky table headers, `useAdminPanelBasePath` for routes.

---

## 2. Color tokens (hex)

### 2.1 Canvas & surfaces

| Token | Hex | Usage |
|--------|-----|--------|
| `canvas` | `#F4F2EF` | App shell background (`Layout`) |
| `surface` | `#FFFFFF` | Cards, header, main panel |
| `canvas-muted` | `#EBE8E3` | Table footers, secondary panels |
| `border` | `#DDD8D0` | Default borders |
| `border-subtle` | `#E8E4DE` | Inner dividers |

### 2.2 Ink (text)

| Token | Hex | Usage |
|--------|-----|--------|
| `ink-900` | `#1C1917` | Headings, primary table text |
| `ink-700` | `#57534E` | Body, labels |
| `ink-500` | `#78716C` | Descriptions, placeholders |
| `ink-400` | `#A8A29E` | Disabled, meta |

Prefer Tailwind **`text-stone-*`** aligned to these values, or semantic classes below.

### 2.3 Brand — Plum

| Token | Hex | Usage |
|--------|-----|--------|
| `brand-950` | `#1E1229` | Sidebar bottom, dark tooltips |
| `brand-900` | `#2A1A3D` | Sidebar gradient top |
| `brand-800` | `#3F2960` | Sidebar hover / depth |
| `brand-700` | `#5C3D8A` | Active nav (dark sidebar) |
| `brand-600` | `#6B4FA3` | **Primary buttons** |
| `brand-500` | `#8268B8` | Links, icons, focus ring |
| `brand-100` | `#EDE8F4` | Selected nav (light sidebar), soft badges |
| `brand-50` | `#F6F4FA` | Highlight rows, info strips |

**Sidebar dark gradient:** `from-[#2A1A3D] to-[#1E1229]`  
**Do not use:** `#4B0082`, `#140034`, generic `indigo-600` for brand actions.

**Light sidebar active:** `bg-brand-50 text-brand-700` (or `bg-[#EDE8F4] text-[#5C3D8A]`).

### 2.4 Commerce — Champagne gold

| Token | Hex | Usage |
|--------|-----|--------|
| `gold-600` | `#9A7B3C` | Money module primary actions |
| `gold-500` | `#B8954A` | Money icons, highlights |
| `gold-100` | `#F5EDD8` | Money stat cards, banners |
| `gold-50` | `#FBF7EF` | Money section backgrounds |

Use **only** on: `moneyFeatures/*`, wallet, gift card, redeem coins, points, cash wallet, coupon purchase bonus UI.  
**Do not** use `amber-600` for new money UI.

### 2.5 Semantic (status, alerts, forms)

| Meaning | Background | Foreground |
|---------|------------|------------|
| Success | `#E6F2EE` | `#2F6F5E` |
| Warning | `#F8F1E3` | `#8A6D1D` |
| Danger | `#F9EBEC` | `#9B3D42` |
| Info | `#E8F0F6` | `#3D6B8C` |

Tailwind utility aliases (when `@theme` is wired): `bg-success-bg text-success`, etc.

---

## 3. Tailwind v4 theme (`src/index.css`)

Keep tokens in one place. Extend as needed; do not duplicate hex in components if a token exists.

```css
@import "tailwindcss";

@theme {
  --color-brand-50: #f6f4fa;
  --color-brand-100: #ede8f4;
  --color-brand-500: #8268b8;
  --color-brand-600: #6b4fa3;
  --color-brand-700: #5c3d8a;
  --color-brand-800: #3f2960;
  --color-brand-900: #2a1a3d;
  --color-brand-950: #1e1229;

  --color-canvas: #f4f2ef;
  --color-canvas-muted: #ebe8e3;
  --color-border: #ddd8d0;

  --color-gold-50: #fbf7ef;
  --color-gold-100: #f5edd8;
  --color-gold-500: #b8954a;
  --color-gold-600: #9a7b3c;

  --color-success: #2f6f5e;
  --color-success-bg: #e6f2ee;
  --color-warning: #8a6d1d;
  --color-warning-bg: #f8f1e3;
  --color-danger: #9b3d42;
  --color-danger-bg: #f9ebec;
  --color-info: #3d6b8c;
  --color-info-bg: #e8f0f6;
}
```

---

## 4. Migration cheat sheet

When touching a file, prefer updating colors to match this table:

| Avoid (legacy) | Use instead |
|----------------|-------------|
| `bg-[#e8ecf1]` | `bg-canvas` |
| `bg-slate-50` on page root inside Layout | `bg-transparent` or remove |
| `bg-indigo-600`, `hover:bg-indigo-700` | `bg-brand-600`, `hover:bg-brand-700` |
| `text-indigo-600`, `border-indigo-*` | `text-brand-600`, `border-brand-*` |
| `bg-indigo-50`, `text-indigo-700` | `bg-brand-50`, `text-brand-700` |
| Sidebar `#4B0082` → `#140034` | `brand-900` → `brand-950` gradient |
| Money `amber-600` / `amber-50` CTAs | `gold-600` / `gold-50` |
| `text-slate-900` (optional unify) | `text-stone-900` / `text-ink` |
| 10+ order status hues | Map to 4 semantics + plum for shipping (see §5) |

---

## 5. Order & status badges

Map statuses to **at most** these styles:

| Status group | Style |
|--------------|--------|
| Pending, Created | Warning (`warning-bg` / `warning`) |
| Processing, Packed | Info |
| Shipped, Out for delivery | Brand soft (`brand-100` / `brand-700`) |
| Delivered, Completed | Success |
| Cancelled, Failed | Danger |
| Exchange / Return | Info **or** brand soft (pick per module; stay consistent in orders) |

Do not add new per-status colors (pink, cyan, teal, etc.) without updating this doc.

---

## 6. Component patterns

### Layout shell (`Layout.jsx`)

- Outer: `bg-canvas` (or `bg-[#F4F2EF]`)
- Header / main: `bg-surface` / white, `border-border` / `border-stone-200`
- Page title: `text-stone-900`, `text-sm font-semibold`

### Buttons

- **Primary (default):** `bg-brand-600 text-white hover:bg-brand-700`
- **Secondary:** `border border-border bg-white text-stone-700 hover:bg-canvas-muted`
- **Destructive:** `bg-danger text-white` or `bg-danger-bg text-danger`
- **Money primary:** `bg-gold-600 text-white hover:bg-gold-500`

### Tables (compact admin)

- Container: `max-h-[66vh] overflow-auto`, `rounded-xl border border-border`
- Header: `sticky top-0 bg-canvas-muted text-[10px] uppercase text-stone-500`
- Body: `text-[11px] text-stone-800`
- Row hover: `hover:bg-brand-50/50`

### Cards

- `rounded-xl border border-border bg-white p-2 shadow-sm`

### Links

- `text-brand-600 hover:text-brand-700 hover:underline`

### Notifications badge

- Keep `bg-red-500` or migrate to `bg-danger` when tokens are global.

---

## 7. File touch priority (rollout)

When theming a module, update in this order:

1. `src/index.css` — `@theme` tokens  
2. `admin/components/common components/Layout.jsx`  
3. `sidebar.jsx`, `sidebarMainNav.jsx`, `SidebarTooltip.jsx`  
4. `moneyFeatures/moneyFeaturesShared.jsx` and money feature pages  
5. `orders/order.jsx` — status badge map  
6. Other admin modules — replace `indigo-*` on edit  

---

## 8. References

- Sidebar theme toggle: `src/context/ThemeContext.jsx` (light/dark sidebar only)  
- Shared money UI: `src/admin/components/moneyFeatures/moneyFeaturesShared.jsx`  
- Base path: `useAdminPanelBasePath` — never hardcode `/admin/...` in new code  

---

## 9. Checklist before merging UI changes

- [ ] No new random accent colors (violet, sky, pink, etc.) unless added to §2  
- [ ] Primary actions use **brand**, not indigo  
- [ ] Money UI uses **gold**, not amber  
- [ ] Status badges use **4 semantics** (+ brand for shipping)  
- [ ] No redundant full-page gray background inside Layout main  
- [ ] Borders use stone/canvas tokens, not mixed `gray-200` + `slate-200` in the same view  
