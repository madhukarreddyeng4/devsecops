# PageTurn — Vulnerability Fixes

This folder is the **answer key**. For every vulnerability the pipeline
catches, there's a file here showing the vulnerable code, the fixed code,
and *why* the fix works. Use it to walk viewers through remediation after
the scans have flagged everything.

## How to use this on camera

1. Run the pipeline — let Gitleaks, SonarQube, Trivy, Checkov, and ZAP
   flag the issues.
2. Open the matching file below and show the **Before → After** diff.
3. (Optional) Drop in the fully-patched files from `patched-files/` and
   re-run the pipeline to show the findings disappear.

## Index

| # | Vulnerability | File | Caught by |
|---|---|---|---|
| 01 | Hardcoded secrets | [01-hardcoded-secrets.md](01-hardcoded-secrets.md) | Gitleaks, SonarQube |
| 02 | SQL injection (book search) | [02-sql-injection-search.md](02-sql-injection-search.md) | SonarQube, ZAP |
| 03 | SQLi login + plaintext passwords | [03-login-and-passwords.md](03-login-and-passwords.md) | SonarQube |
| 04 | Weak / no-expiry JWT | [04-jwt.md](04-jwt.md) | SonarQube |
| 05 | Command injection | [05-command-injection.md](05-command-injection.md) | SonarQube, ZAP |
| 06 | Server-side template injection | [06-ssti.md](06-ssti.md) | SonarQube |
| 07 | IDOR / broken access control | [07-idor.md](07-idor.md) | manual / ZAP |
| 08 | Stored XSS (reviews) | [08-stored-xss.md](08-stored-xss.md) | SonarQube, ZAP |
| 09 | Vulnerable dependencies | [09-dependencies.md](09-dependencies.md) | Trivy |
| 10 | Dockerfile hardening | [10-dockerfile.md](10-dockerfile.md) | Trivy, Checkov |
| 11 | Terraform / open security group | [11-terraform-sg.md](11-terraform-sg.md) | Checkov |

## `patched-files/`

Drop-in hardened versions of the real source files:

- `server.js` — all backend fixes applied (SQLi, command injection, SSTI, IDOR, secrets, JWT)
- `db.js` — parameterized queries + bcrypt password hashing
- `BookDetail.jsx` — XSS fix (no `dangerouslySetInnerHTML`)
- `package.json` — dependency versions bumped past known CVEs
- `Dockerfile` — hardened multi-stage build
- `main.tf` — locked-down security group

> These are provided as a reference for Part 2 / the "now let's fix it"
> segment. Copy them over the originals to see a clean pipeline run.

## The golden rule

Every fix here comes down to one of a handful of principles:

- **Never trust input.** Parameterize queries, validate/allow-list, escape output.
- **Never hardcode secrets.** Inject them at runtime from a secrets manager.
- **Least privilege.** Non-root containers, scoped SG rules, authz on every object.
- **Keep dependencies current.** Old libraries carry public, weaponized CVEs.
- **Defense in depth.** Sanitize on input *and* escape on output.
