# Khush-admin – Notification & Real-Time Integration (Implementation Guide)

This document describes **in-app notifications** and **real-time updates** in Khush-admin for the **three flows: Admin, SubAdmin, and Driver**. It also documents the **Templates** and **Broadcast** flows (admin send-side), which are **implemented** in the admin UI.

**Admin notification UI:** The sidebar has a **Notifications** dropdown with: (1) All notifications, (2) All send notifications, (3) Templates (In-app, Email), (4) Broadcast, plus History and Test. A **notification bell icon** beside the Khush logo shows unread count and a dropdown of recent notifications. See **NOTIFICATION_ADMIN_UI_PHASES.md** for the full phased plan (filters, analytics, broadcast history, etc.).

---

## 0. Admin Notification & Real-Time – Flows and Features (Summary)

### 0.1 What the admin side handles

| Area | Description |
|------|-------------|
| **Receive (all roles)** | Admin, SubAdmin, and Driver each **receive** in-app notifications (list, unread count, mark read) and **real-time** delivery via Socket.IO (`notification:new`). Data is scoped by **userId** from JWT. |
| **Send (Admin only)** | **Templates** – CRUD for in-app templates (key, title, body). **Email templates** – CRUD for email templates (key, subject, html, text). **Broadcast** – send to all users. WhatsApp/SMS use third-party registered templates only. Backend routes require role `admin`; SubAdmin gets 403. |
| **Real-time** | Single Socket.IO connection per user; room `user:${userId}`. No separate “admin socket” or “driver socket”; who receives what is determined by which userId the backend targets. |

### 0.2 All features and flows (comprehensive)

| Feature | Admin | SubAdmin | Driver | Backend / Notes |
|--------|--------|----------|--------|------------------|
| **View my notifications** | ✅ `/admin/notifications` | ✅ Same | ✅ `/driver/notifications` | `GET /notification/list`, `GET /notification/unread-count` |
| **Mark read / mark all read** | ✅ | ✅ | ✅ | `PATCH /notification/:id/read`, `PATCH /notification/read-all` |
| **Real-time new notification** | ✅ Socket `notification:new` | ✅ | ✅ | Socket room `user:${userId}`; backend emits after creating in-app record |
| **Bell + badge** | ✅ Layout top bar + Sidebar | ✅ Same | ✅ DriverHeader | Unread count from context |
| **Templates (in-app; list, create, edit, delete)** | ✅ `/admin/notifications/templates` | ❌ 403 | ❌ N/A | `GET/POST/PUT/DELETE /admin/notification/templates` |
| **Email templates (list, create, edit, delete)** | ✅ `/admin/notifications/email-templates` | ❌ 403 | ❌ N/A | `GET/POST/PUT/DELETE /admin/notification/email-templates` |
| **Broadcast (send to all users)** | ✅ `/admin/notifications/broadcast` | ❌ 403 | ❌ N/A | `POST /admin/notification/broadcast` |
| **Notification history** | ✅ `/admin/notifications/history` | ❌ 403 | N/A | `GET /admin/notification/history` |
| **Test email / SMS / WhatsApp** | ✅ `/admin/notifications/test` | ❌ 403 | N/A | `POST /admin/notification/test-*` |
| **Web push subscribe/unsubscribe** | Same REST APIs as user | Same | Same | Optional; admin/driver can subscribe for push |

### 0.3 End-to-end flows (admin-related)

1. **Admin receives a notification**  
   Backend creates in-app notification for admin’s `userId` (e.g. broadcast to all, or system alert) → stores in DB → `emitToUser(adminUserId, 'notification:new', payload)` → Admin’s Socket.IO client receives → NotificationContext updates list and unread count → bell badge and list UI update.

2. **Admin sends a broadcast**  
   Admin opens **Broadcast** page → enters title, body, selects channels (in_app, email, whatsapp, web_push) → submits → `POST /admin/notification/broadcast` → Backend creates one in-app notification per user (and optionally queues email/WhatsApp) → each user’s socket receives `notification:new` if connected.

