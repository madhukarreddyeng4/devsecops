#!/bin/bash
# Bootstrap script for the VulnShop demo EC2 host.
# Installs Docker + Docker Compose and clones the app repo.

set -euo pipefail

dnf update -y
dnf install -y docker git

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

mkdir -p /opt/vulnshop
# In the recorded demo: git clone <your-repo-url> /opt/vulnshop
echo "Bootstrap complete. Clone your repo into /opt/vulnshop and run docker compose up -d --build" \
  > /opt/vulnshop/README_DEPLOY.txt
