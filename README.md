# IntelliQA: AI-Driven Quality Intelligence Platform

IntelliQA is a modular, AI-powered QA ecosystem designed to automate the transition from API specifications to executable test suites. By leveraging Large Language Models (LLMs), it generates robust Java test cases, executes them against target applications, and provides a real-time intelligence dashboard for quality metrics and defect tracking.

## 🚀 System Overview

The platform is structured into four specialized layers:

1.  **AI Generator (Python)**: Parses OpenAPI/Swagger specifications and uses LLMs (Grok/Claude) to generate context-aware Java test cases. Includes PII redaction to ensure data privacy.
2.  **Test Engine (Java)**: A JUnit 5 based execution environment using REST Assured for API validation and Selenium for UI automation. Results are automatically persisted to MongoDB.
3.  **Quality API (Node.js)**: A secure Express backend that aggregates test results, calculates coverage gaps, and serves metrics via a RESTful API and Prometheus endpoints.
4.  **Intelligence Dashboard (React)**: A modern Vite-powered frontend providing visual insights into pass rates, flakiness, defect heatmaps, and AI-driven coverage gap analysis.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Docker & Docker Compose**
- **Java 17+** & **Maven**
- **Python 3.11+**
- **Node.js 20+**

### 1. Environment Configuration
Initialize your environment variables:
```bash
# On Linux/macOS:
bash scripts/generate-secrets.sh
# On Windows:
cp .env.example .env # Then manually fill in keys
```

### 2. Infrastructure Deployment
Spin up the required services (MongoDB, Selenium, Prometheus, Grafana, and the APIs):
```bash
docker-compose up -d --build
```

### 3. Test Generation & Execution
Generate tests from a specification and run the suite:
```bash
# Generate Java tests from spec
python ai-generator/main.py --spec ai-generator/specs/sample-api.yaml

# Run the generated suite
mvn -f test-engine/pom.xml test
```

### 4. Access the Dashboard
```bash
cd dashboard-ui
npm install
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173) to view the quality metrics.

---

## 📂 Project Structure

```text
├── ai-generator/       # AI test generation engine (Python)
├── test-engine/        # Java execution environment (JUnit 5, Selenium)
├── dashboard-api/      # Backend service for metrics (Node.js, Express)
├── dashboard-ui/       # Quality intelligence frontend (React, Vite)
├── sample-api/         # Mock application for demonstration
├── monitoring/         # Prometheus & Grafana configurations
└── scripts/            # Utility scripts for seeding and secrets
```

---

## 🔒 Security & Privacy
- **PII Redaction**: The generator automatically redacts sensitive fields (passwords, tokens, emails) from prompts before sending them to LLM providers.
- **JWT Authentication**: The Dashboard API is protected by JWT-based authentication.
- **Mock Fallback**: Supports a `USE_MOCK` mode for local development without requiring live AI API keys.

---