3. **Admin manages templates**  
   Admin opens **Templates** page → list from `GET /admin/notification/templates` → Create: key, title, body (with `{{var}}` placeholders), module, isActive → Edit/Delete existing. Templates are used when sending notifications with that key (e.g. broadcast uses `BROADCAST` template in code; custom keys can be used for future admin-defined events).

4. **Driver receives assignment notification**  
   Backend (order/assignment service) creates in-app notification for driver’s `userId` → emits `notification:new` → Driver’s client updates → bell and `/driver/notifications` show new item; link to assignment via `referenceId`.

5. **SubAdmin receive-only**  
   Same as Admin for **receiving** (bell, list, real-time). SubAdmin sees **Templates** and **Broadcast** links but gets **403** if they call those APIs (backend `allowRoles("admin")` only).

### 0.4 Template strategy: Mail & In-app vs WhatsApp/SMS

In admin we give **two options** for who defines the content:

| Channel | Who defines templates | Where |
|--------|------------------------|--------|
| **Email** | **Admin creates own** | Admin → **Email templates** (key, subject, html with `{{var}}`). When a notification is sent with that key, backend uses the admin-created email template. |
| **In-app** | **Admin creates own** | Admin → **Templates** (in-app) (key, title, body with `{{var}}`). When a notification is sent with that key, backend uses the admin-created in-app template. |
| **WhatsApp** | **Third-party only** | Templates are **decided and approved by the provider** (e.g. Twilio/WhatsApp). You **register** them in the provider’s dashboard, then set the Content SID in backend env. No admin CRUD for WhatsApp. |
| **SMS** | **Third-party only** | Same as WhatsApp: use **third-party registered templates** (Twilio Content SID). No admin CRUD for SMS. |

So: **Mail and in-app = admin can create their own templates** in the admin panel. **WhatsApp and SMS = use third-party templates only** (register with provider, map in backend).

---

## 1. Backend Summary (What’s Already There)

- **Base URL:** API host + `/api` (e.g. `http://localhost:5000/api`). Khush-admin currently hardcodes this in `src/admin/services/Apiconnector.js`; consider `VITE_API_BASE_URL` for env switching.
- **Auth:** All requests send `Authorization: Bearer <token>`. Admin, SubAdmin, and Driver use `localStorage.getItem("token")`; `apiConnector` adds it when present.
- **Socket.IO:** Same host as API, **no** `/api` path (e.g. `http://localhost:5000`). Handshake: `auth: { token }`. Backend joins the client to room **`user:${userId}`** (userId from JWT). One room per user; **role is not part of the room name**. When the backend creates an in-app notification for a given userId, it emits `notification:new` to that user’s room.

### 1.1 User Notification REST APIs (Receive – All Authenticated Users)

Same for **Admin, SubAdmin, and Driver**. Each gets **only their own** list/count (filtered by `userId` from JWT):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notification/list` | Paginated list for **current user**. Query: `page`, `limit`. Response: `{ list, total, page, limit }`. |
| GET | `/notification/unread-count` | Unread count for **current user**. Response: `{ count }`. |
| PATCH | `/notification/:id/read` | Mark one as read. Params: `id` (24-char hex ObjectId). |
| PATCH | `/notification/read-all` | Mark all as read for **current user**. |
| POST | `/notification/push-subscribe` | Register web push for **current user**. Body: `{ subscription: { endpoint, keys: { p256dh, auth } }, deviceLabel? }`. |
| POST | `/notification/push-unsubscribe` | Remove web push. Body: `{ endpoint }`. |

Full URL = `baseURL + path`.

### 1.2 Admin-Only Notification APIs (Send – Broadcast / Templates)

Mounted at **`/admin/notification`** (e.g. `.../api/admin/notification/...`). Used to **send** notifications and manage templates:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/notification/broadcast` | Send in-app (and optionally email/whatsapp/web_push) to **all users**. Body: `{ title, body, channels? }`. |
| GET | `/admin/notification/templates` | List in-app templates. Query: `page`, `limit`. |
| POST | `/admin/notification/templates` | Create template. Body: `{ key, title, body }`. |
| PUT | `/admin/notification/templates/:id` | Update template. |
| DELETE | `/admin/notification/templates/:id` | Delete template. |
| GET | `/admin/notification/history` | Notification history. |
| POST | `/admin/notification/test-email` | Test email. |

