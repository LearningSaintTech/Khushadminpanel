# Driver App – Phased Implementation Plan

This plan wires the **Khush-admin driver UI** to the **KhushBackend delivery-agent APIs** without removing any existing screens or flows. Add features only; keep all current driver UI (Orders, Exchange Orders, Order details, Payment, History, Profile, etc.). **New screens can be added where they improve the flow.**

**Demo users:**
- **Customer (more orders):** `9829699382` (+91)
- **Driver:** `9000000005` (+91)

---

## Principles

1. **No existing UI removed** – Add API-backed features alongside or behind existing screens; keep all current driver screens and flows.
2. **New screens allowed** – Add new screens if needed (e.g. dedicated “My Deliveries” list, assignment detail screen, delivered-history-only screen) instead of squeezing everything into current pages.
3. **Backend APIs added only where needed** – Use existing delivery-agent endpoints first; add new ones only for gaps (e.g. delivered history, profile).
4. **Phases are incremental** – Each phase is testable on its own; later phases build on earlier ones.
5. **Demo data** – Seed script ensures user `9829699382` has orders and driver `9000000005` has assignments so you can see real data in the driver app.

---

## New screens (optional)

You can add new screens where they help; existing ones stay.

| Screen | Route (example) | Purpose |
|--------|------------------|---------|
| **My Deliveries** | `/driver/my-deliveries` | List of current assignments from API (alternative to putting list on dashboard Orders tab). |
| **Assignment Details** | `/driver/assignment/:assignmentId` | Full assignment view + Accept/Reject/Pickup/Out for delivery/Delivered (alternative to reusing orderdetails with query/state). |
| **Delivered History** | `/driver/delivered` | List of only DELIVERED assignments (when backend supports history or `?include=DELIVERED`). |

Add routes in `driverroutes.jsx` and link from dashboard/bottom nav as needed. Existing Order details, Order history, Deliver history, Payment, Replacement, Reasons, Profile stay as-is.

---

## Phase 0: Demo Data (Backend Seed)

**Goal:** So that the driver app can show real data, ensure:
- Customer **9829699382** exists with at least one address.
- Driver **9000000005** exists and is active.
- Several **CONFIRMED** orders exist for 9829699382.
- **OrderAssignments** exist for driver 9000000005 (mix of ASSIGNED, ACCEPTED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED).

**Where:** KhushBackend  
**What:**
- Run main seed if needed: `node scripts/seed.js` (already creates driver 9000000005 in Phase 5).
- Run **demo driver seed**: `node scripts/seed-demo-driver.js` (see below).
  - Ensures User `9829699382` + one Address.
  - Ensures DeliveryAgent `9000000005` (create if missing).
  - Creates e.g. 6–8 CONFIRMED orders for user 9829699382 (with valid items, address, pricing).
  - Creates OrderAssignment records for driver 9000000005:
    - 2× ASSIGNED (driver can Accept/Reject),
    - 1× ACCEPTED (driver can Mark Pickup),
    - 1× PICKED_UP (driver can Mark Out for Delivery),
    - 1× OUT_FOR_DELIVERY (driver can Mark Delivered),
    - 2× DELIVERED (for “history” once we add that API or filter).

**Deliverable:** After running seed + seed-demo-driver, driver login with 9000000005 and “Get My Deliveries” should return real assignments; customer 9829699382 has multiple orders in the system.

---

## Phase 1: Backend – Gaps Only (If Any)

**Goal:** Add only APIs that are missing for the driver flow.

**Existing backend (use as-is):**
- `POST /api/delivery-agent/login`, verify-otp, logout, refresh, getProfile (if exists).
- `PATCH /api/delivery-agent/toggle-online`.
- `GET /api/delivery-agent/deliveries` (active assignments only: excludes DELIVERED/REJECTED/CANCELLED).
- `POST /api/delivery-agent/deliveries/:assignmentId/accept`, reject, pickup, out-for-delivery, delivered.

**Optional additions (only if needed):**
- **Delivered history:** Either extend `GET /deliveries` with query `?include=DELIVERED` or add `GET /delivery-agent/deliveries/history` returning assignments with status DELIVERED (paginated). Implement in a later phase when driver “Deliver history” screen is wired.
- **Driver profile:** If not already present, ensure `GET /api/delivery-agent/profile` (or same in getProfile) returns name, phone, etc.

**Deliverable:** List of any new endpoints added; Postman/collection updated.

---

## Phase 2: Driver API Module (Khush-admin)

**Goal:** Single place for all driver-facing API calls; no UI changes.

**Where:** Khush-admin `src/driver/apis/` (or `src/admin/apis/` with a driver-specific file).

