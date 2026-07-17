# [VULN-09] Vulnerable Dependencies

**Caught by:** Trivy (SCA)
**Files:** `app/package.json`, `frontend/package.json`

## The problem

The app pins deliberately old library versions with published CVEs — old
Express, Lodash, Axios, EJS. Your own code can be perfect and the app is
still exploitable through its dependencies. These CVEs are public, with
known exploits, so an attacker doesn't have to discover anything.

### Before (vulnerable)

```json
{
  "dependencies": {
    "express": "4.17.1",
    "lodash": "4.17.15",
    "axios": "0.21.1",
    "ejs": "3.1.5",
    "jsonwebtoken": "8.5.1"
  }
}
```

## The fix

Bump each dependency past its known-vulnerable range, then re-run Trivy to
confirm the findings clear. (Check the CVE for the exact fixed version;
these are safe recent targets at time of writing.)

### After (fixed)

```json
{
  "dependencies": {
    "express": "^4.21.2",
    "lodash": "^4.17.21",
    "axios": "^1.7.9",
    "ejs": "^3.1.10",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1"
  }
}
```

Then:

```bash
cd app
npm install            # updates package-lock.json
npm audit fix          # optional: auto-patch what it safely can
trivy fs .             # confirm the CRITICAL/HIGH findings are gone
```

> Note: `axios` 0.x → 1.x and `jsonwebtoken` 8.x → 9.x are **major** bumps
> with small API changes. Read their migration notes and test. That's the
> real work of dependency hygiene — not just the version number.

## Why it works

- Newer versions contain the upstream patches for the CVEs Trivy flagged.
- A committed **lockfile** (`package-lock.json`) makes the fix reproducible.
- Running SCA in CI means the *next* vulnerable dependency gets caught the
  day its CVE is published, not months later.

## Keep it fixed

- Enable Dependabot / Renovate to open update PRs automatically.
- Fail the pipeline on new CRITICAL/HIGH CVEs once your baseline is clean.
