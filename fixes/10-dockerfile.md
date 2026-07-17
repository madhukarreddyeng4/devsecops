# [VULN-D1–D5] Dockerfile Hardening

**Caught by:** Trivy (image scan), Checkov (Dockerfile checks)
**Files:** `Dockerfile`

## The problems

| Tag | Issue |
|-----|-------|
| D1 | Unpinned `node:latest` base — unpredictable, large attack surface |
| D2 | `npm install` instead of `npm ci` — ignores the lockfile |
| D3 | No `USER` — container runs as **root** |
| D4 | Secrets baked in with `ENV` |
| D5 | No `HEALTHCHECK` |

### Before (vulnerable)

```dockerfile
FROM node:latest AS frontend-build
...
FROM node:latest
WORKDIR /srv/app
RUN npm install
ENV JWT_SECRET=supersecret123
EXPOSE 3000
CMD ["node", "server.js"]
```

## The fix

### After (hardened)

```dockerfile
# ---------- Stage 1: build the frontend ----------
FROM node:20.19-alpine3.20 AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend runtime ----------
FROM node:20.19-alpine3.20
WORKDIR /srv/app

COPY app/package*.json ./
RUN npm ci --omit=dev

COPY app/ ./
COPY --from=frontend-build /build/frontend/dist /srv/frontend/dist

# Run as a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# No secrets in the image — inject JWT_SECRET at runtime via the
# orchestrator (docker compose env / ECS task def / k8s secret).

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]
```

## Why it works

- **Pinned, minimal (alpine) base** → fewer packages, fewer CVEs, and
  reproducible builds. Re-run Trivy and watch the CVE count drop.
- **`npm ci --omit=dev`** installs exactly the lockfile, production deps only.
- **Non-root `USER`** → a container escape doesn't hand over root.
- **No baked-in secrets** → the image is safe to store in a registry.
- **Multi-stage** → the frontend's build tools never ship in the final image.
- **HEALTHCHECK** → the orchestrator knows when the app is actually up.
