# Driver Module – Full Code Scan

**Scanned:** All files under `Khush-admin/src/driver` and driver routes.  
**Total files:** 22 (1 API, 1 doc, 20 components).

---

## 1. Structure Overview

```
src/driver/
├── apis/
│   └── driverApi.js           # All driver API calls (auth, profile, deliveries, actions)
├── docs/
│   ├── DRIVER_API_SCAN.md     # Existing API usage report
│   └── DRIVER_CODE_SCAN.md    # This file
└── drivercomponent/
    ├── Auth/
    │   ├── Login.jsx          # Phone login → OTP
    │   └── Otp.jsx             # OTP verify → dashboard
    ├── common/
    │   ├── bottomlayout.jsx   # Layout with Outlet + BottomNavbar
    │   └── bottomnavbar.jsx   # Nav: Home, Orders, Profile
    ├── dashboard/
    │   ├── home.jsx           # Main dashboard: toggle, deliveries list, exchange tab
    │   └── Exchangeorder.jsx  # Exchange orders tab (mostly static)
    ├── Home/
    │   ├── AssignmentDetails.jsx  # Single assignment: items, address, accept/reject/pickup/out/delivered
    │   ├── orderdetails.jsx      # Static order details (dummy)
    │   ├── Exchangeorderdetails.jsx  # Static exchange order details
    │   └── Replacement.jsx        # Static replacement item UI
    ├── order/
    │   ├── orderHistory.jsx       # Static order history list
    │   ├── exchangeorderhistory.jsx  # Static exchange history + tabs
    │   ├── Deliveredorderhstory.jsx   # Static delivered order detail
    │   └── Details.jsx              # Static pickup + replacement item detail
    ├── Payment/
    │   ├── Payment.jsx   # Static: choose Online / Cash
    │   ├── Cash.jsx      # Static: cash collected
    │   └── Online.jsx    # Static: UPI QR (qrcode.react)
    ├── Profile/
    │   ├── Profile.jsx     # Static profile card
    │   └── editprofile.jsx # Static edit profile form
    └── Reasons/
        └── reason.jsx     # “Reason for not delivered” – local state + success modal, no API
```

**Routes** (`src/routes/driverroutes.jsx`):

- **Public:** `/driver/login`, `/driver/verify-otp`
- **Protected (DRIVER):** Under `BottomNavLayout`: dashboard, assignment/:id, exchange-orders, order-history, deliver-history, profile; standalone: orderdetails, exchange-orderdetails, replacement, reasons, payment, cash, online, exchangeorderdetails

---

## 2. API Layer – `apis/driverApi.js`

| Method / Export        | HTTP | Endpoint | Purpose |
|------------------------|------|----------|---------|
| driverLogin            | POST | /delivery-agent/login | Send OTP (countryCode, phoneNumber) |
| driverVerifyOtp        | POST | /delivery-agent/verify-otp | Verify OTP (userId, otp) → token |
| driverResendOtp        | POST | /delivery-agent/resend-otp | Resend OTP (userId) |
| driverLogout           | POST | /delivery-agent/logout | Logout (auth) |
| driverGetProfile       | GET  | /delivery-agent/getProfile | Get profile (auth) |
| driverToggleOnline     | PATCH| /delivery-agent/toggle-online | { isOnline } |
| getMyDeliveries        | GET  | /delivery-agent/deliveries | My assignments with order/items |
| acceptDelivery(id)     | POST | .../deliveries/:id/accept | Accept assignment |
| rejectDelivery(id)     | POST | .../deliveries/:id/reject | Reject assignment |
| markPickup(id)         | POST | .../deliveries/:id/pickup | Mark picked up |
| markOutForDelivery(id) | POST | .../deliveries/:id/out-for-delivery | Out for delivery |
| markDelivered(id)      | POST | .../deliveries/:id/delivered | Mark delivered |

- Uses shared `apiConnector`; token from `localStorage` ("token").
- No driver-specific base URL override; same backend as admin.

---

## 3. Components – API vs Static

### 3.1 Use real API

| Component | APIs used | Notes |
|-----------|-----------|--------|
| **Auth/Login.jsx** | driverLogin | Phone → userId in sessionStorage → navigate to verify-otp. Error handling for 429. |
| **Auth/Otp.jsx** | driverVerifyOtp, driverResendOtp | 6-digit OTP, resend cooldown 45s. Saves token, navigates to dashboard. |
| **dashboard/home.jsx** | getMyDeliveries, driverToggleOnline | Toggle “Accepting Pick-ups”. Lists deliveries; click → `/driver/assignment/:id`. Empty state shows dummy cards (navigate to `/driver/orderdetails`). |
| **Home/AssignmentDetails.jsx** | getMyDeliveries, acceptDelivery, rejectDelivery, markPickup, markOutForDelivery, markDelivered | Loads assignment by id from list. Accept/Reject, Mark Pickup, Out for Delivery, Mark Delivered. Shows items, address, amount, payment mode, “Get Direction” link. |

### 3.2 Static / mock (no driver API)

