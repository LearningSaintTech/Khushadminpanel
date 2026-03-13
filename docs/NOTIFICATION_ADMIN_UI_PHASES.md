# Admin Notification UI – Phased Plan

This document outlines the phased UI/UX enhancement for the admin notification section: bifurbicated navigation, notification icon by logo, and feature-rich pages with search, filters, and analytics.

---

## Navigation structure (dropdown)

**Notifications** becomes a single sidebar dropdown with four main sections:

| # | Item | Route | Description |
|---|------|--------|-------------|
| 1 | **All notifications** | `/admin/notifications` | Notifications **received** by the current admin user. |
| 2 | **All send notifications** | `/admin/notifications/sent` | Notifications **sent** by the system (history: email, SMS, WhatsApp, in-app). |
| 3 | **Templates** | Sub: In-app, Email | Create and manage **in-app** and **email** templates. |
| 4 | **Broadcast** | `/admin/notifications/broadcast` | Send broadcast, view broadcast history, third-party templates. |

Additional under the same section (or under “Send”): **History** (sent/delivery log), **Test** (test email/SMS/WhatsApp).

---

## Notification icon beside Khush logo

- **Placement:** In the sidebar header, beside the Khush logo (e.g. logo left, bell right).
- **Behaviour:** Bell icon with **unread badge** (count). Click opens a **dropdown** with:
  - Recent notifications (existing + new, from NotificationContext).
  - “Mark all read” and “See all” → `/admin/notifications`.
- **Purpose:** At-a-glance view of existing and new notifications without leaving the current page.

---

## Phase 1: Structure + dropdown + icon (foundation)

**Goal:** Bifurcate the notification tab into a dropdown and add the notification icon next to the logo.

| Task | Deliverable |
|------|-------------|
| 1.1 | Sidebar: Replace flat “Notifications”, “Templates”, etc. with a single **Notifications** dropdown (like Inventory). Items: All notifications, All send notifications, Templates (In-app, Email), Broadcast; optionally History, Test. |
| 1.2 | Sidebar header: Add **notification bell icon** beside Khush logo with unread badge. Click opens dropdown with recent notifications (from context), “Mark all read”, “See all”. |
| 1.3 | Route: Add `/admin/notifications/sent` for “All send notifications” (can reuse or wrap History page with a “sent” view). |

**Exit criteria:** User sees one Notifications dropdown in the sidebar and a bell with dropdown next to the logo.

---

## Phase 2: All notifications (received) – search and filters

**Goal:** Enhance the “All notifications” (received) page with search, timestamp, and module-wise filters.

| Task | Deliverable |
|------|-------------|
| 2.1 | **Search:** By title/body (client-side or API query param if backend supports). |
| 2.2 | **Filter by date:** From date, To date (timestamp range). Backend: add optional `from`, `to` to `GET /notification/list` if not present. |
| 2.3 | **Filter by module:** Dropdown (order, auth, broadcast, etc.). Backend: add optional `module` to `GET /notification/list` if not present. |
| 2.4 | UI: Filter bar above the list; clear filters; loading and empty states. |

**Exit criteria:** Admin can search and filter received notifications by text, date range, and module.

---

## Phase 3: All send notifications – search and filters

**Goal:** Dedicated “All send notifications” page with date, channel, and flow-wise filters.

| Task | Deliverable |
|------|-------------|
| 3.1 | Page at `/admin/notifications/sent` (or reuse History with tabs). List sent notifications (from NotificationHistory: email, SMS, WhatsApp). |
| 3.2 | **Filter by date:** From, To. |
| 3.3 | **Filter by channel:** Email, SMS, WhatsApp. |
| 3.4 | **Filter by flow:** e.g. broadcast, order, auth (if backend stores flow/source in history). |
| 3.5 | Search by recipient or template key if backend supports. |

**Exit criteria:** Admin can view and filter all sent notifications by date, channel, and flow.

---

## Phase 4: Templates – unified page, filters, analytics

**Goal:** Single Templates area with In-app and Email tabs, search/filter, and send analytics per template/channel.

| Task | Deliverable |
|------|-------------|
| 4.1 | **Unified Templates page:** Tabs “In-app” and “Email”. Each tab shows list of templates (existing CRUD). |
| 4.2 | **Search/filter:** By key, module (in-app), active status. |
| 4.3 | **Send analytics:** Per template, show how many notifications were sent using that template (by channel if applicable). Backend: optional analytics API (e.g. count by templateKey from NotificationHistory or in-app notifications). |
| 4.4 | UI: Table with columns Key, Subject/Title, Usage count, Last used, Actions. |

**Exit criteria:** Admin sees one Templates page with tabs, can search/filter and see send analytics per template.

---

## Phase 5: Broadcast – history, third-party templates, analytics, send

**Goal:** Broadcast section with history, visibility of third-party templates, send analytics by channel/template, and ability to send (including template selection).

| Task | Deliverable |
|------|-------------|
| 5.1 | **Broadcast history:** List of past broadcasts (title, date, channels, sent count). Backend: store or derive from NotificationHistory/jobs; optional `GET /admin/notification/broadcast-history`. |
| 5.2 | **View third-party templates:** Section or modal listing WhatsApp and SMS template keys (and Content SID if configured) – read-only from env or backend config. |
| 5.3 | **Send analytics:** By channel (in_app, email, whatsapp, sms) and by template key for WhatsApp/SMS. Charts or summary cards. |
| 5.4 | **Send notification:** Existing broadcast form; ensure template selectors for WhatsApp/SMS are clear. |
| 5.5 | **Use templates here:** Show/link to Email and In-app templates so admin can pick template key for broadcast. |
| 5.6 | UI: Tabs or sections “Send broadcast”, “Broadcast history”, “Third-party templates”, “Analytics”. |

**Exit criteria:** Admin can see broadcast history, view third-party templates, see analytics by channel/template, and send broadcast with template selection.

---

## Phase summary

| Phase | Name | Main outcome |
|-------|------|--------------|
| 1 | Structure + dropdown + icon | Single Notifications dropdown; bell with dropdown beside logo. |
| 2 | All notifications (received) | Search, date range, module filters. |
| 3 | All send notifications | Sent list with date, channel, flow filters. |
| 4 | Templates | Unified page (In-app | Email), search, send analytics. |
| 5 | Broadcast | History, third-party templates view, analytics, send with templates. |

---

## Implementation order

Implement in order: **Phase 1** → **Phase 2** → **Phase 3** → **Phase 4** → **Phase 5**. Each phase builds on the previous; Phase 1 is the foundation for navigation and quick access to notifications.
