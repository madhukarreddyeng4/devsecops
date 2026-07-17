/**
 * PageTurn Books — API Server
 * ---------------------------
 * INTENTIONALLY VULNERABLE demo app for the DevSecOps pipeline tutorial.
 *
 * This file contains SEVERAL DELIBERATE security issues, each tagged with
 * a [VULN-xx] marker below. The CI/CD pipeline built in this video (Gitleaks,
 * SonarQube, Trivy, Checkov, OWASP ZAP) is designed to catch these.
 *
 * DO NOT use any of these patterns in real projects, and DO NOT deploy
 * this app to a publicly reachable host.
 */

const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const db = require("./db"); // in-memory fake-SQL shim, see db.js
const { exec } = require("child_process");
const _ = require("lodash");
const ejs = require("ejs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// [VULN-01] Hardcoded secret — Gitleaks should flag this immediately.
// A real app must load this from a secrets manager (AWS Secrets Manager,
// SSM Parameter Store, Vault, etc.), never from source.
const JWT_SECRET = "supersecret123";
const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"; // fake demo key, still flaggable pattern

// Serve the built React frontend (frontend/dist) as static assets.
// In dev, run the Vite dev server separately (npm run dev in frontend/)
// which proxies /api/* to this Express server instead.
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(FRONTEND_DIST));

app.get("/api/status", (req, res) => {
  res.json({ service: "PageTurn Books API", status: "running" });
});

// ---------------------------------------------------------------------------
// Legitimate storefront routes (the "real app" surface).
// ---------------------------------------------------------------------------

// Full catalog for the home / browse page.
app.get("/api/books", (req, res) => {
  res.json(db.listBooks());
});

// Single book detail page.
app.get("/api/books/:id", (req, res) => {
  const book = db.getBook(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });
  res.json(book);
});

// List reviews for a book.
app.get("/api/books/:id/reviews", (req, res) => {
  res.json(db.listReviews(req.params.id));
});

/**
 * [VULN-08] Stored Cross-Site Scripting (XSS)
 * The review body is saved exactly as submitted, with no sanitization or
 * encoding. The React frontend then renders it with dangerouslySetInnerHTML
 * (see frontend BookDetail.jsx), so any HTML/JS in a review executes in the
 * browser of every visitor who later opens that book — a classic stored XSS.
 * Real fix: sanitize on input AND render as text/escaped output.
 */
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

/**
 * [VULN-02] SQL Injection
 * The book search builds a raw SQL string by concatenating the user's
 * query directly into a LIKE clause instead of using a parameterized
 * query. A search box over a book catalog is the most natural feature
 * in the world — which is exactly why this injection hides so well.
 */
app.get("/api/search", (req, res) => {
  const { q } = req.query;
  const query = `SELECT id, title, author, genre, price, year, rating FROM books WHERE title LIKE '%${q}%'`;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * [VULN-03] Plaintext password storage + comparison
 * Passwords are stored and compared in plaintext rather than hashed
 * with bcrypt/argon2. Also note: login response leaks whether the
 * username exists at all (user enumeration).
 */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(query, [], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // [VULN-04] JWT signed with weak, hardcoded secret and no expiry set.
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token });
  });
});

/**
 * [VULN-07] Insecure direct object reference (IDOR) + no authz check.
 * Any caller — even unauthenticated — can fetch ANY customer's full
 * account (name, email, shipping address, order history) just by
 * changing the ID. There is no ownership/role check at all.
 */
app.get("/api/account/:id", (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

// Checkout — accepts a cart and returns a fake order confirmation.
// (No payment, obviously; this is set dressing to make the flow feel real.)
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
// "Store operations" tools — believable internal utilities that happen to
// host two more vulnerabilities.
// ---------------------------------------------------------------------------

/**
 * [VULN-05] Command Injection
 * User-supplied input is passed straight into a shell command. Framed as
 * a "check whether a supplier/fulfillment host is reachable" ops tool.
 */
app.get("/api/admin/ping", (req, res) => {
  const { host } = req.query;
  exec(`ping -c 1 ${host}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ output: stdout });
  });
});

/**
 * [VULN-06] Server-Side Template Injection (SSTI) risk
 * User input is rendered directly through ejs.render with no escaping
 * context boundary — combined with an outdated `ejs` version, this is
 * exactly the kind of finding Trivy's SCA scan + SAST should surface.
 * Framed as an "order confirmation email template preview" tool.
 */
app.post("/api/render-preview", (req, res) => {
  const { template, data } = req.body;
  try {
    const output = ejs.render(template, data || {});
    res.send(output);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/healthz", (req, res) => res.json({ status: "ok" }));

// Catch-all: any non-API route falls through to the React app's index.html
// so client-side routes (e.g. /account/2, /search) work on a hard refresh.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PageTurn Books API listening on port ${PORT}`);
});

module.exports = app;