| Component | Purpose | Data |
|-----------|---------|------|
| **common/bottomlayout.jsx** | Wraps outlet + bottom nav | — |
| **common/bottomnavbar.jsx** | Links: Home, Orders, Profile | — |
| **dashboard/Exchangeorder.jsx** | Exchange orders tab | Dummy list; “Orders” navigates to dashboard |
| **Home/orderdetails.jsx** | Order details screen | Hardcoded product, address, COD; buttons to exchange-orderdetails / replacement |
| **Home/Exchangeorderdetails.jsx** | Exchange order details | Hardcoded “PICKUP ITEM”, address; Item delivered / not delivered (reasons) |
| **Home/Replacement.jsx** | Replacement item screen | Same as Exchangeorderdetails; title “REPLACEMENT ITEM” |
| **order/orderHistory.jsx** | Order history list | Dummy list; “Exchange Orders” → exchangeorderdetails |
| **order/exchangeorderhistory.jsx** | Order history with Orders/Exchange tabs | Dummy list; click → deliveryhistory |
| **order/Deliveredorderhstory.jsx** | Delivered order detail | Hardcoded product, “DELIVERED TO”, amount (COD) |
| **order/Details.jsx** | Pickup + replacement item detail | Hardcoded two items, “DELIVERED TO” |
| **Payment/Payment.jsx** | Select payment mode | Online / Cash buttons, no navigation or API |
| **Payment/Cash.jsx** | Cash payment screen | Hardcoded product, “CASH COLLECTED” button |
| **Payment/Online.jsx** | Online payment (UPI) | Hardcoded amount, UPI link, QR via qrcode.react |
| **Profile/Profile.jsx** | Profile view | Static “Ace Smith”, Edit Profile button (no route) |
| **Profile/editprofile.jsx** | Edit profile form | Static layout, empty fields; not in routes |
| **Reasons/reason.jsx** | Reason for not delivered | Local state; list of reasons; submit → success modal only (no API) |

---

## 4. Response handling

- **Login:** `data?.data ?? data`, `userId` from payload or nested paths.
- **Otp:** `data?.data ?? data`, `accessToken` for token.
- **Deliveries:** `res?.data ?? res ?? []` treated as array.
- **AssignmentDetails:** Finds assignment by `String(a._id) === String(assignmentId)`; after actions re-fetches list and re-finds assignment.

Consistent with backend returning `{ success, message, data }` or unwrapped payloads.

---

## 5. Routing and protection

- **driverroutes.jsx:** Login and verify-otp are public; all other driver paths under `ProtectedRoute` with `allowedRoles={["DRIVER"]}`.
- **BottomNavLayout** wraps: dashboard, assignment/:assignmentId, exchange-orders, order-history, deliver-history, deliveryhistory, details, profile.
- Standalone (no bottom nav): orderdetails, exchange-orderdetails, replacement, reasons, payment, cash, online, exchangeorderdetails.
- Index and unknown paths redirect to `/driver/login`.

---

## 6. Minor issues (non-blocking)

| File | Issue |
|------|--------|
| **Home/orderdetails.jsx** | Button label typo: “ITEM NOT PICKEDss” → “ITEM NOT PICKED” |
| **Payment/Online.jsx** | Header typo: “ONLINE PAYMENTsss” → “ONLINE PAYMENT” |
| **driverroutes.jsx** | “Order/orderHistory.jsx” vs “order/orderHistory.jsx” (case): import uses `Order` for orderHistory and `order` for exchangeorderhistory/Deliveredorderhstory/Details – verify filesystem case. |

---

## 7. Gaps / optional improvements

1. **Profile:** Not wired to `driverGetProfile`; name/phone/email could be loaded and shown in Profile.jsx and editprofile.jsx.
2. **Logout:** `driverLogout` is not used; add Logout in Profile (or nav) that calls API, clears token/sessionStorage, redirects to `/driver/login`.
3. **Dashboard “Accepting” state:** Toggle state is local only; on load it could be synced from backend (e.g. profile or a status endpoint) so refresh reflects server state.
4. **Order / delivery history:** orderHistory, exchangeorderhistory, Deliveredorderhstory are static; could be backed by “my delivered assignments” or similar API if backend exposes it.
5. **Reasons:** reason.jsx does not call any API; if backend has “delivery failure reason” or similar, submit could be wired there.
6. **Payment (Cash/Online):** Screens are static; if driver is expected to record COD/UPI collection on mark delivered, these could be shown after “Mark Delivered” or in assignment flow and then call an API.
7. **Edit profile:** editprofile.jsx is not in routes; add route and optionally wire to driver profile update if backend supports it.

---

## 8. Verdict

- **API module:** Complete and aligned with backend; all assignment lifecycle and auth endpoints covered.
- **Auth flow:** Login and OTP correctly drive token and navigation.
- **Dashboard:** Uses getMyDeliveries and driverToggleOnline; empty state uses dummy data.
- **Assignment details:** Full flow (accept, reject, pickup, out for delivery, delivered) with correct API usage and id handling.
- **Rest of driver UI:** Static or mock; suitable for placeholders. Profile, history, payment, and reasons can be wired to backend when endpoints or product requirements are ready.
