# Driver API & Components – Scan Report

**Scanned:** `src/driver/apis/driverApi.js` and all `src/driver/drivercomponent` usages.

---

## 1. driverApi.js – Status: OK

| API | Endpoint | Used by | Notes |
|-----|----------|---------|--------|
| driverLogin | POST /delivery-agent/login | Login.jsx | OK |
| driverVerifyOtp | POST /delivery-agent/verify-otp | Otp.jsx | OK |
| driverResendOtp | POST /delivery-agent/resend-otp | Otp.jsx | OK |
| driverLogout | POST /delivery-agent/logout | (not used yet) | Available |
| driverGetProfile | GET /delivery-agent/getProfile | (not used yet) | Profile.jsx is static |
| driverToggleOnline | PATCH /delivery-agent/toggle-online | home.jsx (dashboard) | OK |
| getMyDeliveries | GET /delivery-agent/deliveries | home.jsx, AssignmentDetails.jsx | OK |
| acceptDelivery | POST .../deliveries/:id/accept | AssignmentDetails.jsx | OK |
| rejectDelivery | POST .../deliveries/:id/reject | AssignmentDetails.jsx | OK |
| markPickup | POST .../deliveries/:id/pickup | AssignmentDetails.jsx | OK |
| markOutForDelivery | POST .../deliveries/:id/out-for-delivery | AssignmentDetails.jsx | OK |
| markDelivered | POST .../deliveries/:id/delivered | AssignmentDetails.jsx | OK |

All endpoints match the backend. Token is read from `localStorage.getItem("token")` via the shared apiConnector.

---

## 2. Response shape (Backend: `{ success, message, data }`)

| Component | API | How payload is read | Status |
|-----------|-----|---------------------|--------|
| Login.jsx | driverLogin | `payload = data?.data ?? data`, `userId = payload?.userId ?? ...` | OK |
| Otp.jsx | driverVerifyOtp | `payload = data?.data ?? data`, `token = payload?.accessToken ?? ...` | OK |
| Otp.jsx | driverResendOtp | No payload read (only triggers cooldown) | OK |
| home.jsx | getMyDeliveries | `list = res?.data ?? res ?? []` | OK |
| home.jsx | driverToggleOnline | No response used (state updated on success) | OK |
| AssignmentDetails.jsx | getMyDeliveries | `list = res?.data ?? res ?? []` | OK |
| AssignmentDetails.jsx | accept/reject/pickup/... | No response body used (re-fetches list after) | OK |

All call sites handle both `response.data` (wrapped) and direct `response` (unwrapped).

---

## 3. Component-by-component

### Auth/Login.jsx – OK
- Validates 10-digit phone, strips non-digits.
- Calls driverLogin, reads `data.data.userId`, stores string id in sessionStorage, navigates to verify-otp.
- Error handling: 429 / “too many” → friendly message; others → show API message.
- Loading state and disabled button.

### Auth/Otp.jsx – OK
- Gets userId from location.state or sessionStorage.
- 6-digit OTP inputs, paste support, backspace, resend with 45s cooldown.
- driverVerifyOtp: reads `data.data.accessToken`, saves token, navigates to dashboard.
- driverResendOtp: no payload read.
- Renders “session expired” and back to login when userId is missing.

### dashboard/home.jsx – OK
- fetchDeliveries: getMyDeliveries → `res?.data ?? res ?? []`, setDeliveries(array).
- Toggle: driverToggleOnline(next), then setIsAccepting(next); on error state unchanged.
- Orders tab: if deliveries.length > 0, show API cards and navigate to `/driver/assignment/:id`; else show dummy list (navigate to /driver/orderdetails).
- Load more for API list.

### Home/AssignmentDetails.jsx – OK (updated)
- getMyDeliveries, then find assignment by **String(a._id) === String(assignmentId)** (safe for string vs ObjectId).
- runAction: call accept/reject/pickup/out-for-delivery/delivered, then re-fetch list and update assignment.
- Renders address, items, amount, payment mode, Get Direction link, and buttons by status (ASSIGNED → Accept/Reject; then Mark Pickup → Out for Delivery → Mark Delivered).
- Fixed: _id comparison now uses String() so it works even if backend sends ObjectId vs string.

### Profile/Profile.jsx – By design
- Does **not** use driverApi; static “Ace Smith” UI (per Phase 7 optional).

### Other drivercomponent files
- Order details, Exchange, Payment, Replacement, Reasons, Order history, Deliver history, Details: do **not** use driverApi; unchanged existing flows.

---

## 4. Fix applied

- **AssignmentDetails.jsx:** Assignment lookup now uses `String(a._id) === String(assignmentId)` so it works whether the API returns `_id` as string or ObjectId.

---

## 5. Optional improvements (not required)

1. **Dashboard:** Initial “Accepting Pick-ups” could be set from backend (e.g. driverGetProfile or a small “my status” endpoint) so the toggle matches server state on load.
2. **Profile.jsx:** When you want real driver data, call driverGetProfile and use `data?.data ?? data` for name/phone and show it in the existing layout.
3. **Logout:** Add a “Logout” button (e.g. in Profile) that calls driverLogout() and clears token/sessionStorage, then redirects to /driver/login.

---

## 6. Verdict

- **driverApi.js:** Correct and complete for current flows.
- **Login / OTP:** Response handling and navigation are correct.
- **Dashboard:** Correct use of getMyDeliveries and driverToggleOnline; response shape handled.
- **AssignmentDetails:** Correct use of all assignment APIs; _id comparison fixed.
- **Profile:** Intentionally static; no API usage yet.

Everything that uses the driver API is consistent with the backend response shape and works as intended. The only change made was the robust _id comparison in AssignmentDetails.
