# Khushadminpanel — folder restructure plan

**Status:** proposal only. No files will be moved until you give the command.

**Scope:** directory layout, naming, and layering. URLs (`/admin`, `/designer`, `/driver`, …) stay the same. Behavior stays the same. This is a mechanical rearrange plus import path updates, done in phases.

**Scan date:** 2026-09-23  
**Size:** ~384 source files under `src/` (~250 of them under `src/admin`).

---

## 1. What the repo is today

One Vite SPA hosts **seven portals**:

| URL prefix | Folder today |
|---|---|
| `/admin` | `src/admin` |
| `/subadmin` | `src/subadmin` (auth only; UI reuses admin layout + child routes) |
| `/designer` | `src/designer` |
| `/driver` | `src/driver` |
| `/influencer` | `src/influencer` |
| `/support-agent` | `src/supportAgent` |
| `/order-agent` | `src/orderAgent` |

That multi-portal split is correct. The problems are **inside** those folders: mixed conventions, pages living under `components/`, HTTP client owned by admin, spaces in folder names, and duplicated auth screens.

---

## 2. Issues found

### 2.1 Folder names that break tooling and imports

Spaces in directory names:

- `src/admin/components/common components/`
- `src/admin/components/create subadmin/`

These force quotes in every import (`"../common components/Layout"`), break some glob tools, and are not used in industry React trees.

### 2.2 Pages vs components mixed

Almost every screen is a **route page** but lives under `components/`:

- `admin/components/inventory/ShowItems.jsx`
- `admin/components/orders/order.jsx`
- `admin/components/Dashboard.jsx`

Industry standard: **pages** (route targets) vs **components** (reusable UI). Right now there is no `pages/` layer, so 200+ “components” are actually screens.

### 2.3 Dual API layers

HTTP is split in two places:

- `src/admin/apis/` — 55 endpoint modules
- `src/admin/services/` — `Apiconnector.js` (the real axios client) + `notificationApi.js`

Every other portal imports the client **through admin**:

```
from "../../admin/services/Apiconnector"
```

That couples designer/driver/influencer/order-agent to the admin feature tree.

### 2.4 File naming is inconsistent

Examples in `admin/apis/` alone:

| File | Pattern |
|---|---|
| `itemapi.js` | all lowercase |
| `NewsApi.js` | PascalCase |
| `Authapi.js` | mixed |
| `Apiconnector.js` | PascalCase for a non-component |
| `influrncerCouponapi.js` | typo |
| `Refferalapi.js` / `components/Refferal` | typo |
| `InfluencerCouponAnaylitics.jsx` | typo |
| `UspPolicy.js` | no `Api` suffix |

Components mix `order.jsx`, `Itemdetails.jsx`, `ShowItems.jsx`, `splashform.jsx`.

Industry default for React:

- Folders: `kebab-case`
- Route pages / components: `PascalCase.jsx`
- Hooks: `useThing.js`
- Non-UI modules: `camelCase.js`

### 2.5 Each portal invented its own inner layout

| Portal | Inner folders |
|---|---|
| admin | `components/`, `apis/`, `services/`, `utils/` |
| designer | `components/`, `apis/`, `utils/` |
| driver | `drivercomponent/`, `apis/` |
| influencer | `influencercomponents/`, `influencerapis/` |
| order-agent | `components/`, `list/`, `context/`, `apis/` (closest to a feature layout) |
| support-agent | `components/`, `apis/` |
| subadmin | auth only |

`drivercomponent` and `influencercomponents` are redundant prefixes (the parent folder already says driver/influencer).

### 2.6 Duplicated auth screens (7 copies)

`Login.jsx` + `Otp.jsx` exist under:

- `admin/components/Auth`
- `subadmin/components/Auth`
- `designer/components/Auth`
- `driver/drivercomponent/Auth`
- `influencer/influencercomponents/Auth`
- `orderAgent/components/Auth`
- `supportAgent/components/Auth`

They should share one auth UI with **portal-specific API + copy**, not seven near-copies.

### 2.7 Duplicated domain across admin vs portal

- Admin staff CRUD for order agents: `admin/components/orderAgent/`
- Order-agent **workspace**: `src/orderAgent/`
- Admin support tickets: `admin/components/support/`
- Support-agent workspace: `src/supportAgent/`

Same names, different products. Fine to keep both, but they must not share a folder named `orderAgent` without a portal prefix, or people will edit the wrong tree.

### 2.8 Shared code is scattered

Truly shared pieces sit in three places:

- `src/utils/` — auth, API config, logger, gates (`ProtectedRoute.jsx` lives here; it is a component)
- `src/components/` — redirects, gates, a few inventory widgets
- `src/context/` — theme, module access, notifications
- `src/hooks/` — one hook (`useModuleAccess.js`)
- `src/config/` — module map
- `src/redux/` — `Appstore.js`, `Rootreducer.js` (inconsistent casing)

`src/assets` is empty (0 files). Images/icons are likely under `public/` or imported ad hoc.

### 2.9 Comments already lie about location

`itemapi.js` still comments `// src/apis/itemApi.js` — leftover from an older tree. After a rearrange, that kind of drift will get worse unless we pick one layout and stick to it.

### 2.10 What is *not* a problem

- One Vite app for all staff portals is a valid choice (shared auth, shared design system).
- Keeping portals as top-level siblings is the right call.
- order-agent’s `list/` + `hooks` + `api` split is already closer to industry practice; we should copy that pattern, not invent a new one.

---

## 3. Target layout (industry standard for a multi-portal SPA)

Model: **Bulletproof React / feature-sliced**, adapted for multiple portals.

```
src/
  app/                          # shell only
    App.jsx
    main.jsx                    # (from src/main.jsx)
    providers.jsx               # toaster, theme, notification, redux
    router.jsx                  # top-level /admin /designer /… mounts

  shared/                       # used by 2+ portals — never import a portal from here
    api/
      client.js                 # today's Apiconnector
    auth/
      session.js
      role.js
      ProtectedRoute.jsx
    config/
      api.js
      moduleAccess.js
    store/                      # redux
    ui/                         # AccessDenied, SafeExternalLink, design-system primitives
    hooks/
    lib/                        # logger, safeUrl, image compress
    assets/

  portals/
    admin/
      index.jsx                 # portal route tree
      layouts/
        AdminLayout.jsx         # today's common components/Layout + sidebar
      features/
        inventory/
          api/itemApi.js
          pages/ItemListPage.jsx
          pages/ItemFormPage.jsx
          components/CrossSellPanel.jsx
          utils/designedByMeta.js
        orders/
        notifications/
        community/
        …one folder per domain (matches sidebar modules)

    designer/
      layouts/
      features/
        inventory/
        profile/
        auth/

    driver/
    influencer/
    order-agent/                # kebab-case folder
    support-agent/
    subadmin/                   # auth + route wrapper only
```

### Naming rules (lock these)

- Folders: `kebab-case` (`order-agent`, `create-subadmin`, `common` not `common components`)
- Page files: `PascalCase` + `Page` suffix (`ItemListPage.jsx`)
- UI pieces: `PascalCase` (`CrossSellPanel.jsx`)
- API modules: `camelCase` + `Api` (`itemApi.js`, `newsApi.js`)
- Hooks: `useX.js`
- No spaces, no typos (`referral`, `influencer`, `analytics`)

### Import direction (hard rule)

```
portals/*  →  shared/*
portals/A  ↛  portals/B
shared     ↛  portals/*
```

Today designer/driver import `admin/services/Apiconnector`. After rearrange they import `shared/api/client`.

---

## 4. Mapping: current → proposed (high level)

### Cross-cutting

| Today | After |
|---|---|
| `src/App.jsx`, `src/main.jsx` | `src/app/` |
| `src/admin/services/Apiconnector.js` | `src/shared/api/client.js` |
| `src/admin/services/notificationApi.js` | `src/portals/admin/features/notifications/api/notificationApi.js` |
| `src/admin/apis/*` | `src/portals/admin/features/{domain}/api/` |
| `src/utils/*` (auth, api, logger) | `src/shared/auth`, `src/shared/lib`, `src/shared/config` |
| `src/utils/ProtectedRoute.jsx` | `src/shared/auth/ProtectedRoute.jsx` |
| `src/components/*` gates/redirects | `src/shared/ui` or `src/app` |
| `src/context/*` | `src/app/providers` + `src/shared` |
| `src/redux/*` | `src/shared/store` |
| `src/routes/adminroutes.jsx` | `src/portals/admin/index.jsx` (or `routes.jsx`) |
| `src/routes/adminPanelChildRoutes.jsx` | split per feature `routes.jsx`, composed in portal index |
| `src/config/adminPanelModuleMap.js` | `src/shared/config/moduleAccess.js` |

### Admin feature examples