Backend uses **`allowRoles("admin")`** (role string as in JWT). Only tokens with that role can call these. **SubAdmin** typically has a different role (e.g. `SUBADMIN`) and will get **403** on these routes unless the backend explicitly allows `SUBADMIN`.

### 1.3 Real-Time (Socket.IO) – Backend Behaviour

- **Connect:** Client connects to API host only (no `/api`).
- **Auth:** `auth: { token: token }`. Backend validates JWT and sets `socket.userId`; client is joined to **`user:${userId}`**.
- **Event:** When the backend creates an in-app notification for a **specific userId**, it calls `emitToUser(userId, "notification:new", payload)`. Only that user’s connected clients receive it.
- **Payload:** `{ id, title, body, module, referenceId, createdAt }` (strings where applicable).

There are **no role-based rooms** (e.g. no `admin:*` or `driver:*`). Who receives what is determined by **who the backend sends to** (which userId), not by room name.

---

## 2. Three Flows: Admin, SubAdmin, Driver (Notification & Real-Time Data Flow)

Khush-admin has **three distinct flows**. Each uses the **same** backend APIs and socket mechanism (same room key `user:${userId}`), but **who receives which notifications** and **who can send** differs.

### 2.1 Flow 1: Admin (role ADMIN)

| Aspect | Description |
|--------|-------------|
| **App / routes** | Khush-admin, path prefix **`/admin`**. Protected by `allowedRoles: ['ADMIN', 'SUBADMIN']`; Admin user has role **ADMIN**. Layout: Sidebar + `<Outlet />` (no top bar). |
| **Auth** | Token in localStorage; JWT contains `userId` (admin user’s ID) and `role: "ADMIN"`. |
| **Receive – notifications** | Admin user has a **userId**. Backend stores in-app notifications per userId. Admin receives: (1) **Broadcast** – when an admin sends a broadcast, backend sends to all users (from User collection), so if the admin is also in that list they get it; (2) **System / operational** – any future notifications the backend sends to this admin userId. |
| **Receive – real-time** | Socket connects with same token; backend joins to **`user:${adminUserId}`**. When the backend creates an in-app notification for this userId, it emits `notification:new` to that room. Admin’s client gets real-time updates for **their** notifications only. |
| **Send** | Admin **can send**: call **`/admin/notification/broadcast`** (to all users), and **`/admin/notification/templates`** CRUD. Backend allows these for `allowRoles("admin")`; ensure JWT role matches (e.g. `"admin"` or `"ADMIN"` as per backend). |
| **UI** | Bell + badge (unread count) + “See all” → `/admin/notifications`. **Templates** → `/admin/notifications/templates`. **Broadcast** → `/admin/notifications/broadcast`. |

**Data flow (Admin):**  
Backend sends to admin’s userId (e.g. broadcast includes admin, or system alerts) → in-app record created → `emitToUser(adminUserId, "notification:new", payload)` → Admin client in room `user:adminUserId` receives → list/badge update. Admin can also **trigger** broadcast/templates via `/admin/notification/*`.

---

### 2.2 Flow 2: SubAdmin (role SUBADMIN)

