# [VULN-01] Hardcoded Secrets

**Caught by:** Gitleaks (secrets scan) and SonarQube (SAST)
**Files:** `app/server.js`

## The problem

Secrets are written directly into source code. Once committed, they live in
git history forever — and bots scan public GitHub for exactly this.

### Before (vulnerable)

```js
const JWT_SECRET = "supersecret123";
const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
```

## The fix

Load secrets from the environment at runtime, and fail fast if they're
missing. The values come from a secrets manager (AWS Secrets Manager, SSM
Parameter Store, Vault) injected into the environment — never from source.

### After (fixed)

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
// AWS credentials should come from the instance role / IRSA, not code.
// The SDK picks them up automatically — don't set them yourself.
```

## Why it works

- Nothing sensitive is in the repo, so a leak of the source is not a leak
  of the keys.
- Rotating a secret is a config change, not a code change + redeploy.
- Gitleaks passes because there's no secret-shaped string left to match.

## Also do

- Add a pre-commit Gitleaks hook so secrets are caught *before* they're
  committed, not just in CI.
- If a real secret was ever committed, rotate it — removing it from the
  latest commit does **not** remove it from history.