| Today | After |
|---|---|
| `admin/components/common components/*` | `portals/admin/layouts/` |
| `admin/components/create subadmin/*` | `portals/admin/features/subadmin/` |
| `admin/components/inventory/*` | `portals/admin/features/inventory/` |
| `admin/components/Auth/*` | `portals/admin/features/auth/` (thin wrappers over shared auth UI) |
| `admin/components/Refferal/*` | `portals/admin/features/referral/` |
| `admin/apis/influrncerCouponapi.js` | `portals/admin/features/influencer/api/couponApi.js` |

### Other portals

| Today | After |
|---|---|
| `driver/drivercomponent/*` | `portals/driver/features/{auth,home,orders,profile}/` |
| `influencer/influencercomponents/*` + `influencerapis/*` | `portals/influencer/features/` + `api/` |
| `orderAgent/*` | `portals/order-agent/` (keep the existing `list/` feature; just rename + nest) |
| `designer/*` | `portals/designer/` (already closest to the target; rename inner folders only) |

---

## 5. How I would do it (phases — wait for your go)

**No git mv until you say which phase to run.** Each phase is one PR-sized move: compile must stay green; URLs unchanged.

### Phase 0 — freeze rules (no moves)

- Add this doc (done).
- Optional: ESLint `no-restricted-imports` later, after Phase 1.

### Phase 1 — kill the two space folders + HTTP client lift

Highest pain, smallest file count:

1. `common components` → `portals/admin/layouts` (or `admin/layouts` if we have not created `portals/` yet).
2. `create subadmin` → `admin/features/subadmin` (or `admin/components/subadmin` as an interim).
3. Move `Apiconnector.js` to `src/shared/api/client.js` and re-point every portal import.

After this, other portals no longer depend on `src/admin/services`.

### Phase 2 — shared kernel

Move `src/utils`, `src/context`, `src/hooks`, `src/redux`, `src/config`, `src/components` (shared only) into `src/shared` + `src/app`.

Keep a short **barrel** (`src/shared/index.js`) only if it does not create circular imports; prefer deep imports.

### Phase 3 — introduce `src/portals/` without reshaping features

Git-move (rename only):

- `src/admin` → `src/portals/admin`
- `src/designer` → `src/portals/designer`
- …same for driver, influencer, orderAgent → `order-agent`, supportAgent → `support-agent`, subadmin

Update route files. Still no page/api split.

### Phase 4 — admin feature folders (largest)

For each sidebar module, move that module’s pages, components, and `apis/*.js` into `features/{module}/`.

Suggested order (high traffic / already clustered):

1. inventory, orders, notifications, community, users  
2. catalog (categories, brands, sections, banners)  
3. money (wallet, gift, coupons, earnings, referral)  
4. staff (subadmin, designer, driver, influencer, order-agent CRUD)  
5. leftovers (faq, blog, news, policy, pincode, …)

Rename files to PascalCase / `*Api.js` **in the same commit as the move** so git rename detection still works (keep filename similarity high: `ShowItems.jsx` → `ItemListPage.jsx` can be a second commit).

### Phase 5 — other portals to the same feature shape

Driver: drop `drivercomponent`. Influencer: drop `influencercomponents` / `influencerapis`. Extract shared Login/OTP shell.

### Phase 6 — cleanup

- Delete empty `src/admin`, `src/assets` or use `shared/assets`
- Fix leftover comments (`src/apis/itemApi.js`)
- Align `package.json` name (`khush-admin-panel`)
- Path aliases in `vite.config.js`: `@shared`, `@portals/admin`

---

## 6. What I will not do in this rearrange

- Change `/admin/notification/segments` or any other public route.
- Merge the seven portals into separate Vite apps (that is a different project).
- Rewrite components or APIs “while we are here.”
- Move `dist/` or `node_modules`.
- Auto-fix Mongo/Redis/backend issues.

---

## 7. Risks

- **Git rename detection:** large files with content edits lose history. Moves first, renames second.
- **Case-only renames on Windows** (`Authapi.js` → `authApi.js`) need a two-step rename (`Authapi.js` → `authApi.tmp.js` → `authApi.js`).
- **Barrel files** can create circular imports with redux + api client. Prefer explicit paths.
- **Subadmin** currently mounts the same `adminPanelChildRoutes` + `Layout`. After Phase 3, both `/admin` and `/subadmin` import `portals/admin` features on purpose (shared product UI, different gate). That is allowed; the “no portal→portal” rule means designer must not import admin inventory pages.

---

## 8. Wait for your command

I will not move or rename anything until you say so.

Suggested first command if you agree with the plan:

- **“Do Phase 1”** — space folders + lift HTTP client to `shared/api`.

Or pick a different slice (e.g. admin inventory only).
