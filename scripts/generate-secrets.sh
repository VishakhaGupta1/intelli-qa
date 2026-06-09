#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  echo "Refusing to overwrite existing .env"
  exit 1
fi

jwt_secret=$(openssl rand -hex 32)
client_secret=$(openssl rand -hex 32)
mongo_password=$(openssl rand -hex 32)
mongo_root_password=$(openssl rand -hex 32)
grafana_admin_password=$(openssl rand -hex 32)

cat > .env <<EOF
# Claude AI (prefer Grok by default)
GROK_API_KEY=
GROK_URL=https://api.grok.ai/v1/generate
ANTHROPIC_API_KEY=

# MongoDB
MONGO_URI=
MONGO_DB_NAME=qa_platform
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_AUTH_SOURCE=qa_platform
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=${mongo_root_password}
MONGO_USERNAME=qa_platform_app
MONGO_PASSWORD=${mongo_password}

# Application under test
BASE_URL=https://petstore.swagger.io/v2

# Dashboard API
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=${jwt_secret}
CLIENT_SECRET=${client_secret}
GRAFANA_ADMIN_PASSWORD=${grafana_admin_password}
JWT_EXPIRES_IN=1h
METRICS_ALLOWED_SUBNETS=127.0.0.1,::1,172.16.0.0/12

# MongoDB pooling/timeouts
MONGO_MAX_POOL_SIZE=20
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_CONNECT_TIMEOUT_MS=5000

# React app API base URL
VITE_API_BASE_URL=http://localhost:3001/api

# CI flag (set to true in CI environments)
HEADLESS=true

# Use mock AI responses (for local development without an API key)
USE_MOCK=true

# Allow falling back to mock AI output when no LLM provider is configured
ALLOW_MOCK_FALLBACK=true

# Selenium remote endpoint for browser-pinned CI / dockerized runs
SELENIUM_REMOTE_URL=http://127.0.0.1:4444/wd/hub

# Backups
BACKUP_DIR=/backups
EOF

cat <<EOF
Generated secrets checklist:
- JWT_SECRET
- CLIENT_SECRET
- MONGO_PASSWORD
- MONGO_INITDB_ROOT_PASSWORD
- GRAFANA_ADMIN_PASSWORD

Next steps:
1. Review .env before use.
2. Keep .env out of git.
3. Add the same secret values to your GitHub Environments.
EOF