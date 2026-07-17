# [VULN-03] Login SQL Injection + Plaintext Passwords

**Caught by:** SonarQube (SAST)
**Files:** `app/server.js`, `app/db.js`

## The problem

Two issues in one endpoint:

1. **SQLi auth bypass** — username and password are concatenated into the
   query, so `x' OR '1'='1` in the password field logs you in as the first
   user (admin) with no real credentials.
2. **Plaintext passwords** — passwords are stored and compared as raw text,
   so a database leak exposes every password directly. The response also
   leaks whether a username exists (user enumeration).

### Before (vulnerable)

```js
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  db.get(query, [], (err, user) => {
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, ... }, JWT_SECRET);
    res.json({ token });
  });
});
```

## The fix

Parameterize the lookup (by username only), then verify the password with a
**slow one-way hash** (bcrypt/argon2). Store only the hash. Return the same
generic error whether the username or the password was wrong.

### After (fixed)

```js
const bcrypt = require("bcrypt");

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) return res.status(500).json({ error: "Internal error" });

    // Same generic message for "no such user" and "wrong password"
    // so an attacker can't enumerate valid usernames.
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  });
});
```

Storing users (seed / signup) hashes the password first:

```js
const password_hash = await bcrypt.hash(plaintextPassword, 12);
// store password_hash, never the plaintext
```

## Why it works

- **Parameterized query** kills the injection bypass (see fix 02).
- **bcrypt** is deliberately slow and salted, so even if the hashes leak,
  cracking them is expensive and rainbow tables don't help.
- **Uniform error message** removes the user-enumeration side channel.
