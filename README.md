# Automia monorepo

- **`desktop/`** — main web app (Vercel deploys this by default; see root `vercel.json`).
- **`mobile/`** — mobile web UI (run locally until routing is wired).

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

The repo root includes `vercel.json`: install at root, run **`build:vercel`** (desktop + mobile copied into `desktop/dist/m`). Production output is still **`desktop/dist`**.

In the Vercel project settings, set **Root Directory** to **`.`** (repository root).

**Mobile vs desktop:** Visiting **`/`** on a **phone** redirects to **`/m`** (inline script in `desktop/index.html`: Client Hints `userAgentData.mobile` when available, iPad “desktop UA” heuristic, then broad User-Agent fallback). To stay on the desktop site from a phone, open **Settings → View desktop site** on the mobile app (sets a cookie for one year).

### Manual checks (redirect)

- Phone (default browser): open **`/`** → should land on **`/m`**.
- Phone with **“Request desktop site”** / **Desktop mode**: **`/`** should stay on desktop (no forced `/m`).
- After **View desktop site** on mobile: **`/`** stays desktop until the cookie expires or site data is cleared.
- Laptop/desktop browser: **`/`** should not redirect to **`/m`**.
- **Dev note:** `/m` is only served from a **production** build (`npm run build:vercel` + static preview); `npm run dev:desktop` alone may 404 on `/m` unless you also run **`npm run dev:mobile`** on port **8081** or use a preview of `desktop/dist`.

### Leads / Cars table search

- **Search bar** (between summary cards and table): fuzzy text match; scope is limited to **columns you leave “on”** in the filter panel.
- **Filter** (funnel icon): Lists **all data columns** (except selection/actions). Click a row to toggle it **on** (highlighted) or **off** (muted, shows “off”). At least one column must stay on.
- **Leads — Status**: With Status **on**, use the chevron to open **value** checkboxes (New, Contacted, …). None checked = any status; any checked = row must match one of them.
- **Cars — Status / Owner**: Same pattern: turn the column **on**, then use the chevron to filter **available/sold** or **owned/client/advisor**. None checked in a group = any value for that field.
- **Summary cards** reflect the filtered row set. Pagination resets when search or filters change.
