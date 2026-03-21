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

**Mobile vs desktop:** Visiting **`/`** on a **phone** redirects to **`/m`** (inline script in `desktop/index.html`). To stay on the desktop site from a phone, open **Settings → View desktop site** on the mobile app (sets a cookie for one year).
