# [VULN-07] IDOR / Broken Access Control

**Caught by:** manual review, OWASP ZAP (partially)
**Files:** `app/server.js`

## The problem

The account endpoint returns any customer's full record — name, email,
shipping address, order history — for **any** ID passed in the URL. There's
no authentication and no ownership check, so changing `/account/2` to
`/account/3` leaks someone else's PII. This is Insecure Direct Object
Reference (a form of broken access control — OWASP #1).

### Before (vulnerable)

```js
app.get("/api/account/:id", (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, row) => {
    res.json(row || {}); // anyone can read anyone
  });
});
```

## The fix

Require authentication, then enforce that the caller may only read their own
account — unless they're an admin.

### After (fixed)

```js
// requireAuth verifies the JWT and sets req.user (see fix 04).
app.get("/api/account/:id", requireAuth, (req, res) => {
  const requestedId = Number(req.params.id);

  // Ownership / role check: you can only read yourself, unless admin.
  if (req.user.role !== "admin" && req.user.id !== requestedId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.get(
    "SELECT id, username, name, email, address, role FROM users WHERE id = ?",
    [requestedId],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Internal error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    }
  );
});
```

## Why it works

- **Authentication** establishes *who* is asking.
- **Authorization** (the ownership/role check) enforces *what they're
  allowed to see* — the piece that was missing entirely.
- Access control must be checked **on the server for every object**, on
  every request. Hiding the link in the UI is not access control.

## Rule of thumb

Scanners struggle with IDOR because the request looks valid — this is mostly
caught by review and testing. For every endpoint that takes an ID, ask:
"whose data is this, and is the caller allowed to see it?"