| Aspect | Description |
|--------|-------------|
| **App / routes** | **Same** Khush-admin, same **`/admin`** prefix, same Layout and Sidebar as Admin. Protected by `allowedRoles: ['ADMIN', 'SUBADMIN']`; SubAdmin user has role **SUBADMIN**. |
| **Auth** | Token in localStorage; JWT contains **different** `userId` (SubAdmin’s ID) and `role: "SUBADMIN"`. |
| **Receive – notifications** | SubAdmin has their **own userId**. They get **only their own** in-app list/count (same API `/notification/list`, `/notification/unread-count`). Content: (1) **Broadcast** – if broadcast is sent to “all users” and SubAdmin is in that list, they receive it; (2) any other notifications the backend targets at this SubAdmin userId (e.g. scoped alerts). |
| **Receive – real-time** | Socket connects with SubAdmin’s token; backend joins to **`user:${subAdminUserId}`**. SubAdmin receives `notification:new` **only** when the backend creates a notification for **this** userId. So real-time flow is **per-user**, not shared with Admin. |
| **Send** | Backend admin routes use **`allowRoles("admin")`**. If the backend only allows role `"admin"` (and not `"SUBADMIN"`), SubAdmin will get **403** on `/admin/notification/broadcast` and `/admin/notification/templates`. So SubAdmin is typically **receive-only** for notifications unless the backend is extended to allow SUBADMIN. |
| **UI** | Same bell + badge + “See all” → `/admin/notifications`. **Hide or disable** “Broadcast” / “Templates” in the admin UI when role is SUBADMIN (or handle 403 gracefully). |

**Data flow (SubAdmin):**  
Backend sends to SubAdmin’s userId (e.g. broadcast to all users including SubAdmin, or scoped notification) → in-app record for SubAdmin → `emitToUser(subAdminUserId, "notification:new", payload)` → SubAdmin client in room `user:subAdminUserId` receives → list/badge update. SubAdmin does **not** trigger broadcast/templates (unless backend allows).

---

### 2.3 Flow 3: Driver (role DRIVER)

| Aspect | Description |
|--------|-------------|
| **App / routes** | Khush-admin, path prefix **`/driver`**. Protected by `allowedRoles: ["DRIVER"]`. Layout: **DriverAppLayout** (DriverHeader + `<Outlet />`). Different layout and routes from Admin/SubAdmin. |
| **Auth** | Token in localStorage; JWT contains **driver’s** `userId` (delivery agent ID) and `role: "DRIVER"`. Driver uses same `apiConnector` but different login/auth (delivery agent auth). |
| **Receive – notifications** | Driver has their **own userId**. They get **only their own** in-app list/count via same APIs (`/notification/list`, `/notification/unread-count`). Content is **driver-specific**: e.g. new assignment, order ready for pickup, delivery update, exchange request. Backend must send notifications to **driver’s userId** when those events occur (e.g. when an assignment is created/updated for this driver). |
| **Receive – real-time** | Socket connects with driver’s token; backend joins to **`user:${driverUserId}`**. Driver receives `notification:new` **only** when the backend creates a notification for **this** driver. So real-time flow is **driver-specific** (assignment/delivery events targeted at this driver). |
| **Send** | Driver **does not send** notifications (no broadcast, no templates). Receive-only. |
| **UI** | Bell in **DriverHeader** (replace existing placeholder 🔔) + badge + dropdown or link → `/driver/notifications`. Full list page at `/driver/notifications`. Use `module` / `referenceId` to link to assignment or order (e.g. `/driver/assignment/:id`). |

**Data flow (Driver):**  
Backend (e.g. assignment or order service) creates an in-app notification for **driver’s userId** → `emitToUser(driverUserId, "notification:new", payload)` → Driver client in room `user:driverUserId` receives → list/badge update. Driver never calls `/admin/notification/*`.

---

### 2.4 Summary Table (Three Flows)

