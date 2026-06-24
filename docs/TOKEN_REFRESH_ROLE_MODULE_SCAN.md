# Khushadminpanel — Token / Refresh / Role / Module Flow Scan

**Scan date:** June 22, 2026  
**Perspective:** End-to-end auth state machine (access token, httpOnly refresh cookie, role guards, subadmin modules)  
**Scope:** `Khushadminpanel` client — order-agent backend still deferred

---

## Architecture (intended)

```mermaid
sequenceDiagram
  participant UI as Panel UI
  participant Redux as Redux memory
  participant API as Apiconnector
  participant BE as KhushBackend

  UI->>BE: POST verify-otp
  BE-->>UI: accessToken JSON
  BE-->>UI: Set-Cookie refreshToken (httpOnly)
  UI->>Redux: setToken + setRole (JWT)
  Note over Redux: token NOT persisted; role persisted

  UI->>API: Bearer accessToken + x-device-id
  API->>BE: API call
  BE-->>API: 401 expired
  API->>BE: POST …/newAccessToken (cookie)
  BE-->>API: new accessToken
  API->>Redux: setToken + setRole

  Note over UI: Subadmin routes
  UI->>BE: GET /subadmin/my-module-access
  UI->>UI: SubadminModuleGate + sidebar canUse()
  BE->>BE: role.middleware module keys
```

---

## Layer summary

| Layer | Mechanism | Enforces security? |
|-------|-----------|-------------------|
| Access token | Redux memory only; stripped from `redux-persist` | Client UX; XSS can steal until `exp` |
| Refresh token | Single `refreshToken` httpOnly cookie per API origin | Server + Redis; not readable by JS |
| Route guard | `ProtectedRoute` + `getValidTokenRole()` (`exp`) | UI only |
| Role routing | `allowedRoles`, `STAFF_PANEL_ROLES` | UI only |
| Module UI | `ModuleAccessContext` + `SubadminModuleGate` | UI only |
| Module API | KhushBackend `role.middleware.js` + DB grants | **Real enforcement** |

---

## Issues found & fixes applied (this scan)

### Critical

| # | Issue | Risk | Fix |
|---|--------|------|-----|
| **C1** | `resolveRefreshRole` preferred **persisted Redux role** over JWT/URL | Wrong `/…/newAccessToken` when role stale → failed boot or wrong panel | **Fixed** — order: JWT → URL pathname → persisted role (`authSession.js`, `getRoleFromPathname`) |
| **C2** | `dispatch(logout())` on 401 **did not call server logout** | httpOnly refresh cookie stayed valid → silent re-login on refresh | **Fixed** — `performLogout({ server: true })` in `Apiconnector` (`sessionLogout.js`) |
| **C3** | Shared cookie name `refreshToken` for all panels on one API host | Last login wins; stale role breaks refresh | **Mitigated** — pathname fallback + `refreshAccessTokenWithFallback()` retries URL panel role |

### High

| # | Issue | Risk | Fix |
|---|--------|------|-----|
| **H1** | 401 interceptor refreshed token but **did not `setRole`** | Stale role → wrong refresh on next 401 | **Fixed** — `setRole(decodeTokenRole)` in `runTokenRefresh` |
| **H2** | `ModuleAccessContext` used **persisted role before JWT** | Subadmin sidebar/gates wrong if role/token mismatch | **Fixed** — `getValidTokenRole(token)` first |
| **H3** | `ProtectedRoute` dispatched side effects **during render** | Extra Redux writes every render | **Fixed** — `useEffect` for `setRole` / `clearOtherPanelSessions` |
| **H4** | Session validation failure only cleared Redux, not cookie | Revoked user could refresh again | **Fixed** — `performLogout({ server: true })` on validation failure |

### Medium (known / accepted)

| # | Issue | Status |
|---|--------|--------|
| **M1** | Single Redux `global.token` for all panels | Open — use separate subdomains or persist keys long-term |
| **M2** | `ORDER_AGENT` refresh endpoint 404 | Gated — skip refresh; workspace disabled |
| **M3** | Admin OTP at `/admin/otp` accepts non-admin JWT roles | By design — routes to correct panel; unknown role → logout |
| **M4** | JWT not signature-verified on client | Expected — backend verifies on every API call |

