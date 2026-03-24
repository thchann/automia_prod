# Automia monorepo

- **`desktop/`** — desktop web app (served at `/desktop` in production).
- **`mobile/`** — phone-first web app (served at `/` in production).

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

**Mobile vs desktop:** Visiting **`/`** opens the phone UI by default on phones. Desktop browsers are redirected to **`/desktop`** by an inline script in `mobile/index.html` (using Client Hints `userAgentData.mobile` when available, iPad “desktop UA” heuristic, then User-Agent fallback). On phone, using **Settings → View desktop site** sets `automia_desktop=1` for one year and routes to **`/desktop`**.

### Manual checks (routing)

- Phone (default browser): open **`/`** → should stay on phone UI.
- Phone after **View desktop site** on mobile: **`/`** should route to **`/desktop`** until cookie expires or site data is cleared.
- Laptop/desktop browser: open **`/`** → should redirect to **`/desktop`**.
- Desktop direct link **`/desktop`** should stay on desktop UI and support refresh/deep links.
- **Dev note:** in local dev, run both servers (`8080` desktop, `8081` mobile). Production-like routing is validated with `npm run build:vercel` and a static preview of `mobile/dist`.

### Leads / Cars table search

- **Search bar** (between summary cards and table): fuzzy text match; scope is limited to **columns you leave “on”** in the filter panel.
- **Filter** (funnel icon): Lists **all data columns** (except selection/actions). Click a row to toggle it **on** (highlighted) or **off** (muted, shows “off”). At least one column must stay on.
- **Leads — Status**: With Status **on**, use the chevron to open **value** checkboxes (New, Contacted, …). None checked = any status; any checked = row must match one of them.
- **Cars — Status / Owner**: Same pattern: turn the column **on**, then use the chevron to filter **available/sold** or **owned/client/advisor**. None checked in a group = any value for that field.
- **Summary cards** reflect the filtered row set. Pagination resets when search or filters change.
