# Khush Admin — Feature Test Guide

**Audience:** Fellow developers / QA  
**Date:** 24 Sep 2026  
**Scope:** Support Room, Refunds (approval flow), Module Access, iOS static OTP, WhatsApp Meta template edit & review

---

## 0. Before you start

### Services to restart / run
| Service | Why |
|---------|-----|
| `auth-service` | iOS static OTP + module access catalog (`support-room`, `refunds`) |
| `backend-service` | Support APIs, refunds APIs, WhatsApp resubmit |
| `api-gateway` | Routes `/api/admin/support`, `/api/admin/refunds` |
| `Khushadminpanel` (Vite) | New pages / UI |

### Roles
| Role | Access |
|------|--------|
| **admin** | Full access (no module filter) |
| **subadmin / super_subadmin** | Only modules granted in Module Access |

### Module keys (assign under Module Access → Orders group)
| Key | UI | APIs |
|-----|----|------|
| `order` | Orders list / exchange / return / stale | `/api/admin/orders` |
| `support-room` | Orders → Support Room | `/api/admin/support` |
| `refunds` | Orders → Refunds | `/api/admin/refunds` |

**Tip:** Support Room search needs **Orders** (view is enough) + **Support Room** (full to submit actions). Refund approve needs **Refunds** (full).

---

## 1. Navigation map

```
Admin sidebar
└── Orders (dropdown)
    ├── Orders              → /admin/orders          [module: order]
    ├── Support Room        → /admin/orders/support  [module: support-room]
    ├── Refunds             → /admin/orders/refunds  [module: refunds]
    ├── Exchange orders     → /admin/exchange-orders [module: order]
    ├── Return orders       → /admin/return-orders   [module: order]
    └── Stale orders        → /admin/orders/stale    [module: order]

Notifications
└── WhatsApp templates      → /admin/notifications/whatsapp-templates
```

Subadmin paths use `/subadmin/...` instead of `/admin/...`.

---

## 2. Support Room — purpose & flow

### Purpose
Ops/support opens a customer order case and runs actions (address, cancel, status, return, exchange, sync tracking, **refund request**) with a mandatory reason and audit log.

### How to open
1. Sidebar → **Orders** → **Support Room**
2. Search box: order ID, phone, or name → **Search**
3. If multiple matches → click a row  
4. If one match / exact order ID → case opens automatically  
5. **Recent cases** chips reopen last opened orders (localStorage)

### Case workspace layout
| Area | What it does |
|------|----------------|
| Header | Order ID (copy), status, customer, payment mode |
| Left | Issue picker (Address, Cancel, Status, Return, Exchange, Sync, **Send refund request**) |
| Center | Action form for selected issue |
| Right / bottom | Support action history (audit) |

### Issue actions (buttons & purpose)

| Issue | Main buttons | Purpose | Result |
|-------|--------------|---------|--------|
| Wrong address / phone | **Save** | Patch shipping contact/address | Logged as address change |
| Cancel after processing | Select lines + policy reason + support reason → **Submit** | Cancel lines on behalf | Uses cancel-order policy |
| Status incorrectly set | Pick line + new status + reason → **Submit** | Correct bad status | Logged |
| Create return | **Requested** = create only; **Schedule** = create + approve + carrier pickup | Return on behalf | Same carrier flow as Orders |
| Create / fix exchange | Same Requested / Schedule pattern | Exchange on behalf | Same as Orders exchange |
| Sync courier tracking | **Sync** | Pull Delhivery / Shadowfax | Shiprocket = phase 2 note |
| **Send refund request** | Amount, destination, reason → **Send refund request** | Queue refund for approval | Does **not** pay money yet |

### Refund request destinations (in Support form)
| Destination | Meaning |
|-------------|---------|
| **AUTO** | Detect: Razorpay prepaid → RAZORPAY; else WALLET; Nimble → OTHER |
| **RAZORPAY** | Must have successful Razorpay `paymentId` |
| **WALLET** | Credit Khush Wallet (after approval) |
| **OTHER** | External payout; after approval → Mark done on Refunds tab |

### Expected toast after Send refund request
> “Refund request sent — approve it on Orders → Refunds to pay out”

Status in DB: **REQUESTED** (pending approval).

### Pass criteria — Support Room
- [ ] Search finds order by ID / phone / name  
- [ ] Case opens with lines, AWBs, payment info  
- [ ] Each issue form requires a support reason  
- [ ] Action appears in support history  
- [ ] Refund request appears on **Refunds** tab as REQUESTED  
- [ ] View-only `support-room` cannot submit actions  
- [ ] Without `order` module, search is blocked with clear message  

