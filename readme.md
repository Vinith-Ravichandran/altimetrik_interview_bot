# Interview Prep Platform

An AI-powered interview preparation platform that ingests knowledge from multiple document formats, builds a single source of truth, and runs role- and account-specific mock interviews with automated scoring and feedback.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Backend Setup (Spring Boot)](#backend-setup-spring-boot)
8. [Frontend Setup (React)](#frontend-setup-react)
9. [Environment Variables](#environment-variables)
10. [Data Model](#data-model)
11. [REST API](#rest-api)
12. [Key Workflows](#key-workflows)
13. [Question Classification](#question-classification)
14. [Testing](#testing)
15. [Roadmap](#roadmap)

---

## Overview

The platform helps candidates prepare for client interviews by:

- **Ingesting** PDFs, Word (`.docx`), legacy Word (`.doc`), and text files into a unified knowledge base.
- **Exporting** that knowledge back in any supported format on demand (e.g., PDF, DOCX).
- **Running mock interviews** tailored to a candidate's role and the target account's tech stack.
- **Evaluating answers** on clarity, depth, and quality using the Claude API.
- **Capturing real interview questions** after live panels, feeding them back into the knowledge base.
- **Auto-classifying questions** by role, technology, and sub-service (e.g., `GCP → BigQuery`).

---

## Core Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Multi-format ingestion | Upload PDF / DOC / DOCX / TXT; text extracted via Apache Tika |
| 2 | Single source of truth | Canonical content stored in PostgreSQL with vector embeddings in FAISS |
| 3 | Format export | Regenerate stored content as PDF (iText) or DOCX (Apache POI) |
| 4 | Account & role registry | Maintain accounts, their tooling, and target roles |
| 5 | AI interview bot | Claude-driven question generation grounded in the knowledge base |
| 6 | Answer evaluation | Score per answer + strengths / improvement summary |
| 7 | Real-interview capture | Post-interview form to log panelist, account, and asked questions |
| 8 | Auto-classification | Tags questions by domain → service (e.g., `GCP → Cloud Functions`) |

---

## Architecture

```
┌──────────────┐      REST       ┌───────────────────────┐
│   React UI   │ ───────────────▶│   Spring Boot API     │
│ (chat + dash)│ ◀───────────────│   (controllers/svc)   │
└──────────────┘                 └──────────┬────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
             ┌────────────┐          ┌────────────┐          ┌────────────┐
             │ PostgreSQL │          │   FAISS    │          │ Claude API │
             │ (truth DB) │          │ (vectors)  │          │   (LLM)    │
             └────────────┘          └────────────┘          └────────────┘
                    ▲
                    │
             ┌────────────┐
             │Apache Tika │  ← text extraction on upload
             └────────────┘
```

---

## Tech Stack

**Backend**
- Java 17, Spring Boot 3.x
- Spring Web (REST), Spring Data JPA, Spring Security (JWT)
- Apache Tika (text extraction)
- iText 7 (PDF generation), Apache POI (DOCX)
- Flyway (DB migrations)

**Frontend**
- React 18 + Vite
- React Router, TanStack Query
- Tailwind CSS + shadcn/ui
- Axios

**AI & Data**
- Claude API (`claude-opus-4-7` / `claude-sonnet-4-6`)
- PostgreSQL 15
- FAISS (via `faiss-cpu` sidecar service or `jfaiss` bindings)

**Dev & Ops**
- Docker + docker-compose (local stack)
- Maven (backend), npm (frontend)
- JUnit 5, Mockito, Testcontainers (backend); Vitest + React Testing Library (frontend)

---

## Project Structure

```
.
├── backend/                    # Spring Boot app
│   ├── src/main/java/com/interviewprep
│   │   ├── api/                # REST controllers
│   │   ├── service/            # Business logic (ingest, interview, scoring)
│   │   ├── ai/                 # Claude client + prompt templates
│   │   ├── vector/             # FAISS client wrapper
│   │   ├── domain/             # JPA entities
│   │   ├── repository/         # Spring Data repositories
│   │   ├── export/             # PDF/DOCX generators
│   │   └── config/             # Security, CORS, beans
│   ├── src/main/resources
│   │   ├── application.yml
│   │   └── db/migration/       # Flyway SQL
│   └── pom.xml
│
├── frontend/                   # React app
│   ├── src
│   │   ├── pages/              # Dashboard, Interview, Upload, History
│   │   ├── components/         # Chat UI, question cards, score panels
│   │   ├── api/                # Axios client + hooks
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── index.html
│   └── package.json
│
├── docker-compose.yml          # Postgres + FAISS sidecar
└── readme.md
```

---

## Prerequisites

- **Java 17+** — install from [adoptium.net](https://adoptium.net)
- **Maven 3.9+** — install from [maven.apache.org](https://maven.apache.org/download.cgi) or via Chocolatey: `choco install maven`
- **Node.js 20+ and npm 10+** — install from [nodejs.org](https://nodejs.org)
- A Claude API key from [console.anthropic.com](https://console.anthropic.com) (optional — app runs without it, but interview/classification calls will return stub responses)
- Docker Desktop *(only if you want Postgres instead of the default in-memory H2)*

---

## Backend Setup (Spring Boot)

The backend uses an **in-memory H2 database** by default — no Postgres setup required.

```bash
cd backend

# Optional: set your Claude API key
#   PowerShell:  $env:CLAUDE_API_KEY="sk-ant-..."
#   bash:        export CLAUDE_API_KEY=sk-ant-...

mvn spring-boot:run
```

- API: `http://localhost:8080/api/v1/...`
- H2 console: `http://localhost:8080/h2-console`
  (JDBC URL: `jdbc:h2:mem:interview`, user `sa`, no password)

If `CLAUDE_API_KEY` is not set, interview/classification endpoints return stub text instead of LLM output — everything else still works.

---

## Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`. It expects the backend on `http://localhost:8080` (override via `frontend/.env` → `VITE_API_BASE_URL`).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/interview` | Postgres JDBC URL |
| `DB_USER` | `interview` | DB username |
| `DB_PASSWORD` | `interview` | DB password |
| `CLAUDE_API_KEY` | `sk-ant-...` | Claude API key |
| `CLAUDE_MODEL` | `claude-opus-4-7` | Model ID |
| `FAISS_HOST` | `localhost:6333` | FAISS sidecar endpoint |
| `JWT_SECRET` | `change-me` | Signing key for auth tokens |

### Frontend (`frontend/.env`)

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8080` |

---

## Data Model

Simplified ERD:

```
User ──┬── InterviewSession ── Question ── Answer ── Evaluation
       │
       └── RealInterviewLog
Account ── TechnologyStack
Document ── DocumentChunk (vector_id → FAISS)
QuestionTag (domain, service)
```

Key tables:

- `documents` — uploaded source files (metadata + extracted text)
- `document_chunks` — chunked text with FAISS vector IDs
- `accounts` — client accounts + their tool stacks
- `roles` — target roles (e.g., Data Engineer, Cloud Architect)
- `interview_sessions` — one per mock interview
- `questions` / `answers` / `evaluations`
- `real_interview_logs` — panelist-captured questions
- `question_tags` — `(domain, service)` e.g., `('GCP', 'BigQuery')`

---

## REST API

Base path: `/api/v1`

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/documents` | Upload a file (multipart) |
| GET    | `/documents` | List documents |
| GET    | `/documents/{id}/export?format=pdf\|docx` | Export content |

### Accounts & Roles
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/accounts` | List / create accounts |
| PUT    | `/accounts/{id}/stack` | Update tech stack |
| GET    | `/roles` | List supported roles |

### Interviews
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/interviews` | Start session `{roleId, accountId}` |
| POST   | `/interviews/{id}/answers` | Submit an answer (streamed) |
| GET    | `/interviews/{id}/report` | Final score + feedback |

### Real Interview Capture
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/real-interviews` | Log `{accountId, panelist, questions[]}` |

---

## Key Workflows

### 1. Document Ingestion
```
User upload → POST /documents
  → Tika extracts text
  → Chunk + persist to document_chunks
  → Generate embeddings (Claude / local model)
  → Index in FAISS
```

### 2. Format Export
```
GET /documents/{id}/export?format=pdf
  → Fetch canonical text
  → iText renders PDF (or POI for DOCX)
  → Stream file response
```

### 3. Mock Interview
```
POST /interviews {roleId, accountId}
  → Resolve account tech stack
  → Vector-search relevant chunks
  → Claude generates N questions grounded in retrieved context
  → User answers via chat (WebSocket or SSE)
  → Claude evaluates each answer (clarity / depth / quality)
  → Persist score + feedback
  → GET /interviews/{id}/report returns strengths & gaps
```

### 4. Real Interview Capture
```
POST /real-interviews
  → Persist raw log
  → Auto-classify each question (see below)
  → Create QuestionTag rows
  → Feed into knowledge base for future mocks
```

---

## Question Classification

Each captured question is sent to Claude with a taxonomy prompt that returns:

```json
{
  "domain": "GCP",
  "service": "BigQuery",
  "difficulty": "medium",
  "role_fit": ["Data Engineer", "Analytics Engineer"]
}
```

Taxonomy is stored in `question_tags` and drives:

- Filtering in the dashboard
- Stack-aware question retrieval during mock interviews
- Analytics (e.g., "70% of questions for Account X are GCP-related")

---

## Testing

**Backend**
```bash
cd backend
./mvnw test
```
- Unit: service + domain logic (JUnit 5, Mockito)
- Integration: repository + API layer (Testcontainers for Postgres)

**Frontend**
```bash
cd frontend
npm run test
```
- Component tests (Vitest + React Testing Library)
- API hook tests with MSW

---

## Roadmap

- [ ] M1 — Document ingestion + export (PDF/DOCX)
- [ ] M2 — Accounts, roles, tech-stack registry
- [ ] M3 — Claude-powered mock interview (chat + scoring)
- [ ] M4 — Real-interview capture + auto-classification
- [ ] M5 — Dashboard analytics (per account / per domain)
- [ ] M6 — Multi-user org support + role-based access
- [ ] M7 — Voice-mode interviews (speech-to-text + TTS)

---

## License

Internal project — license TBD.
