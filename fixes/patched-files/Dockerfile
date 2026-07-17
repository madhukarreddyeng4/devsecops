# PageTurn Books — HARDENED Dockerfile (patched)
# ----------------------------------------------
# Fixes VULN-D1..D5: pinned minimal base, npm ci, non-root user, no baked-in
# secrets, health check. Multi-stage so build tools don't ship in the runtime.

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

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# No secrets in the image — JWT_SECRET is injected at runtime by the
# orchestrator (docker compose env / ECS task def / k8s secret).

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]
