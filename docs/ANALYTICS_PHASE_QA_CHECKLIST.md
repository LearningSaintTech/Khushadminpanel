# Admin Analytics Workspace QA Checklist

## Scope
- Redesigned analytics workspace with cleaner IA and polished visual hierarchy.
- Segmented mode switch: `Overview + Insights` and `Event Explorer`.
- Unified filter bar + phase summary behavior + safer reset flow.
- Explorer presets, CSV export, per-row delete, and bulk delete confirmation.

## Overview + Insights Checks
- Open analytics and confirm default mode is `Overview + Insights`.
- Run `Phase 1: Full analytics summary` and verify:
  - status pill updates (`Loading` -> `Loaded` or `Error`).
  - KPI cards and summary stats render.
  - compatibility notes and summary meta (`generatedAt`, `queryTimeMs`) render.
  - metric source toggle expands/collapses correctly.
- Change `channel` and date filters; rerun query; verify changed output.
- Click each KPI card and verify the table changes context (events/users/website/app).

## Explorer Checks
- Switch to `Event Explorer` mode.
- Apply preset filters:
  - `All Events`
  - `Checkout Funnel`
  - `Payment Failures`
  - `Auth Failures`
- Verify event table updates with pagination.
- Verify top event chips (`Event Hotspots`) update for current page.
- Export CSV and confirm file contains current page rows and selected filters.

## Safe Management Checks
- Click `Delete Filtered Events` and enter wrong confirmation text.
  - Verify no deletion occurs.
- Click again and enter `DELETE`.
  - Verify filtered deletion executes.
- Delete a single row and verify table refreshes.
- Click `Reset` and verify filters + insight state reset cleanly.

## Error Handling Checks
- Stop backend and run dashboard query.
  - Verify actionable error appears in the error banner/query box.
- Restart backend and rerun.
  - Verify successful recovery.

## Regression Checks
- Existing analytics event ingest endpoint still accepts website events.
- Existing admin route `/admin/analytics/events` still loads.
- Sidebar navigation item label (`Analytics Workspace`) opens the same route.
- No console runtime errors in analytics page load, mode switches, filter applies, and deletes.
