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

The repo root includes `vercel.json`: install at root, build **desktop** (`desktop/dist`). In the Vercel project settings, set **Root Directory** to **`.`** (repository root), not `desktop`, so `npm install` sees the workspace `package.json`.
