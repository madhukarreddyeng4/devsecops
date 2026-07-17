# DevSecOps Pipeline End-to-End — Part 1

Companion code for the YouTube video **"DevSecOps Project End-to-End:
From Code to Cloud (Part 1)"** by Madhukar. This is the first video in the
**Zero to Hero DevSecOps** playlist.

> ⚠️ **This app is intentionally vulnerable.** It's a teaching tool for a
> CI/CD security pipeline. Do not deploy it to a public-facing host beyond
> the scope of this demo, and never reuse these code patterns in real
> projects.

## What's in this repo

```
.
├── app/                      # PageTurn backend — seeded-vulnerable Node/Express API
│   ├── server.js             #   API routes + serves the built frontend
│   ├── db.js                 #   in-memory data layer (books + customers, no native deps)
│   ├── package.json
│   ├── .gitleaks.toml
│   └── .env.example
├── frontend/                 # React storefront UI (Vite)
│   ├── src/
│   │   ├── pages/            #   Home, BookDetail, Search, Cart, Checkout, Login, Account, StoreOps
│   │   ├── components/       #   Layout / nav / BookCover
│   │   └── lib/              #   API client + auth + cart contexts
│   └── package.json
├── Dockerfile                # Multi-stage: builds frontend, serves via Express
├── terraform-ec2/            # IaC for the EC2 deploy target (this video)
├── jenkins/Jenkinsfile       # Alt-path CI/CD pipeline (Jenkins)
├── .github/workflows/        # Primary CI/CD pipeline (GitHub Actions)
├── sonar-project.properties  # SonarQube analysis config
├── docker-compose.yml        # Run the full app via Docker Compose
├── fixes/                    # The "answer key" — how to fix every vuln
│   ├── 01..11-*.md          #   per-vuln before/after + explanation
│   └── patched-files/       #   drop-in hardened server.js, db.js, etc.
└── docs/
    ├── FIXES.md              # Hardened "after" version of every seeded issue
    └── SETUP.md              # Tool + SonarQube setup instructions
```

## The app

**PageTurn** is a small but believable online bookstore — a React storefront
(browse catalog, book detail, cart, checkout, order confirmation) on top of an
Express API. Each seeded vulnerability hides inside an ordinary-looking feature
so the demo feels like attacking a real app, not a list of toy endpoints:

| Feature (in the UI) | Hidden vulnerability |
|---|---|
| Book search bar | SQL injection (`[VULN-02]`) |
| Sign-in form | SQLi auth bypass, plaintext passwords, weak JWT (`[VULN-03/04]`) |
| Book reviews | Stored cross-site scripting / XSS (`[VULN-08]`) |
| Account page (name/email/address/orders) | IDOR — view any customer by ID (`[VULN-07]`) |
| Store Ops → Supplier connectivity check | Command injection (`[VULN-05]`) |
| Store Ops → Order email preview | Server-side template injection (`[VULN-06]`) |

> The internal package/image name stays `vulnshop` (used as the Docker image
> tag and SonarQube project key) so the pipeline identifiers are stable.


## The pipeline

| Stage | Tool | Catches |
|---|---|---|
| 1. Secrets scan | Gitleaks | Hardcoded keys/tokens |
| 2. SAST | SonarQube | Insecure code patterns (SQLi, command injection, etc.) |
| 3. SCA | Trivy (fs scan) | Vulnerable npm dependencies |
| 4. IaC scan | Checkov | Misconfigured Terraform |
| 5. Container scan | Trivy (image scan) | CVEs in the built image |
| 6. Deploy | — | Ships to EC2 |
| 7. DAST | OWASP ZAP | Runtime vulnerabilities on the live app |

## Quick start

### Run locally (two terminals, with hot reload)

Backend (Express API on port 3000):
```bash
cd app
cp .env.example .env
npm install   # no native build tools required — pure JS dependencies only
npm start
```

Frontend (Vite dev server on port 5173, proxies /api to the backend):
```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

### Run as a single server (production-style)

Build the frontend, then let Express serve it:
```bash
cd frontend && npm install && npm run build && cd ..
cd app && npm install && npm start
# -> http://localhost:3000  (UI + API on one port)
```

Or just use Docker Compose, which does the whole multi-stage build:
```bash
docker compose up --build
# -> http://localhost:3000
```

Try the seeded SQL injection bypass (see `server.js` for the `[VULN-02]`/`[VULN-03]` markers):
```bash
# Normal book search
curl "http://localhost:3000/api/search?q=dune"

# Injection bypass — dumps the entire catalog through the search box
curl -G "http://localhost:3000/api/search" --data-urlencode "q=x' OR '1'='1"

# Injection bypass on login — authenticates without a real password
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"x' OR '1'='1\"}"

# IDOR — read any customer's full account (PII + orders), unauthenticated
curl "http://localhost:3000/api/account/2"

# Stored XSS — plant a payload in a book review; it runs for everyone who
# opens that book's page (visit http://localhost:3000/book/3 after posting)
curl -X POST http://localhost:3000/api/books/3/reviews -H "Content-Type: application/json" \
  -d '{"author":"Mallory","rating":5,"body":"<img src=x onerror=\"alert(document.cookie)\">nice"}'
```

### Run it via Docker Compose
```bash
docker compose up --build
```

### Deploy infrastructure
```bash
cd terraform-ec2
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with your key pair name
terraform init
terraform plan
terraform apply
```

### Run the security scans locally
See `docs/SETUP.md` for install commands (including standing up a SonarQube
server), then from the repo root:
```bash
gitleaks detect --source . --config app/.gitleaks.toml

# SonarQube: needs a running server + token (see docs/SETUP.md)
export SONAR_TOKEN=<your-token>
export SONAR_HOST_URL=http://localhost:9000
sonar-scanner

trivy fs .
checkov -d terraform-ec2
```

## Seeded vulnerabilities (for reference)

Every deliberate issue is tagged `[VULN-xx]` directly in the source
comments (`server.js`, `Dockerfile`, `main.tf`). Cross-reference with
`docs/FIXES.md` for the hardened version of each one.

## What's next — Part 2

Part 2 of this series migrates this same workload to **AWS EKS with
Terraform**, and wires **Claude Code in agent mode** into the pipeline to
read these scan reports, triage findings by severity, and open a PR with
the fixes applied automatically.

## License

MIT — for educational use. See disclaimer above.