| Flow | Role | App path | Layout | Receive (source) | Real-time room | Send (APIs) |
|------|------|----------|--------|-------------------|----------------|-------------|
| **Admin** | ADMIN | `/admin` | Sidebar + Outlet | Own userId; broadcast + system | `user:${adminUserId}` | Broadcast, templates (`/admin/notification/*`) |
| **SubAdmin** | SUBADMIN | `/admin` | Same as Admin | Own userId; broadcast (if in list) + scoped | `user:${subAdminUserId}` | Typically none (403 on admin routes) |
| **Driver** | DRIVER | `/driver` | DriverHeader + Outlet | Own userId; assignment/delivery | `user:${driverUserId}` | None |

Implementing the **same** “receive” layer (notification API + socket + bell + list page) in the app works for all three; only the **send** layer (broadcast/templates UI) and **where the bell lives** (Layout/Sidebar vs DriverHeader) and **links** (admin orders vs driver assignment) differ per flow.

---

## 3. Khush-admin Current State (Scanned)

### 3.1 Project Structure

- **Stack:** React 18, Vite 7, React Router 6, Redux (e.g. `GlobalSlice`: token, role, user), Tailwind 4, Axios via `apiConnector`, lucide-react, react-icons.
- **Entry:** `index.html` → `src/main.jsx` → `App` with `Provider` and `BrowserRouter`.
- **Three flows in scope:** Admin, SubAdmin (both use `/admin` + same Layout), Driver (uses `/driver` + DriverAppLayout). Influencer is a separate flow (optional to add later).

### 3.2 Auth

- **Token storage:** `localStorage.getItem("token")` (and `role`; admin also uses `admin_userId`, `admin_phone`; influencer uses `userId`; driver uses `sessionStorage` for driver IDs before OTP, then token in localStorage).
- **Redux:** `src/redux/GlobalSlice.js` — `token`, `role`, `user`; actions `setToken`, `setRole`, `logout` (clears state and removes `token`/`role` from localStorage). Selectors in `GlobalSelector.js` (e.g. `selectToken`, `selectIsAuthenticated`).
- **API client:** `src/admin/services/Apiconnector.js` — axios instance with `baseURL: "http://localhost:5000/api"`; request interceptor adds `Authorization: Bearer ${localStorage.getItem("token")}`. Response interceptor returns `response.data`; errors reject with a message string.
- **Logout:** Admin sidebar calls `logoutUser()` then clears localStorage and redirects. Driver/Influencer have their own logout (driverApi, influencer fetch to logout endpoint); all clear token and redirect.

### 3.3 API Usage Pattern

- **Admin:** `src/admin/apis/*.js` — e.g. `Authapi.js`, `Orderapi.js` — use `import { apiConnector } from "../services/Apiconnector"` and call `apiConnector("GET", "/orders", ...)` (path relative to baseURL).
- **Driver:** `src/driver/apis/driverApi.js` uses the same `apiConnector` from `../../admin/services/Apiconnector`.
- **Influencer:** `src/influencer/influencerapis/*.js` use the same `apiConnector`.

So a new **notification service** can live under `src/admin/services/` or a shared `src/services/` and use `apiConnector` with paths like `/notification/list`, `/notification/unread-count`, etc. Admin-only features use `/admin/notification/broadcast`, `/admin/notification/templates`, etc.

### 3.4 Layouts and Where to Add the Bell

| Flow | Layout | Where to add notification bell / list |
|---------|--------|--------------------------------------|
| **Admin** | `Layout.jsx`: Sidebar + `<Outlet />` in main. No top bar. | Add a **small top bar** in `Layout.jsx` above `<Outlet />` with bell + dropdown (and optional “See all” link), **or** add a bell/link in the **Sidebar** (e.g. near the logo or in the nav list). |
| **Driver** | `DriverAppLayout.jsx`: `DriverHeader` + `<Outlet />`. | **DriverHeader.jsx** already has a placeholder **bell button** (emoji 🔔, no dropdown or link). Replace or enhance it with a real notification bell, badge (unread count), and dropdown or link to `/driver/notifications`. |
| **SubAdmin** | Same as Admin (same Layout). | Same bell and “See all” → `/admin/notifications`; optionally hide Broadcast/Templates when role is SUBADMIN. |

