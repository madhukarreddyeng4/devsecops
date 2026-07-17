# Hardened Versions — "After" Reference

This file shows the hardened version of every seeded vulnerability in this
repo. Use it on screen for the before/after comparison, or as the answer
key when viewers try to fix the issues themselves.

> Part 2 of this series goes further: Claude Code reads the pipeline's scan
> output and applies fixes like these automatically inside a PR.

---

## [VULN-01 / VULN-04] Hardcoded secrets + weak JWT signing

**Before:**
```js
const JWT_SECRET = "supersecret123";
const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
```

**After:**
```js
const JWT_SECRET = process.env.JWT_SECRET; // injected at runtime, never committed
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: "1h" }
);
```
In production: load `JWT_SECRET` from AWS Secrets Manager or SSM Parameter
Store, not a plain environment variable baked into the image.

---

## [VULN-02] SQL injection in book search

**Before:**
```js
const query = `SELECT id, title, author FROM books WHERE title LIKE '%${q}%'`;
db.all(query, [], ...);
```
A quote in `q` breaks out of the `LIKE` string — `x' OR '1'='1` turns the
filter into an always-true condition and returns the whole catalog (and, in
a real database, could be extended with `UNION SELECT` to reach other tables
like `users`).

**After:**
```js
db.all(
  "SELECT id, title, author FROM books WHERE title LIKE ?",
  [`%${q}%`],
  ...
);
```
The wildcards are added to the *bound parameter*, not concatenated into the
SQL. The user's input can never change the structure of the query.

---

## [VULN-03 / VULN-04] Login SQL injection + plaintext passwords

**Before:**
```js
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
db.get(query, [], ...);
```

**After:**
```js
const bcrypt = require("bcrypt");

db.get(
  "SELECT * FROM users WHERE username = ?",
  [username],
  async (err, user) => {
    if (err) return res.status(500).json({ error: "Internal error" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  }
);
```
Parameterized queries eliminate the injection vector; bcrypt hashing means
a database leak doesn't expose plaintext passwords. Both error paths
return the same generic message to avoid user enumeration.

---

## [VULN-05] Command injection

**Before:**
```js
exec(`ping -c 1 ${host}`, ...);
```

**After:**
```js
const { execFile } = require("child_process");
const validator = require("validator");

if (!validator.isIP(host)) {
  return res.status(400).json({ error: "Invalid host" });
}
execFile("ping", ["-c", "1", host], (error, stdout, stderr) => { ... });
```
`execFile` doesn't invoke a shell, so shell metacharacters can't be used
to chain commands — and the input is validated as a real IP first.

---

## [VULN-06] Server-side template injection

**Before:**
```js
const output = ejs.render(template, data || {});
```

**After:** Don't accept arbitrary template strings from users at all.
Render only a fixed, pre-defined template file using `ejs.renderFile`,
and pass only sanitized data into it:
```js
const output = await ejs.renderFile("views/preview.ejs", sanitizedData);
```

---

## [VULN-07] IDOR / missing authorization

**Before:**
```js
app.get("/api/account/:id", (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], ...);
  // returns name, email, address, order history for ANY id
});
```

**After:**
```js
app.get("/api/account/:id", requireAuth, (req, res) => {
  const requestedId = Number(req.params.id);
  if (req.user.role !== "admin" && req.user.id !== requestedId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.get("SELECT * FROM users WHERE id = ?", [requestedId], ...);
});
```
Add a `requireAuth` middleware that verifies the JWT and attaches
`req.user`, then enforce an ownership/role check before returning data.
The account endpoint leaks real PII (address, orders), so this check is
what stands between one logged-in customer and everyone else's data.

---

## [VULN-08] Stored cross-site scripting (XSS) in reviews

**Before (frontend — `BookDetail.jsx`):**
```jsx
// Review body rendered as raw HTML — anything a user submitted runs.
<div dangerouslySetInnerHTML={{ __html: r.body }} />
```
```js
// Backend also stores the body verbatim, no sanitization.
const review = db.addReview(id, { author, rating, body });
```
A review with a body like `<img src=x onerror="alert(document.cookie)">`
is saved as-is and executes in the browser of everyone who opens that book
— stealing sessions, defacing the page, or worse. This is *stored* XSS: the
payload lives in your data and re-fires on every view.

**After — the simplest fix is to render as text, not HTML:**
```jsx
// React escapes by default when you render a string as a child.
<div>{r.body}</div>
```
Removing `dangerouslySetInnerHTML` entirely is the cleanest fix — React
escapes `<`, `>`, and `&`, so the payload shows up as harmless text.

**If you genuinely need to allow some formatting**, sanitize first:
```jsx
import DOMPurify from "dompurify";

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.body) }} />
```
And sanitize/validate on the server on input as well — defense in depth.
SonarQube's SAST rules flag `dangerouslySetInnerHTML` on sight, which is
exactly how this gets caught in the pipeline; OWASP ZAP can also surface it
dynamically by injecting test payloads against the live app.

---

## [VULN-D1–D5] Dockerfile hardening

**Before:**
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

**After:**
```dockerfile
# ---------- Stage 1: build the frontend ----------
FROM node:20.11-alpine3.19 AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend runtime ----------
FROM node:20.11-alpine3.19
WORKDIR /srv/app

COPY app/package*.json ./
RUN npm ci --omit=dev

COPY app/ ./
COPY --from=frontend-build /build/frontend/dist /srv/frontend/dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]
```
Pinned minimal base image, `npm ci` for reproducible installs, a
non-root user, no secrets baked into the image (inject at runtime via
the orchestrator), and a health check. The multi-stage build keeps the
frontend's build-time dependencies out of the final runtime image.

---

## [VULN-T1] Terraform security group hardening

**Before:**
```hcl
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}
```

**After:**
```hcl
variable "trusted_admin_cidr" {
  description = "Your IP/CIDR allowed to SSH in"
  type        = string
}

ingress {
  description = "SSH from trusted admin IP only"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = [var.trusted_admin_cidr] # e.g. "203.0.113.4/32"
}
```
Never leave port 22 open to `0.0.0.0/0`. Restrict to your IP, a VPN
range, or better — use AWS Systems Manager Session Manager and remove
the inbound SSH rule entirely.