---

## 3. Refunds tab — purpose & flow

### Purpose
Central queue for all support/admin refund requests. **Money moves only after Approve** (or Mark done for Other).

### How to open
Sidebar → **Orders** → **Refunds**

### Screen elements
| Control | Purpose |
|---------|---------|
| **Refresh** | Reload list |
| Filters: Order ID / Status / Destination + **Search** | Narrow list |
| Counters | Pending / Done / Manual / Failed (current page) |
| Table columns | Created, Order, Amount, Channel, Status, Reason, Refs, Actions |

### Status meanings
| Status | Meaning |
|--------|---------|
| **REQUESTED** | Waiting for Approve |
| **PROCESSING** | Payout in progress |
| **COMPLETED** | Paid (Razorpay / Wallet / marked Other) |
| **FAILED** | Approve tried; API/wallet failed — use Re-approve / Retry |
| **NEEDS_MANUAL** | Approved as Other — ops must pay outside, then Mark done |
| **CANCELLED** | Cancelled (if used) |

### Channel meanings
| Channel | After Approve |
|---------|---------------|
| **RAZORPAY** | Calls Razorpay refund API → `rfnd_…` in Refs |
| **WALLET** | Credits customer cash wallet |
| **OTHER** | No auto pay → NEEDS_MANUAL → **Mark done** |

### Action buttons
| Button | When shown | What happens |
|--------|------------|--------------|
| **Approve** | REQUESTED | Confirm → Razorpay/Wallet process, or OTHER → NEEDS_MANUAL |
| **Re-approve** | FAILED | Retry approve + process |
| **Retry** | FAILED + Razorpay/Wallet | Process again |
| **Mark done** | OTHER + NEEDS_MANUAL | Prompt for note → COMPLETED |

### End-to-end test script (happy paths)

#### A) Razorpay auto refund
1. Open a **prepaid SUCCESS Razorpay** order in Support Room  
2. Issue → Send refund request → amount small (e.g. ₹1–3) → destination AUTO or RAZORPAY → reason → Send  
3. Go to **Refunds** → row status **REQUESTED**, channel **RAZORPAY**  
4. Click **Approve** → confirm  
5. Expect **COMPLETED**, Refs show `rz: rfnd_…` and `pay: pay_…`  

#### B) Wallet auto refund
1. Use **COD** (or non-Razorpay) order  
2. Send refund → AUTO/WALLET  
3. Approve on Refunds  
4. Expect **COMPLETED**, channel **WALLET**, wallet tx id in Refs  
5. Optionally verify customer wallet transactions (`transaction_source: REFUND`)  

#### C) Other source (manual)
1. Send refund with destination **OTHER**  
2. Approve → status **NEEDS_MANUAL**  
3. Ops pays outside (UPI/bank)  
4. **Mark done** + optional note → **COMPLETED**  

### Pass criteria — Refunds
- [ ] Support request always lands as REQUESTED (no instant payout)  
- [ ] Approve is required before Razorpay/Wallet call  
- [ ] Failed rows can be re-tried  
- [ ] View-only `refunds` cannot Approve / Mark done  
- [ ] Subadmin without `refunds` gets Access denied on `/orders/refunds`  

---

## 4. Module Access — how to grant & test

### Where
Admin → Module Access (role: subadmin / super_subadmin) **or** per-user module override if your panel supports it.

### Grant checklist for a “Support agent”
- [ ] `order` — **view** (search/open orders)  
- [ ] `support-room` — **full** (submit actions + refund request)  
- [ ] `refunds` — **full** if they should approve payouts; **view** if only browse  

### Grant checklist for “Refunds ops only”
- [ ] `refunds` — **full**  
- [ ] (optional) `order` — view, to jump to order from table link  

### UI checks after grant
- [ ] Sidebar shows only allowed Orders children  
- [ ] Direct URL without module → Access denied  
- [ ] View-only shows gold banner; mutating buttons disabled / blocked  

---

## 5. iOS static OTP (App Store review login)

### Purpose
Apple reviewers log in without SMS using a fixed phone + OTP.

### Credentials (from auth-service `.env` / defaults)
| Field | Value |
|-------|--------|
| Phone | `9988776655` (or `APPLE_REVIEW_PHONE`) |
| OTP | `567894` (or `APPLE_REVIEW_OTP`) |
| Flag | `APPLE_REVIEW_OTP_ENABLED=true` |