### 3.5 Existing Notification / Real-Time

- **None.** No notification module, no Socket.IO, no WebSocket or SSE. No notification API or Redux slice.
- **Driver:** One decorative bell button in `DriverHeader.jsx` (no badge, no dropdown, no navigation).

### 3.6 Routes

- **Admin / SubAdmin:** `src/routes/adminroutes.jsx` — index `/admin` = Login, `otp` = OTP; then `<ProtectedRoute allowedRoles={['ADMIN','SUBADMIN']}><Layout /></ProtectedRoute>` with nested routes. Add `<Route path="notifications" element={<AdminNotificationsPage />} />` inside that layout (same page for both roles).
- **Driver:** `src/routes/driverroutes.jsx` — `login`, `verify-otp`; then `<ProtectedRoute allowedRoles={["DRIVER"]}>` + `DriverAppLayout` + `BottomNavLayout` with nested routes. Add `<Route path="notifications" element={<DriverNotificationsPage />} />` inside the same layout.

### 3.7 Environment

- **Used:** `VITE_GOOGLE_MAPS_EMBED_KEY`, `VITE_BASE_URL` (influencer logout URL). **Not used for API base:** the main API URL is hardcoded in `Apiconnector.js`. Recommend introducing `VITE_API_BASE_URL` (or reuse `VITE_BASE_URL` if it is the API host) so Socket URL can be derived (same host, no `/api`).

---

## 4. Implementation Plan (Doc Only – No Code Yet)

### 4.1 Dependencies

- Add **socket.io-client** so Admin, SubAdmin, and Driver clients can connect to the backend Socket.IO server and listen for `notification:new`.

### 4.2 Environment / Base URL

- **Option A:** Keep current hardcoded base URL; for Socket, derive host (e.g. `http://localhost:5000`) by stripping `/api` from the base URL string.
- **Option B (recommended):** Add `VITE_API_BASE_URL` (e.g. `http://localhost:5000/api`) in `.env` and use it in `Apiconnector.js` as `baseURL`. Socket URL = same origin without `/api` (e.g. `VITE_API_BASE_URL.replace(/\/api\/?$/, '')` or a separate `VITE_SOCKET_URL`).

### 4.3 Notification REST Service (Shared Across Flows)

- **File:** e.g. `src/admin/services/notificationApi.js` or `src/services/notificationApi.js` (shared). Use existing `apiConnector` (so auth header is automatic via localStorage token).
- **User APIs (all three flows – Admin, SubAdmin, Driver):**
  - `getList(params)` → `GET /notification/list` with `params: { page, limit }`.
  - `getUnreadCount()` → `GET /notification/unread-count`.
  - `markRead(id)` → `PATCH /notification/:id/read`.
  - `markAllRead()` → `PATCH /notification/read-all`.
  - `pushSubscribe(subscription, deviceLabel?)` → `POST /notification/push-subscribe`.
  - `pushUnsubscribe(endpoint)` → `POST /notification/push-unsubscribe`.
- **Admin-only APIs (Flow 1 – Admin only; SubAdmin may get 403):**
  - `broadcast(body)` → `POST /admin/notification/broadcast`.
  - `listTemplates(params)` → `GET /admin/notification/templates`.
  - `createTemplate(body)` → `POST /admin/notification/templates`.
  - `updateTemplate(id, body)` → `PUT /admin/notification/templates/:id`.
  - `deleteTemplate(id)` → `DELETE /admin/notification/templates/:id`.
- Normalise responses: backend returns `{ success, message, data }`; use `data` or top-level fields so components get `{ list, total, page, limit }`, `{ count }`, etc.

### 4.4 Real-Time: Socket.IO Connection and Hook

