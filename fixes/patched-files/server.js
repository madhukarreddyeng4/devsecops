/**
 * PageTurn Books — API Server (PATCHED / SECURE version)
 * ------------------------------------------------------
 * This is the hardened counterpart to app/server.js. Every [VULN-xx] from
 * the original is fixed here; each fix is tagged [FIX-xx]. Use it as the
 * "after" in your before/after, or drop it in and re-run the pipeline.
 *
 * Pairs with fixes/patched-files/db.js (parameterized queries + bcrypt).
 */

const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("./db");
const { execFile } = require("child_process"); // [FIX-05] not exec
const ejs = require("ejs");
const net = require("net");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// [FIX-01] Secret loaded from the environment, never hardcoded. Fail fast
// if it's missing. In production this comes from a secrets manager.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
// AWS credentials come from the instance role / IRSA — never from code.

const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(FRONTEND_DIST));

// [FIX-04] Auth middleware: verifies the JWT, pins the algorithm, and
// attaches req.user. Used to protect the account endpoint.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.get("/api/status", (req, res) => {
  res.json({ service: "PageTurn Books API", status: "running" });
});

// ---------------------------------------------------------------------------
// Storefront
// ---------------------------------------------------------------------------

app.get("/api/books", (req, res) => res.json(db.listBooks()));

app.get("/api/books/:id", (req, res) => {
  const book = db.getBook(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });
  res.json(book);
});

app.get("/api/books/:id/reviews", (req, res) => {
  res.json(db.listReviews(req.params.id));
});

// [FIX-08] Stored XSS: reviews are stored with tags stripped (see db.js)
// and the frontend renders them as escaped text (no dangerouslySetInnerHTML).
app.post("/api/books/:id/reviews", (req, res) => {
  const book = db.getBook(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });
  const { author, rating, body } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: "Review text is required." });
  }
  const review = db.addReview(req.params.id, { author, rating, body });
  res.status(201).json(review);
});

// [FIX-02] SQL injection: parameterized query. The wildcards go in the
// bound parameter, never in the SQL text.
app.get("/api/search", (req, res) => {
  const { q } = req.query;
  const query =
    "SELECT id, title, author, genre, price, year, rating FROM books WHERE title LIKE ?";
  db.all(query, [`%${q ?? ""}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: "Internal error" });
    res.json(rows);
  });
});

// [FIX-03] Login: parameterized lookup by username, then bcrypt verify.
// Same generic error for unknown user vs wrong password (no enumeration).
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) return res.status(500).json({ error: "Internal error" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password ?? ""), user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // [FIX-04] Strong secret + expiry + pinned algorithm.
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );
    res.json({ token });
  });
});

// [FIX-07] IDOR: require auth, then enforce ownership/role before returning
// another customer's data.
app.get("/api/account/:id", requireAuth, (req, res) => {
  const requestedId = Number(req.params.id);
  if (req.user.role !== "admin" && req.user.id !== requestedId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.get("SELECT * FROM users WHERE id = ?", [requestedId], (err, row) => {
    if (err) return res.status(500).json({ error: "Internal error" });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

app.post("/api/checkout", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }
  const total = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1), 0);
  const orderRef = "PT-" + Math.floor(20000 + Math.random() * 79999);
  res.json({
    orderRef,
    total: Math.round(total * 100) / 100,
    itemCount: items.reduce((n, it) => n + Number(it.qty || 1), 0),
    status: "Confirmed",
  });
});

// ---------------------------------------------------------------------------
// Store operations tools
// ---------------------------------------------------------------------------

// [FIX-05] Command injection: validate as an IP, then execFile (no shell).
app.get("/api/admin/ping", (req, res) => {
  const { host } = req.query;
  if (!net.isIP(String(host || ""))) {
    return res.status(400).json({ error: "Invalid host" });
  }
  execFile("ping", ["-c", "1", host], (error, stdout) => {
    if (error) return res.status(500).json({ error: "Ping failed" });
    res.json({ output: stdout });
  });
});

// [FIX-06] SSTI: the template is fixed and server-owned. Users supply only
// DATA, which EJS auto-escapes. They can no longer inject template syntax.
const ORDER_EMAIL_TEMPLATE = "Hi <%= name %>, your order <%= orderRef %> has shipped!";
app.post("/api/render-preview", (req, res) => {
  const { name, orderRef } = req.body || {};
  try {
    const output = ejs.render(ORDER_EMAIL_TEMPLATE, {
      name: String(name ?? ""),
      orderRef: String(orderRef ?? ""),
    });
    res.send(output);
  } catch {
    res.status(500).json({ error: "Render failed" });
  }
});

app.get("/healthz", (req, res) => res.json({ status: "ok" }));

app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PageTurn Books API (secure) listening on port ${PORT}`);
});

module.exports = app;
