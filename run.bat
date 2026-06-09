@echo off
echo ==========================================
echo    IntelliQA Unified Startup Script
echo ==========================================

echo [1/4] Starting Infrastructure (Docker)...
docker-compose up -d --build

echo [2/4] Generating AI Tests (Python)...
python ai-generator/main.py --spec ai-generator/specs/sample-api.yaml

echo [3/4] Executing Test Suite (Maven)...
mvn -f test-engine/pom.xml test

echo [4/4] Launching Dashboard (Vite)...
cd dashboard-ui
npm install && npm run dev -- --port 5173 --host 127.0.0.1
