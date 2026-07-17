# VulnShop Dockerfile (multi-stage)
# ----------------------------------
# Stage 1 builds the React frontend; stage 2 runs the Express backend and
# serves the built frontend as static files.
#
# This file INTENTIONALLY contains common container misconfigurations so the
# Trivy image scan + Checkov Dockerfile checks have something to catch.
# See docs/FIXES.md for the hardened version used in the "after" comparison.

# ---------- Stage 1: build the frontend ----------
# [VULN-D1] Unpinned "latest" tag instead of a specific, minimal, pinned
# base image -> unpredictable builds + larger attack surface.
FROM node:latest AS frontend-build

WORKDIR /build/frontend

COPY frontend/package*.json ./
# [VULN-D2] npm install instead of npm ci — doesn't respect the lockfile
# exactly, can silently pull newer (and possibly vulnerable) versions.
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend runtime ----------
FROM node:latest

WORKDIR /srv/app

COPY app/package*.json ./
RUN npm install

COPY app/ ./

# Bring in the built frontend so Express can serve it from ../frontend/dist
COPY --from=frontend-build /build/frontend/dist /srv/frontend/dist

# [VULN-D3] No USER instruction — container runs as root by default.
# Trivy/Checkov both flag missing non-root user.

# [VULN-D4] Secrets baked in via ENV instead of injected at runtime via
# a secrets manager or orchestrator-level secret.
ENV JWT_SECRET=supersecret123
ENV AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE

EXPOSE 3000

# [VULN-D5] No HEALTHCHECK defined.

CMD ["node", "server.js"]
