# Automia monorepo

- **`desktop/`** — desktop web app (served at `/desktop` in production).
- **`mobile/`** — phone-first web app (canonical URL **`/m`** in production; `/` redirects phones to `/m`).

## Setup

From the repository root:

```bash
npm install
```

## Development

```bash
# Main site (port 8080)
npm run dev:desktop

# Mobile app (port 8081)
npm run dev:mobile
```

## Production builds

```bash
npm run build:desktop
npm run build:mobile
```

## Vercel

The repo root includes `vercel.json`: install at root, run **`build:vercel`**. Production output is **`mobile/dist`**, with desktop bundled under `mobile/dist/desktop`.

In the Vercel project settings, set **Root Directory** to **`.`** (repository root).

**Mobile vs desktop:** On a **phone**, visiting **`/`** redirects to **`/m`** (canonical mobile app). Opening **`/m`** directly also loads the mobile app. Desktop browsers hitting **`/`** are redirected to **`/desktop`** by an inline script in `mobile/index.html` (Client Hints `userAgentData.mobile` when available, iPad heuristic, then User-Agent fallback). Cookie **`automia_desktop=1`** forces the desktop app (e.g. from a “desktop site” preference).

### Manual checks (routing)

- Phone: open **`/`** → should redirect to **`/m`** and show the phone UI.
- Phone: open **`/m`** directly → should show the phone UI (no broken assets).
- Phone with **`automia_desktop=1`**: **`/`** or **`/m`** should route to **`/desktop`** until the cookie is cleared.
- Laptop/desktop: open **`/`** → should redirect to **`/desktop`**.
- **`/desktop`** supports refresh and deep links.
- **Dev:** `npm run dev:mobile` — try **`http://localhost:8081/m`** (middleware rewrites to the SPA). Production-like behavior: `npm run build:vercel` and preview `mobile/dist`.

### Leads / Cars table search

- **Search bar** (between summary cards and table): fuzzy text match; scope is limited to **columns you leave “on”** in the filter panel.
- **Filter** (funnel icon): Lists **all data columns** (except selection/actions). Click a row to toggle it **on** (highlighted) or **off** (muted, shows “off”). At least one column must stay on.
- **Leads — Status**: With Status **on**, use the chevron to open **value** checkboxes (New, Contacted, …). None checked = any status; any checked = row must match one of them.
- **Cars — Status / Owner**: Same pattern: turn the column **on**, then use the chevron to filter **available/sold** or **owned/client/advisor**. None checked in a group = any value for that field.
- **Summary cards** reflect the filtered row set. Pagination resets when search or filters change.
