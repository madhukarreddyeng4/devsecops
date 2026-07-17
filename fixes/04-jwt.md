# [VULN-04] Weak / No-Expiry JWT

**Caught by:** SonarQube (SAST)
**Files:** `app/server.js`

## The problem

The JWT is signed with a weak, hardcoded secret (see fix 01) **and** has no
expiry. A token, once issued or stolen, is valid forever — there's no window
that closes.

### Before (vulnerable)

```js
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  JWT_SECRET
); // no options → no expiry
```

## The fix

Sign with a strong secret loaded from the environment (fix 01) and always
set an expiry. Verify with the matching options on the way back in.

### After (fixed)

```js
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  JWT_SECRET,                 // long, random, from env / secrets manager
  { expiresIn: "1h", algorithm: "HS256" }
);
```

And when verifying incoming tokens, pin the algorithm so an attacker can't
downgrade to `none`:

```js
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
```

## Why it works

- **Short expiry** limits the blast radius of a leaked token.
- **Strong secret** makes forging a signature infeasible.
- **Pinned algorithm** blocks the classic `alg: none` / algorithm-confusion
  forgery.
- For long sessions, pair a short-lived access token with a refresh token
  rather than one eternal token.