**What:**
- New file e.g. `driverDeliveryApi.js` (or `deliveryAgentApi.js`) using existing `apiConnector` and same base URL as admin.
- Endpoints (paths under same base as backend, e.g. `/api/delivery-agent/...`):
  - `login(phoneNumber, countryCode)`
  - `verifyOtp(userId, otp)` 
  - `getProfile()`, `logout()`, `toggleOnline(isOnline)`
  - `getMyDeliveries()`
  - `acceptDelivery(assignmentId)`, `rejectDelivery(assignmentId)`
  - `markPickup(assignmentId)`, `markOutForDelivery(assignmentId)`, `markDelivered(assignmentId)`
- Use `localStorage.getItem("token")` (same key as rest of app); backend expects Bearer token and role `driver`.

**Deliverable:** All driver API functions implemented and callable from driver components; no screens changed yet.

---

## Phase 3: Driver Auth (Login + OTP + Protection)

**Goal:** Driver can log in with 9000000005, get token, and protected routes redirect to login when not authenticated.

**Rules:** Do not remove existing Login/OTP UI; add API calls and token handling alongside.

**Where:**  
- `src/driver/drivercomponent/Auth/Login.jsx`  
- `src/driver/drivercomponent/Auth/Otp.jsx`  
- `src/routes/driverroutes.jsx`

**What:**
- **Login:** On “Continue”, call driver login API with phone (e.g. 9000000005) and countryCode +91; store returned `userId` (or equivalent) in state/sessionStorage for OTP step; navigate to verify-otp.
- **OTP:** On “Verify OTP”, call verify-otp API with userId + otp; on success store access token (e.g. in `localStorage.setItem("token", data.accessToken)`); then navigate to dashboard.
- **Protected routes:** Wrap all driver routes that require auth (dashboard, orderdetails, order-history, profile, etc.) in `ProtectedRoute` with `allowedRoles={['DRIVER']}`. Leave login and verify-otp outside so unauthenticated users can open them.
- Keep “Remember me” and “Resend OTP” UI; optionally wire Resend to backend resend-otp if available.

**Deliverable:** Driver can log in with 9000000005, receive token, and reach dashboard; visiting dashboard without token redirects to /driver/login.

---

## Phase 4: Dashboard – My Deliveries + Toggle Online

**Goal:** Driver sees real assignments from API; “Accepting Pick-ups” toggle updates backend. No removal of existing tabs or cards.

**Where:** `src/driver/drivercomponent/dashboard/home.jsx` (and optionally a new screen).

**What:**
- On load, call `getMyDeliveries()` and store result in state.
- **Option A (augment existing):** In the current **Orders** tab, prefer rendering the API list (assignment cards with order ref, address snippet, amount to collect, payment mode, status). If list is empty, keep existing dummy list or show “No new orders.” **Exchange Orders** tab stays as-is.
- **Option B (new screen):** Add a dedicated **“My Deliveries”** screen (e.g. `/driver/my-deliveries`) that shows only API-driven assignments; link to it from the dashboard (e.g. a tab or button “My Deliveries”). Keep the current Orders/Exchange Orders tabs and content unchanged.
- **Toggle “Accepting Pick-ups”:** Call `toggleOnline(isOnline)` when user flips the switch; keep local state in sync with API.
- **Card click:** Navigate to order/assignment details with `assignmentId` (e.g. `/driver/orderdetails/:assignmentId` or a new `/driver/assignment/:assignmentId` screen).

**Deliverable:** Dashboard (or new My Deliveries screen) shows real “My deliveries” for driver 9000000005; toggle reflects on backend; clicking a card goes to details (Phase 5).

---

## Phase 5: Order/Assignment Details – Real Assignment + Actions

**Goal:** Driver sees real assignment (address, items, amount to collect, payment mode) and can perform Accept / Reject / Mark Pickup / Out for Delivery / Mark Delivered. Existing order-details and payment/replacement/reasons flows stay.

**Where:**  
- `src/driver/drivercomponent/Home/orderdetails.jsx` (augment with assignmentId), **or**
- New screen e.g. `src/driver/drivercomponent/Home/AssignmentDetails.jsx` and route `/driver/assignment/:assignmentId`.

**What:**
- Receive `assignmentId` from route params or location state.
- Fetch assignment details from `getMyDeliveries()` (in memory) or from a single-assignment API if added; show address, items, amount to collect, payment mode (COD/Online).
- **Buttons (additive):**
  - If status ASSIGNED: show “Accept” and “Reject”; on Accept/Reject call API then redirect or refresh.
  - If status ACCEPTED (or ASSIGNED): show “Mark Pickup”.
  - If status PICKED_UP: show “Mark Out for Delivery”.
  - If status OUT_FOR_DELIVERY: show “Mark Delivered”.