- **Socket URL:** API host only (no `/api`). Same as khushWeb.
- **When to connect:** Only when the user is authenticated (token available). Disconnect on logout or when token is cleared.
- **Auth in handshake:** `auth: { token: token }` (from localStorage or Redux).
- **Listen:** On connection, subscribe to `notification:new`. When received, update list and unread count so the bell badge and dropdown/list update.
- **Suggested place:** A **NotificationContext** (or a **useNotificationSocket** hook) that:
  - Holds: list (or last N for dropdown), unreadCount, loading.
  - Provides: refreshList(), refreshUnreadCount(), markRead(id), markAllRead(), and prependFromSocket(payload) for socket payloads.
  - On mount when token exists: fetch initial list and unread count; open Socket.IO with token; on `notification:new`, prepend payload and increment unread count.
  - On logout: disconnect socket, clear list and count.
- **Where to provide context:** Wrap the **entire app** (or each persona’s subtree) with a NotificationProvider so Layout/Header and NotificationsPage can use the same context. Ensure the provider is inside the auth layer so token is available (e.g. after Redux Provider and Router).

### 4.5 UI: Notification Bell and List (Per Flow)

- **Admin / SubAdmin:** Add a top bar in `Layout.jsx` (or bell in Sidebar) with bell icon, IconBadge(unreadCount), and dropdown (“See all” → `/admin/notifications`). Same UI for both roles. For **Admin only**, optionally show Broadcast/Templates UI; for **SubAdmin**, hide or disable it (backend may return 403).
- **Driver:** In `DriverHeader.jsx`, replace the placeholder 🔔 with a real bell, IconBadge(unreadCount), and dropdown or link to `/driver/notifications`. Use `module` / `referenceId` to link to assignment (e.g. `/driver/assignment/:id`).
- **Full list page (per flow):** Admin/SubAdmin: one page at `/admin/notifications`. Driver: one page at `/driver/notifications`. Each fetches paginated list, mark read / mark all read; links depend on flow (admin → orders, driver → assignment).

### 4.6 Routes and Constants

- **Admin / SubAdmin:** In `adminroutes.jsx`, add `<Route path="notifications" element={<AdminNotificationsPage />} />` inside the protected Layout. Add a nav link in Sidebar to `/admin/notifications`.
- **Driver:** In `driverroutes.jsx`, add `<Route path="notifications" element={<DriverNotificationsPage />} />` inside the DriverAppLayout/BottomNavLayout. Optionally add “Notifications” to bottom nav or only via header bell.

### 4.7 Web Push (Optional)

- Same as khushWeb: request permission, register service worker, subscribe with VAPID public key, send subscription to `POST /notification/push-subscribe`. On logout, call `pushUnsubscribe(endpoint)`. Optional for admin/driver/influencer; can be phased later.

### 4.8 Admin-Only: Broadcast and Templates UI (Optional)

- If the admin panel should **send** global notifications and manage in-app templates:
  - Add a section or page under Admin (e.g. “Notifications” or “Broadcast”) that calls `POST /admin/notification/broadcast` and lists/creates/edits templates via the admin notification APIs above.
  - This is separate from the “my notifications” bell/list; the bell is for **receiving** in-app notifications (admin user also has a userId and receives notifications like anyone else).

---

## 5. Data Flow Summary (Per Flow)

- **Admin:** Login (ADMIN) → token (admin userId) → fetch list/count, connect socket to `user:${adminUserId}`. Backend sends to this userId (e.g. broadcast includes admin) → in-app record → `notification:new` → Admin client updates. Admin can **send** broadcast/templates via `/admin/notification/*`.
- **SubAdmin:** Login (SUBADMIN) → token (subAdmin userId) → same receive path (own list/count, room `user:${subAdminUserId}`). Receives when backend targets this userId (e.g. broadcast to all). **Send:** typically 403 on admin routes; receive-only.
- **Driver:** Login (DRIVER) → token (driver userId) → same receive path (own list/count, room `user:${driverUserId}`). Receives when backend targets this driver (e.g. new assignment). **Send:** none.

In all flows: logout → disconnect socket, clear list/count, remove token.

---

