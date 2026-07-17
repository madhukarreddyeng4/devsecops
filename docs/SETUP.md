# Setup Guide

Commands shown on screen for installing each pipeline tool. Tested on
Ubuntu 22.04/24.04 and Amazon Linux 2023.

## Gitleaks (secrets scanning)
```bash
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh \
  | sh -s -- -b /usr/local/bin
gitleaks version
```

## SonarQube (SAST)

Unlike a plain CLI, SonarQube analysis has two parts: a **server** that stores
and displays results, and a **scanner** that runs in the pipeline and uploads
findings to it.

### 1. Run a SonarQube server (self-hosted, via Docker)
```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:community
# Wait ~1 min, then open http://<host>:9000  (default login: admin / admin)
```
On first login you'll be forced to change the password. Then create a
project with key `vulnshop`, and generate an analysis token for it under
**Project → Administration → Analysis Method**, or under
My Account → Security → **Generate Token** (choose **Project Analysis
Token**, scoped to the `vulnshop` project). That token becomes
`SONAR_TOKEN` below.

> **If your pipeline fails with `You're not authorized to run analysis`,**
> this is an auth problem, not a code problem — the scan ran but the upload
> was rejected. Check, in order: (1) the `SONAR_TOKEN` secret exists and
> isn't empty; (2) it's a **Project Analysis Token** for `vulnshop` (or a
> Global Analysis Token), not a plain user token on an account without
> analysis rights; (3) under Project → Administration → Permissions, the
> token's identity has the **Execute Analysis** permission. That last one is
> the most common cause of this exact error.

> SonarQube Cloud (https://sonarcloud.io) is a hosted alternative — free for
> public repos — if you'd rather not run a server. In that case you only need
> `SONAR_TOKEN`; the host URL defaults to the cloud endpoint.

### 2. Install the scanner CLI (for local runs)
```bash
# Requires Java 17+ on the machine running the scanner
curl -sSLo /tmp/sonar-scanner.zip \
  https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.2.1.4610-linux-x64.zip
unzip -q /tmp/sonar-scanner.zip -d /opt
sudo ln -sf /opt/sonar-scanner-*/bin/sonar-scanner /usr/local/bin/sonar-scanner
sonar-scanner --version
```
Then run an analysis from the repo root (reads `sonar-project.properties`):
```bash
export SONAR_TOKEN=<your-token>
export SONAR_HOST_URL=http://localhost:9000
sonar-scanner
```

## Trivy (SCA + container image scan)
```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
  | sh -s -- -b /usr/local/bin
trivy --version
```

## Checkov (IaC scan)
```bash
python3 -m pip install checkov
checkov --version
```

## OWASP ZAP (DAST)
Run via Docker — no local install needed:
```bash
docker pull owasp/zap2docker-stable
```

## Jenkins agent prerequisites
If running the Jenkinsfile on a self-hosted Jenkins agent, also install:
```bash
sudo apt-get update
sudo apt-get install -y docker.io git
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```
For the SonarQube stage, in Jenkins:
- Install the **SonarQube Scanner** plugin.
- Under Manage Jenkins → Tools, add a **SonarScanner** installation named
  `SonarScanner` (matches `tool 'SonarScanner'` in the Jenkinsfile).
- Under Manage Jenkins → System → **SonarQube servers**, add a server named
  `SonarQube` with your server URL and the analysis token as its credential.

And configure these Jenkins credentials (used in `jenkins/Jenkinsfile`):
- `ec2-host` — Secret text credential with your EC2 host/IP
- `ec2-ssh-key` — SSH Username with private key credential for deploy
- `ec2-repo-url` — Secret text credential with your repo's clone URL
  (e.g. `https://github.com/<you>/devsecops.git`)

## GitHub Actions secrets
For the GitHub Actions workflow (`.github/workflows/devsecops-pipeline.yml`),
add these repository secrets under Settings → Secrets and variables → Actions:
- `SONAR_TOKEN` — SonarQube analysis token
- `SONAR_HOST_URL` — your SonarQube server URL (omit for SonarQube Cloud)
- `EC2_HOST`
- `EC2_USERNAME` (typically `ec2-user`)
- `EC2_SSH_KEY` (private key, PEM format)
- `EC2_REPO_URL` — your repo's clone URL, e.g. `https://github.com/<you>/devsecops.git`

### First deploy: the repo is cloned automatically
The deploy stage clones the repo into `/opt/vulnshop` on first run and does a
`git pull` on every run after that — so a fresh EC2 instance works with no
manual setup, as long as `EC2_REPO_URL` is set. If you saw
`fatal: not a git repository` or `no configuration file provided`, it means
`/opt/vulnshop` didn't yet contain a clone; the updated deploy script fixes
that. For a **private** repo, the clone URL needs credentials the instance can
use (a deploy key, or a token embedded in the URL) — for a public repo the
plain HTTPS URL is enough.

### DAST stage: "Resource not accessible by integration"
If the ZAP (stage 7) run finishes scanning but then fails with
`Resource not accessible by integration` on a `POST .../issues` call, ZAP was
trying to file its findings as a **GitHub Issue** and the workflow token
lacked permission. The default `GITHUB_TOKEN` is read-only. The workflow now
grants the DAST job `issues: write`, which fixes it. Two things to know:

- **Re-run first** — the job-level `permissions:` block is usually enough on
  its own, regardless of the read-only *default*.
- **If it still fails**, an admin may have hard-restricted the token under
  Settings → Actions → General → **Workflow permissions**. Job-level grants
  can't exceed the repo maximum. You don't need to switch the whole repo to
  "Read and write" — just ensure issue creation isn't blocked there.
- **Fork PRs always get a read-only token** (a GitHub security rule), so
  ZAP issue-writing can't work from a forked pull request. Pushing to `main`
  on your own repo is unaffected.
- Prefer no issues at all? Set `allow_issue_writing: false` on the ZAP step
  and rely on the uploaded `report_html.html` artifact instead.

### DAST stage: "The artifact name zap_scan is not valid"
If ZAP scans successfully but then fails on artifact upload with
`Create Artifact Container failed: The artifact name zap_scan is not valid`
(note the URL ending in `artifacts?api-version=6.0-preview`), the ZAP action
version is bundling a **deprecated upload-artifact backend** that GitHub has
retired. Fix: pin a current action version — `zaproxy/action-baseline@v0.15.0`
or newer, which updates that dependency. The workflow here already does this.
Don't add a separate `actions/upload-artifact` step for the ZAP report — the
action uploads it itself (name it via `artifact_name:`).
