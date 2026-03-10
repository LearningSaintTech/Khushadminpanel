# Khush-Admin – Driver Flow Scan

Scan of the **driver (delivery agent)** flow in Khush-admin: what exists, what’s wired to the backend, and what’s missing relative to the KhushBackend delivery-agent APIs.

---

## 1. Current Driver Structure

### 1.1 Routes (`src/routes/driverroutes.jsx`)

| Route | Component | Purpose |
|-------|-----------|--------|
| `/driver` | → redirect | Redirects to `/driver/login` |
| `/driver/login` | `DriverLogin` | Phone number entry |
| `/driver/verify-otp` | `DriverOTP` | OTP verification |
| `/driver/dashboard` | `DriverDashboard` | Main list (orders / exchange) |
| `/driver/exchange-orders` | `Exchangeorder` | Exchange orders list |
| `/driver/orderdetails` | `OrderDetails` | Single order/delivery details |
| `/driver/exchange-orderdetails` | `Exchangeorderdetails` | Exchange order details |
| `/driver/replacement` | `Replacement` | Replacement flow |
| `/driver/reasons` | `Reason` | Reason selection |
| `/driver/payment` | `Payment` | Payment mode (Cash/Online) |
| `/driver/cash` | `Cash` | Cash payment |
| `/driver/online` | `Online` | Online payment |
| `/driver/order-history` | `OrderHistory` | Order history list |
| `/driver/deliver-history`, `/driver/deliveryhistory` | `Deliveryhistory` | Delivered orders history |
| `/driver/details` | `Details` | Details view |
| `/driver/profile` | `Profile` | Driver profile |

**Layout:** Routes under `BottomNavLayout` use the bottom navbar (Dashboard, Order History, Profile). Order details, payment, and reason screens are full-screen without bottom nav.

**Auth:** Driver routes are **not** wrapped in `ProtectedRoute`. Any user can open `/driver/login` or `/driver/dashboard` without a token. `ProtectedRoute` exists in `src/utils/ProtectedRoute.jsx` and supports `DRIVER` (redirect to `/driver/login`), but it is not used in `driverroutes.jsx`.

---

## 2. Backend Integration

### 2.1 What the Backend Provides (KhushBackend)

- **Auth:** `POST /api/delivery-agent/login`, `POST /api/delivery-agent/verify-otp`, refresh token, logout, get profile.
- **Availability:** `PATCH /api/delivery-agent/toggle-online` (body: `{ isOnline: true/false }`).
- **Deliveries (assignments):**
  - `GET /api/delivery-agent/deliveries` – list my assignments (PENDING/ACCEPTED/PICKED_UP/OUT_FOR_DELIVERY).
  - `POST /api/delivery-agent/deliveries/:assignmentId/accept`
  - `POST /api/delivery-agent/deliveries/:assignmentId/reject`
  - `POST /api/delivery-agent/deliveries/:assignmentId/pickup`
  - `POST /api/delivery-agent/deliveries/:assignmentId/out-for-delivery`
  - `POST /api/delivery-agent/deliveries/:assignmentId/delivered`

All delivery-agent APIs expect **Bearer token** for role `driver` and use the same base URL as the rest of the API (e.g. `{{baseUrl}}/api`).

### 2.2 What the Driver App Uses Today

| Area | Status | Notes |
|------|--------|--------|
| **Login** | ❌ No API | Phone input only; "Continue" just navigates to verify-otp. No `POST /api/delivery-agent/login`. |
| **Verify OTP** | ❌ No API | OTP inputs and "Resend OTP" are UI only. "Verify OTP" navigates to dashboard without calling `POST /api/delivery-agent/verify-otp` or storing token. |
| **Dashboard orders list** | ❌ No API | Uses dummy array `Array.from({ length: 20 })`. No `GET /api/delivery-agent/deliveries`. |
| **Accepting Pick-ups toggle** | ❌ No API | Local state only. No `PATCH /api/delivery-agent/toggle-online`. |
| **Order details** | ❌ No API | Static content; no `orderId` or `assignmentId` in route or from API. No accept/reject or status actions. |
| **Order history / Deliver history** | ❌ No API | Static arrays (e.g. `[1,2,3,4,5,6]`). No list from backend. |
| **Profile** | ❌ No API | Static "Ace Smith" card. No `GET /api/delivery-agent/profile` (or equivalent). |
| **Payment (Cash/Online)** | ❌ No API | UI only; no link to assignment or COD/online confirmation. |

**Conclusion:** The driver flow is a **UI-only mockup**. No driver-specific API module exists; `src/admin/apis/Driverapi.js` is for **admin** panel (create/list/update delivery agents), not for the driver app.

### 2.3 Shared API Setup

- **API client:** `src/admin/services/Apiconnector.js` – single axios instance, `baseURL: "http://192.168.1.44"`, no `/api` in base. Token from `localStorage.getItem("token")`; all admin/influencer/driver would share this key if driver ever called APIs.
- Driver app does **not** import or use this (or any) API layer.

---

## 3. UI Flow vs Backend Flow