### Flow
1. App / web login with phone **9988776655** (+91 ok)  
2. Request OTP → API returns success **without SMS**  
3. Enter OTP **567894** → login succeeds  
4. User auto-created as “Apple Review” if missing  

### Pass criteria
- [ ] Works with `9988776655`, `+919988776655`, spaced formats  
- [ ] Wrong OTP fails  
- [ ] Other phones still use real 2Factor SMS  
- [ ] Restart auth-service after env change  

---

## 6. WhatsApp Meta templates — edit & send for review

### Purpose
Configure template mapping **and** edit Meta body/header/footer/buttons, then **resubmit to Meta** for approval.

### How to open
Notifications → **WhatsApp templates**

### Create new (already worked)
1. **Create template** → fill name, category, body (`{{1}}` vars), header/footer/buttons  
2. **Submit to Meta** → status **PENDING**  

### Configure existing (fixed)
1. Row → configure (gear / Configure)  
2. If status **REJECTED / PAUSED / DISABLED / APPROVED**:  
   - Meta fields are **editable**  
   - Amber hint explains review flow  
3. Buttons:  
   - **Save configuration** — local mapping only (module, events, variable keys)  
   - **Save & send for review** — POST edit to Meta → status **PENDING**  
4. If status **PENDING**: Meta content locked; mapping still editable  

### Pass criteria
- [ ] Rejected template: can edit body and click **Save & send for review**  
- [ ] Success toast: sent for review / PENDING  
- [ ] Sync from Meta updates status after Meta decides  
- [ ] PENDING cannot edit Meta body (by design)  

---

## 7. API cheat sheet (for Postman / debugging)

Base via gateway: `/api/...` with admin JWT.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/support/orders/:orderId/actions` | Support history |
| POST | `/admin/support/orders/:orderId/refunds` | Create refund request (queued) |
| GET | `/admin/refunds?status=&orderId=` | List refund requests |
| POST | `/admin/refunds/:id/approve` | Approve → process |
| POST | `/admin/refunds/:id/process` | Retry process |
| POST | `/admin/refunds/:id/mark-manual-complete` | Other source done |
| POST | `/admin/notification/whatsapp/templates/:id/resubmit` | Meta edit + review |
| POST | `/user/auth/login` then verify OTP | iOS static OTP path |

Exact notification admin prefix may be `/api/admin/notification/...` — match existing Postman collection.

---

## 8. Suggested smoke test order (30–40 min)

1. Admin login → see Support Room + Refunds under Orders  
2. Support Room → open known Razorpay order → send ₹1–3 refund AUTO  
3. Refunds → Approve → COMPLETED + `rfnd_`  
4. Support Room → COD order → wallet refund → Approve → wallet credit  
5. Support Room → OTHER refund → Approve → Mark done  
6. Module Access: subadmin with only `support-room` + `order` view — can request refund, cannot open Refunds approve  
7. Subadmin with `refunds` full — can Approve  
8. Login as Apple Review phone + OTP `567894`  
9. WhatsApp: open REJECTED template → edit → Save & send for review  

---

## 9. Common failures

| Symptom | Likely cause |
|---------|----------------|
| Support APIs 404 | Gateway missing `/api/admin/support` or backend not restarted |
| Refunds list empty / 404 | Gateway missing `/api/admin/refunds` |
| Approve fails Razorpay | No `paymentId`, amount &lt; ₹1, or Razorpay keys / TLS |
| Search blocked | Missing `order` module |
| Cannot Approve | View-only `refunds` or wrong role |
| WhatsApp resubmit error | Missing `metaTemplateId` — Sync from Meta first |
| iOS OTP invalid | Wrong phone digits / OTP / auth-service not restarted |

---

## 10. Change log (what landed)

1. Support Room under Orders + case actions + refund request issue  
2. Refunds tab with **Approve-then-payout** (Razorpay / Wallet / Other)  
3. Module Access keys: `support-room`, `refunds`  
4. iOS static OTP hardening (phone normalize)  
5. WhatsApp Meta: editable configure + **Save & send for review**  
6. UI aligned to shared admin tokens (`PageToolbar`, `border-border`, `brand-600`)  

---

*Internal test handoff — Khush MicroService / Admin Panel*  
*Share this PDF with developers before merge / staging QA.*