## 6. Backend Event Payload Reference

**Event:** `notification:new`  
**Payload:**

```json
{
  "id": "string (Mongo ObjectId)",
  "title": "string",
  "body": "string",
  "module": "string | null (e.g. 'order')",
  "referenceId": "string | null",
  "createdAt": "ISO date string"
}
```

Use `module` and `referenceId` to build links: Admin/SubAdmin → orders list or order detail; Driver → assignment or order (e.g. `/driver/assignment/:id`).

---

## 7. File and Component Checklist (To Implement When You Command)

| Item | Purpose |
|------|---------|
| `package.json` | Add dependency: `socket.io-client`. |
| Env / `Apiconnector.js` | Optional: use `VITE_API_BASE_URL` for baseURL; derive Socket URL. |
| `src/admin/services/notificationApi.js` (or shared) | User APIs: list, unread-count, mark read, read-all, push-subscribe, push-unsubscribe. Optionally admin APIs: broadcast, templates CRUD. |
| `src/.../NotificationContext.jsx` (or hook) | State: list, unreadCount; socket connect when token exists; listen `notification:new`; provide refreshList, refreshUnreadCount, markRead, markAllRead, prependFromSocket. |
| `App.jsx` or layout roots | Wrap app (or each flow’s layout) with NotificationProvider so Header/Sidebar and NotificationsPage can use it. |
| Admin: `Layout.jsx` or Sidebar | Bell + badge + dropdown (or link) and “See all” → `/admin/notifications`. |
| Admin: `adminroutes.jsx` | Routes: `notifications`, `notifications/templates`, `notifications/email-templates`, `notifications/broadcast`, `notifications/history`, `notifications/test`. |
| Admin: `AdminNotificationsPage.jsx` | List, mark read, mark all read. |
| Admin: `AdminNotificationTemplatesPage.jsx` | In-app templates: list, create/edit/delete (key, title, body, module, isActive). |
| Admin: `AdminEmailTemplatesPage.jsx` | Email templates: list, create/edit/delete (key, subject, html, text). |
| Admin: `AdminBroadcastPage.jsx` | Form: title, body, channels; submit to broadcast. |
| Admin: `AdminNotificationHistoryPage.jsx` | History list with filters (channel, success, from/to date); pagination. |
| Admin: `AdminNotificationTestPage.jsx` | Test Email, Test SMS, Test WhatsApp forms; submit to test-* endpoints. |
| Driver: `DriverHeader.jsx` | Replace placeholder bell with real bell + badge + dropdown or link to `/driver/notifications`. |
| Driver: `driverroutes.jsx` | Route `notifications`; optional bottom nav item. |
| Driver: Notifications page | e.g. `DriverNotificationsPage.jsx` — list, mark read; link to assignment when `module`/`referenceId` indicate assignment. |
| Icons | Bell icon (lucide-react Bell or similar) and optional badge component if not present. |

*(Influencer flow can be added later with same receive pattern; separate layout and routes.)*

---

## 8. Order of Implementation (When You Command)

Suggested order:

1. Add `socket.io-client` and create notification API module (user endpoints; optionally admin broadcast/templates for Admin).
2. Create NotificationContext (or hook) that fetches list and unread count when token exists; no socket yet. Expose unreadCount and list.
3. Add notification bell and badge in **Driver** first (DriverHeader already has the placeholder), “See all” → `/driver/notifications`, and DriverNotificationsPage. Add route in driverroutes.
4. Add Socket.IO in the same context: connect when token exists, listen for `notification:new`, update list/count. Test (e.g. backend sends to driver userId).
5. Add **Admin / SubAdmin** bell (Layout or Sidebar), route `/admin/notifications`, and AdminNotificationsPage. Same page for both roles; optionally hide Broadcast/Templates for SubAdmin.
6. (Optional) Web push; (Optional) Admin broadcast/templates UI for Admin only.

---

**End of document. Awaiting your command to implement the code.**
