# [VULN-02] SQL Injection — Book Search

**Caught by:** SonarQube (SAST), OWASP ZAP (DAST)
**Files:** `app/server.js`, `app/db.js`

## The problem

The search query is built by concatenating user input straight into a SQL
string. A quote in the input breaks out of the string literal, so
`x' OR '1'='1` turns the filter into an always-true condition and dumps the
entire catalog. In a real database this extends to `UNION SELECT` attacks
that pull other tables (users, password hashes).

### Before (vulnerable)

```js
app.get("/api/search", (req, res) => {
  const { q } = req.query;
  const query = `SELECT id, title, author FROM books WHERE title LIKE '%${q}%'`;
  db.all(query, [], (err, rows) => { ... });
});
```

## The fix

Use a **parameterized query** (prepared statement). The wildcards go into
the *bound parameter*, never into the SQL text, so user input can never
change the structure of the query.

### After (fixed)

```js
app.get("/api/search", (req, res) => {
  const { q } = req.query;
  const query = "SELECT id, title, author FROM books WHERE title LIKE ?";
  db.all(query, [`%${q}%`], (err, rows) => { ... });
});
```

## Why it works

- The database receives the query template and the value **separately**. The
  driver never re-parses your input as SQL, so quotes and `OR '1'='1'` are
  treated as a literal string to match — not code.
- This is the single most important habit in backend security: **data goes
  in parameters, never in the query string.**

## Rule of thumb

If you ever find yourself using `+`, template literals, or `.format()` to
build a SQL string with a variable in it — stop. That's the vulnerability.
Use `?` / named placeholders and pass a parameter array instead.