- **Option A:** Reuse existing `orderdetails.jsx` and pass assignmentId (e.g. `/driver/orderdetails?assignmentId=...` or state); show assignment data when assignmentId is present, else keep current static/dummy content.
- **Option B:** Add a new **Assignment Details** screen used only for delivery flow; keep current Order details screen for existing “Item Picked” / “Item Not Picked” / “Get Direction” / Payment / Replacement / Reasons flows unchanged.

**Deliverable:** Driver can open an assignment from dashboard and perform all status actions; existing order details and payment/replacement/reasons screens remain.

---

## Phase 6: Order History & Deliver History

**Goal:** Show real data where possible; do not remove current screens. New screens allowed.

**Where:**  
- `src/driver/drivercomponent/order/orderHistory.jsx`  
- `src/driver/drivercomponent/order/Deliveredorderhstory.jsx`  
- Optionally a new **Delivered History** screen (e.g. `/driver/delivered`) that only shows DELIVERED assignments from API.

**What:**
- **Order history:** If backend exposes “my assignments” including past/delivered, use that here; otherwise keep current list and add a note that “Real history will appear once backend supports it.” Optional: reuse `getMyDeliveries()` and filter by status DELIVERED if backend adds `?include=DELIVERED` or a history endpoint (see Phase 1).
- **Deliver history:** When backend returns delivered assignments, show them (in existing screen or in a new “Delivered” screen); else keep existing UI and add a short message.
- **Optional new screen:** Add a dedicated “Delivered” list screen that calls deliveries/history (or `getMyDeliveries` with `?include=DELIVERED`) and only shows completed deliveries; link from bottom nav or from Order history.
- No removal of existing cards or layout.

**Deliverable:** History screens show API-driven delivered list when available; optionally a new Delivered-only screen; otherwise unchanged with a small “demo” or “coming soon” note.

---

## Phase 7: Profile (Optional)

**Goal:** Profile screen shows driver name/phone from backend if API exists.

**Where:** `src/driver/drivercomponent/Profile/Profile.jsx`

**What:**
- On load, call driver getProfile (or equivalent); if success, show name and phone; keep existing layout and “Edit profile” button.
- If no profile API, leave screen as-is (static “Ace Smith” or placeholder).

**Deliverable:** Profile shows real driver data when API is available.

---

## Phase Summary Table

| Phase | Focus | Backend | Frontend | Demo data |
|-------|--------|---------|----------|-----------|
| 0 | Demo data | Seed + seed-demo-driver | – | User 9829699382, driver 9000000005, orders + assignments |
| 1 | API gaps | Optional: history/profile | – | – |
| 2 | Driver API module | – | New driver API file | – |
| 3 | Auth | – | Login/OTP + ProtectedRoute | – |
| 4 | Dashboard | – | getMyDeliveries + toggle online | Uses Phase 0 |
| 5 | Order details | – | Assignment + action buttons | Uses Phase 0 |
| 6 | History | Optional history API | Show delivered list | Uses Phase 0 |
| 7 | Profile | Optional profile | Show name/phone | – |

---

## Running Demo Data (Phase 0)

1. **Backend:** Ensure MongoDB is running and `.env` has correct `MONGODB_URI`.
2. **Main seed (if DB is empty):**  
   `cd KhushBackend && node scripts/seed.js`
3. **Demo driver seed:**  
   `cd KhushBackend && node scripts/seed-demo-driver.js`  
   This ensures:
   - User **9829699382** and one address.
   - Driver **9000000005** (Seed Driver).
   - Several CONFIRMED orders for 9829699382.
   - OrderAssignments for 9000000005 in multiple statuses.
4. **Driver app:** Login with **+91** and **9000000005**; after OTP you should see real assignments on the dashboard (once Phase 4 is done).  
5. **Customer app (khushWeb):** Use **9829699382** to see that user’s orders (e.g. order history).

---

## File Reference

- **Backend:**  
  - Seed: `KhushBackend/scripts/seed.js`  
  - Demo driver seed: `KhushBackend/scripts/seed-demo-driver.js`  
  - Delivery agent: `KhushBackend/src/modules/deliveryAgent/`  
  - Order assignment: `KhushBackend/src/modules/orderAssignment/`
- **Driver app:**  
  - Routes: `Khush-admin/src/routes/driverroutes.jsx`  
  - Dashboard: `Khush-admin/src/driver/drivercomponent/dashboard/home.jsx`  
  - Order details: `Khush-admin/src/driver/drivercomponent/Home/orderdetails.jsx`  
  - Auth: `Khush-admin/src/driver/drivercomponent/Auth/Login.jsx`, `Otp.jsx`  
  - Scan: `Khush-admin/docs/DRIVER_FLOW_SCAN.md`