| Driver app screen | Intended (backend) flow |
|-------------------|--------------------------|
| Dashboard | Show assignments from `GET /deliveries` (status PENDING → show Accept/Reject; ACCEPTED → show “Start pickup” etc.). |
| Toggle “Accepting Pick-ups” | Call `PATCH /delivery-agent/toggle-online`. |
| Order card click | Go to order/assignment details with `assignmentId` (and order/address/amount to collect). |
| Order details | Show address, items, amount to collect, payment mode; buttons: Accept / Reject (if PENDING), Mark Pickup, Out for Delivery, Delivered. |
| Order history / Deliver history | Could be driven by same `GET /deliveries` filtered by status (e.g. DELIVERED) or a dedicated history API if backend adds one. |

Right now, **none** of these screens call the backend; they use dummy data and local state.

---

## 4. Gaps Summary

1. **No driver auth integration** – Login and verify-otp do not call backend; no token is stored; routes are not protected.
2. **No driver API module** – No file like `src/driver/apis/deliveryAgentApi.js` (or under `admin/apis` with driver endpoints) for `/api/delivery-agent/*`.
3. **No “My deliveries” API** – Dashboard does not fetch `GET /api/delivery-agent/deliveries`.
4. **No toggle-online** – “Accepting Pick-ups” does not call `PATCH /api/delivery-agent/toggle-online`.
5. **No assignment actions** – Accept, Reject, Pickup, Out for delivery, Delivered are not wired to the corresponding POST APIs.
6. **No assignment/order context** – Order details screen has no `assignmentId` or `orderId` in URL or state; cannot call accept/reject/pickup/delivered for a specific assignment.
7. **No route protection** – Driver routes are not wrapped in `ProtectedRoute` with `allowedRoles={['DRIVER']}`.
8. **Base URL** – Backend is assumed at `http://192.168.1.44`; if backend uses a path prefix (e.g. `/api`), driver requests must use the same (e.g. paths like `/api/delivery-agent/deliveries`).

---

## 5. File Reference (Driver)

| Path | Role |
|------|------|
| `src/routes/driverroutes.jsx` | Driver route definitions |
| `src/driver/drivercomponent/Auth/Login.jsx` | Driver login UI (no API) |
| `src/driver/drivercomponent/Auth/Otp.jsx` | Driver OTP UI (no API) |
| `src/driver/drivercomponent/dashboard/home.jsx` | Dashboard – dummy orders, local toggle |
| `src/driver/drivercomponent/dashboard/Exchangeorder.jsx` | Exchange orders – dummy list |
| `src/driver/drivercomponent/Home/orderdetails.jsx` | Order details – static content |
| `src/driver/drivercomponent/order/orderHistory.jsx` | Order history – dummy list |
| `src/driver/drivercomponent/order/Deliveredorderhstory.jsx` | Delivered history – static |
| `src/driver/drivercomponent/Payment/Payment.jsx` | Payment mode – UI only |
| `src/driver/drivercomponent/Profile/Profile.jsx` | Profile – static |
| `src/admin/apis/Driverapi.js` | **Admin** delivery-agent CRUD (not driver app) |
| `src/admin/services/Apiconnector.js` | Shared axios + token (not used by driver today) |
| `src/utils/ProtectedRoute.jsx` | Supports DRIVER; not used in driver routes |

---

## 6. Recommended Next Steps

1. **Driver auth**  
   - In Login: call `POST /api/delivery-agent/login` with countryCode + phoneNumber; store `userId` (or similar) for OTP step.  
   - In OTP: call `POST /api/delivery-agent/verify-otp` with userId + otp; store access (and optionally refresh) token in localStorage (e.g. `token`), then navigate to dashboard.  
   - Wrap driver routes (e.g. everything under `/driver` except login and verify-otp) in `ProtectedRoute` with `allowedRoles={['DRIVER']}` so unauthenticated users are redirected to `/driver/login`.

2. **Driver API module**  
   - Add a small API module (e.g. `src/driver/apis/deliveryAgentApi.js` or under `admin/apis`) that uses the same `apiConnector` and defines:  
     - `login`, `verifyOtp`, `getProfile`, `logout`, `toggleOnline`,  
     - `getMyDeliveries`, `acceptDelivery`, `rejectDelivery`, `markPickup`, `markOutForDelivery`, `markDelivered`  
   - Ensure base URL and path prefix match backend (e.g. `/api/delivery-agent/...`).

3. **Dashboard**  
   - On load, call `getMyDeliveries()` and render real assignment cards (order ref, address snippet, amount to collect, payment mode, status).  
   - Wire “Accepting Pick-ups” toggle to `toggleOnline(isOnline)`.

4. **Order/assignment details**  
   - Use route param or location state for `assignmentId` (e.g. `/driver/orderdetails/:assignmentId` or `navigate('/driver/orderdetails', { state: { assignment } })`).  
   - Fetch or use assignment from `getMyDeliveries` and show address, items, amount, payment mode.  
   - Add buttons and call: Accept, Reject (if PENDING), Mark Pickup, Out for Delivery, Delivered, according to backend state machine.

5. **History**  
   - Reuse `getMyDeliveries` and filter by status (e.g. DELIVERED) for “Order history” / “Deliver history”, or add a dedicated history endpoint in backend and call it from these screens.

6. **Profile**  
   - Call driver get-profile API (if available) and show name/phone; optionally edit profile if backend supports it.

7. **Config**  
   - Prefer env (e.g. `VITE_API_BASE_URL`) for API base so driver app and admin can point to the same backend without hardcoding IP.

This scan aligns the current Khush-admin driver flow with the KhushBackend delivery-agent APIs and outlines the minimal wiring needed to make the driver app functional end-to-end.
