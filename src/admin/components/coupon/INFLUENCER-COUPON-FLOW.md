# Influencer Coupon Flow (Admin)

## Overview

- **Regular coupons** (`isInfluencer: false`): Created and managed under **Coupons**.
- **Influencer coupons** (`isInfluencer: true`): Regular coupons that are **attached** to an influencer; they stay the same coupon but get `influencerId` and `isInfluencer: true`.

---

## 1. Regular coupons (admin/coupons)

| Screen | File | What it does |
|--------|------|----------------|
| List | `coupon/coupon.jsx` | Lists only **non-influencer** coupons (`isInfluencer: false`). Uses `getCoupons()` → backend returns only these. |
| Create/Edit | `coupon/couponform.jsx` | Create or edit a coupon. New coupons have `isInfluencer: false` by default. |
| Analytics | `coupon/CouponAnayltics.jsx` | Admin coupon analytics. |

**API:** `Couponapi.getCoupons(page, limit, search)` → `GET /coupons/getAll` (backend filters `isInfluencer: false` by default).

---

## 2. Influencer coupon management (admin/influencer)

| Screen | File | What it does |
|--------|------|----------------|
| Influencer list | `influencer/influencer.jsx` | List all influencers (edit, toggle status). **Manage coupons** goes to coupon management for that influencer. |
| Influencer coupon list | `influencer/influencercoupon.jsx` | List influencers with coupon count; click row → **Coupon Management** for that influencer. Route: `/admin/influencer/coupons`. |
| Coupon management (per influencer) | `influencer/influencercouponmanagement.jsx` | For one influencer: **Attached coupons**, **Attach new** (from non-influencer coupons), **Detach**, **Usage history**. Route: `/admin/influencer/:id/coupons`. |

**Flow:**

1. Go to **Influencer Coupon Management** (sidebar: e.g. “Influencer Coupons”) → `influencercoupon.jsx`.
2. Click an influencer row → navigate to `/admin/influencer/:id/coupons` → `influencercouponmanagement.jsx`.
3. **Attached coupons**: Fetched via `getInfluencerCoupons(influencerId)` → `GET /admin/panels/influencer/coupon/all/:influencerId` (backend returns coupons where `influencerId` = that influencer).
4. **Attach new**: “Attach Coupon” opens a list from `getCoupons(1, 300, '')` → only **non-influencer** coupons (backend default). Admin picks one → `attachCouponToInfluencer(couponId, influencerId)` → backend sets `influencerId` and `isInfluencer: true` on that coupon.
5. **Detach**: `detachCouponFromInfluencer(couponId, influencerId)` → backend sets `influencerId: null` and `isInfluencer: false`; coupon goes back to the regular (non-influencer) pool.
6. **Usage history**: `getInfluencerCouponHistory(influencerId)`; analytics via `getInfluencerAnalytics(influencerId)`.

**APIs:** `influrncerCouponapi.js` — attach, detach, getInfluencerCoupons, getInfluencerCouponHistory, getInfluencerAnalytics.

---

## 3. Backend behaviour (summary)

- **GET /coupons/getAll**  
  Returns only coupons with `isInfluencer: false` unless `?isInfluencer=true` is sent.
- **Attach**  
  Updates coupon: `influencerId = <id>`, `isInfluencer = true`.
- **Detach**  
  Updates coupon: `influencerId = null`, `isInfluencer = false`.

So: **Coupons** = only non-influencer; **Influencer Coupon Management** = attach (non-influencer → influencer) / detach (influencer → non-influencer) and view history/analytics.