---

## Flow by panel

### Boot (`AuthSessionProvider`)

1. `redux-persist` rehydrates **role only** (token forced `null`)
2. If no/expired token → `resolveRefreshRole` (JWT → path → persist)
3. Skip refresh for `ORDER_AGENT`
4. `refreshAccessTokenWithFallback` — retry with URL role if first fails
5. On success → `setToken` + `setRole` from JWT
6. Server validation per role (`getProfile`, `getMyModuleAccess`, etc.)
7. On validation failure → server logout + client clear

### API call (`Apiconnector`)

1. Request: `Authorization` + `x-device-id` + `withCredentials`
2. 401 → single-flight refresh (skip `ORDER_AGENT`)
3. Success → retry request; sync `setRole`
4. Failure → `performLogout({ server: true })` + redirect to panel login

### Protected route

1. Wait for `sessionReady`
2. Require memory token
3. `getValidTokenRole` (checks `exp`)
4. `roleAllowed` vs `allowedRoles` (`SUPER_SUBADMIN` aliases to `SUBADMIN`)
5. Subadmin child routes → `SubadminModuleGate` + module map

### Subadmin / super_subadmin modules

| Step | Component | Behavior |
|------|-----------|----------|
| Fetch | `ModuleAccessContext` | `GET /subadmin/my-module-access` when `filterByModules` |
| Sidebar | `sidebar.jsx` `canUse()` | Hides nav items |
| Direct URL | `SubadminModuleGate` | `AccessDenied` if module missing |
| API 403 | `Apiconnector` | Toast "Module access denied" on `/subadmin/*` |

`order-agents` CRUD remains **admin-only** in `ADMIN_ONLY_ROUTE_PATTERNS`.

---

## Token / refresh grep checklist

| Check | Result |
|-------|--------|
| `localStorage` access/refresh token | ✅ None in app code |
| `redux-persist` strips token | ✅ `Appstore.js` transform |
| `withCredentials` on axios | ✅ Apiconnector + authSession refresh client |
| `newAccessToken` per role | ✅ `authSession.js` map |
| OTP in logs / router state | ✅ Clean on auth paths |
| Server logout on forced client logout | ✅ `sessionLogout.js` |

---

## Files changed (this scan)

| File | Change |
|------|--------|
| `src/utils/authRole.js` | `getRoleFromPathname()` |
| `src/utils/authSession.js` | JWT/path-first `resolveRefreshRole`, `refreshAccessTokenWithFallback` |
| `src/utils/sessionLogout.js` | **New** — server + client logout |
| `src/admin/services/Apiconnector.js` | Role sync on refresh; server logout on 401; skip order-agent |
| `src/context/AuthSessionContext.jsx` | Fallback refresh; server logout on invalid session |
| `src/utils/ProtectedRoute.jsx` | Hooks-safe role sync; server logout on wrong role |
| `src/context/ModuleAccessContext.jsx` | JWT-first role for module fetch |

---

## Manual verification matrix

| Scenario | Expected |
|----------|----------|
| Admin login → refresh page | Dashboard via cookie refresh |
| Subadmin login → refresh | Module list loads; sidebar filtered |
| Super subadmin | Same as subadmin; `STAFF_PANEL_ROLES` on routes |
| Access token expires mid-session | Silent refresh + retry |
| 401 after refresh fails | Server logout; cookie cleared; login page |
| Subadmin hits admin-only URL | `AccessDenied` or redirect |
| Subadmin API 403 | Toast + error |
| Login subadmin after admin (same browser) | Subadmin cookie wins; path-based refresh works |
| Order-agent panel | Unavailable page (env gate); no refresh loop |

---

## Remaining (not in scope)

- Order-agent KhushBackend APIs (deferred)
- Per-panel token isolation (R5)
- CDN-level CSP
- `npm audit` dependency bumps

---

## Related docs

- [ADMIN_PANEL_SECURITY_STATUS.md](./ADMIN_PANEL_SECURITY_STATUS.md)
- [ADMIN_PANEL_SECURITY_AUDIT.md](./ADMIN_PANEL_SECURITY_AUDIT.md)
- [KhushBackend/docs/MODULE_ACCESS.md](../../KhushBackend/docs/MODULE_ACCESS.md)
