# Interview Prep Platform — Complete Setup & Usage Guide

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Quick Start (Dev Mode — H2)](#3-quick-start-dev-mode--h2)
4. [PostgreSQL Setup (Production Mode)](#4-postgresql-setup-production-mode)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [All API Endpoints](#6-all-api-endpoints)
7. [Frontend Pages & Features](#7-frontend-pages--features)
8. [Default Credentials](#8-default-credentials)
9. [AI Features Setup](#9-ai-features-setup)
10. [pgvector / Semantic Search Setup](#10-pgvector--semantic-search-setup)
11. [Role-Based Access Control](#11-role-based-access-control)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install these before anything else:

| Tool | Minimum Version | Download |
|------|----------------|---------|
| **Java JDK** | 17+ | https://adoptium.net (Temurin 17 LTS) |
| **Maven** | 3.8+ | https://maven.apache.org/download.cgi |
| **Node.js** | 18+ | https://nodejs.org (LTS version) |
| **PostgreSQL** *(prod only)* | 14+ | https://www.enterprisedb.com/downloads/postgres-postgresql-downloads |

Verify each installation:

```bash
java -version     # must show 17 or higher
mvn -version      # must show 3.8 or higher
node -version     # must show 18 or higher
psql --version    # only needed for production setup
```

---

## 2. Project Structure

```
New folder/
├── backend/                        ← Spring Boot (Java 17)
│   ├── src/main/java/com/interviewprep/
│   │   ├── api/                    ← REST controllers
│   │   │   ├── AccountController
│   │   │   ├── AdminController
│   │   │   ├── ChatController      ← NEW: chatbot
│   │   │   ├── DashboardController
│   │   │   ├── DocumentController
│   │   │   ├── InterviewController
│   │   │   ├── RealInterviewController
│   │   │   ├── RoleController
│   │   │   └── UserController      ← NEW: user management
│   │   ├── config/
│   │   │   ├── AdminKeyValidator
│   │   │   ├── PgVectorInitializer ← NEW: pgvector setup
│   │   │   ├── RestClientConfig
│   │   │   ├── StorageService      ← NEW: file storage
│   │   │   └── WebConfig           ← CORS
│   │   ├── domain/                 ← JPA entities (no Lombok)
│   │   │   ├── Account, Role
│   │   │   ├── AppUser             ← NEW
│   │   │   ├── Answer, Evaluation, Question
│   │   │   ├── ChatMessage, ChatSession ← NEW
│   │   │   ├── Document, DocumentChunk
│   │   │   ├── InterviewSession    ← updated: user FK added
│   │   │   └── RealInterviewLog, RealInterviewQuestion
│   │   ├── dto/Dtos.java           ← all request/response records
│   │   ├── repository/             ← Spring Data JPA interfaces
│   │   └── service/
│   │       ├── AccountService
│   │       ├── ChatbotService      ← NEW: intent detection + LLM
│   │       ├── ClassificationService
│   │       ├── ClaudeService
│   │       ├── DocumentService     ← updated: file save + embeddings
│   │       ├── EmbeddingService    ← NEW: Voyage AI
│   │       ├── ExportService
│   │       ├── InterviewService    ← fixed: getTechStack() bug
│   │       ├── RealInterviewService
│   │       ├── UserService         ← NEW
│   │       └── VectorSearchService ← updated: pgvector + fallback
│   └── src/main/resources/
│       ├── application.yml         ← dev config (H2 file-based)
│       └── application-prod.yml    ← prod config (PostgreSQL)
│
├── frontend/                       ← React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── api/client.ts           ← all API calls
│   │   ├── components/Layout.tsx   ← sidebar navigation
│   │   ├── context/AuthContext.tsx ← user auth (localStorage)
│   │   └── pages/
│   │       ├── Dashboard.tsx       ← admin analytics + user dashboard
│   │       ├── Documents.tsx       ← study material upload
│   │       ├── Interviews.tsx      ← mock interview selection
│   │       ├── InterviewSession.tsx← active interview
│   │       ├── Login.tsx
│   │       ├── AccountsRoles.tsx
│   │       └── RealInterviews.tsx  ← post interview form
│   └── .env                        ← VITE_API_BASE_URL, VITE_ADMIN_KEY
│
├── INSTRUCTIONS.md                 ← this file
├── implementation.md               ← database setup guide
├── plan.md                         ← architecture decisions
├── start-backend.bat               ← Windows one-click backend start
└── start-frontend.bat              ← Windows one-click frontend start
```

---

## 3. Quick Start (Dev Mode — H2)

No database installation needed. Data is saved to a local file and survives restarts.

### Step 1 — Start the backend

**Windows Command Prompt:**
```cmd
set CLAUDE_API_KEY=sk-ant-your-key-here

cd "C:\Users\admin\Documents\project\New folder\backend"
mvn spring-boot:run
```

**Or double-click:** `start-backend.bat` (sets a warning if key is missing, runs without it)

Backend starts at: **http://localhost:8080**

### Step 2 — Start the frontend

```cmd
cd "C:\Users\admin\Documents\project\New folder\frontend"
npm install
npm run dev
```

**Or double-click:** `start-frontend.bat`

Frontend starts at: **http://localhost:5173**

### Step 3 — Open the app

1. Go to http://localhost:5173
2. Log in with `admin` / `admin`
3. Add accounts and roles from the **Accounts & Roles** page
4. Add users from the **Dashboard**

> **H2 console** (view tables): http://localhost:8080/h2-console
> JDBC URL: `jdbc:h2:file:./data/interviewdb` · User: `sa` · Password: *(blank)*

---

## 4. PostgreSQL Setup (Production Mode)

### Install PostgreSQL

1. Download from https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Run installer — check: **PostgreSQL Server**, **pgAdmin 4**, **Command Line Tools**
3. Set a superuser password when prompted — **write it down**
4. Keep default port: `5432`

### Create the database

Open pgAdmin or SQL Shell:
```sql
CREATE DATABASE interviewprep;
```

### Start backend with PostgreSQL

**Windows Command Prompt:**
```cmd
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=interviewprep
set DB_USER=postgres
set DB_PASSWORD=YOUR_POSTGRES_PASSWORD
set CLAUDE_API_KEY=sk-ant-YOUR_KEY
set ADMIN_KEY=interview-admin-secret
set VOYAGE_API_KEY=your-voyage-key-here

cd "C:\Users\admin\Documents\project\New folder\backend"
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

**Windows PowerShell:**
```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="interviewprep"
$env:DB_USER="postgres"
$env:DB_PASSWORD="YOUR_POSTGRES_PASSWORD"
$env:CLAUDE_API_KEY="sk-ant-YOUR_KEY"
$env:ADMIN_KEY="interview-admin-secret"
$env:VOYAGE_API_KEY="your-voyage-key-here"

mvn spring-boot:run "-Dspring-boot.run.profiles=prod"
```

On first start, Hibernate auto-creates all tables, then `PgVectorInitializer` adds the vector column and HNSW index.

---

## 5. Environment Variables Reference

| Variable | Required? | Default | Purpose |
|----------|----------|---------|---------|
| `CLAUDE_API_KEY` | For AI features | *(empty)* | Mock interview questions, answer scoring, question classification |
| `VOYAGE_API_KEY` | For semantic search | *(empty)* | Embed documents with Voyage AI (voyage-large-2); falls back to keyword search |
| `DB_HOST` | Prod only | `localhost` | PostgreSQL host |
| `DB_PORT` | Prod only | `5432` | PostgreSQL port |
| `DB_NAME` | Prod only | `interviewprep` | Database name |
| `DB_USER` | Prod only | — | PostgreSQL username |
| `DB_PASSWORD` | Prod only | — | PostgreSQL password |
| `ADMIN_KEY` | Optional | `interview-admin-secret` | Secret header value for admin API calls |
| `STORAGE_PATH` | Optional | `./uploads` | Where uploaded files are saved on disk |
| `CLAUDE_MODEL` | Optional | `claude-opus-4-7` | Claude model ID |
| `VOYAGE_MODEL` | Optional | `voyage-large-2` | Voyage embedding model |
| `CORS_ORIGINS` | Prod only | `http://localhost:5173` | Comma-separated allowed frontend origins |

**Frontend `.env` file** (`frontend/.env`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend base URL |
| `VITE_ADMIN_KEY` | `interview-admin-secret` | Must match backend `ADMIN_KEY` |

---

## 6. All API Endpoints

Base URL: `http://localhost:8080/api/v1`

### Accounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/accounts` | Public | List all accounts with embedded roles |
| `DELETE` | `/accounts/{id}` | Admin | Delete account and its roles |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/admin/accounts-with-roles` | Admin | Create account + roles atomically |
| `GET` | `/admin/dashboard/summary` | Admin | KPI totals (users, mocks, avg score, top role) |
| `GET` | `/admin/dashboard/sessions-by-week` | Admin | Weekly session counts (last 8 weeks) |
| `GET` | `/admin/dashboard/users/performance` | Admin | Per-user performance stats for admin table |

### Roles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/roles` | Public | All roles (add `?accountId=` to filter) |
| `DELETE` | `/roles/{id}` | Admin | Delete role |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | Public | List all backend users |
| `GET` | `/users/{id}` | Public | Get user by ID |
| `GET` | `/users/{id}/stats` | Public | Mock count, avg score, highest score, last activity |
| `POST` | `/users` | Admin | Create user `{name, password, roleName, accountName, admin}` |
| `PATCH` | `/users/{id}` | Admin | Update `{roleName, accountName}` |
| `DELETE` | `/users/{id}` | Admin | Delete user |

### Study Material (Documents)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/documents` | Public | Upload file (multipart: `file`, `accountName?`, `roleName?`) |
| `GET` | `/documents` | Public | List all documents |
| `GET` | `/documents/{id}` | Public | Get document metadata |
| `DELETE` | `/documents/{id}` | Public | Delete document |
| `GET` | `/documents/{id}/export?format=pdf\|docx` | Public | Download as PDF or DOCX |

### Mock Interviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/interviews` | Public | Start session `{accountId, roleId, userId?}` |
| `GET` | `/interviews` | Public | List all sessions |
| `GET` | `/interviews/{id}` | Public | Get full session (questions + answers + evaluations) |
| `POST` | `/interviews/{id}/next-question` | Public | Generate next AI question |
| `POST` | `/interviews/questions/{id}/answer` | Public | Submit answer → AI evaluation |
| `POST` | `/interviews/{id}/finish` | Public | Complete session, get overall score + feedback |

### Post Interview (Real Interview Logs)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/real-interviews` | Public | Log interview `{accountId, panelistName, questions[]}` → AI classifies questions |
| `GET` | `/real-interviews` | Public | List all logs |

### Chatbot

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/chat` | Public | Send message `{sessionId?, userId?, message}` → `{reply, intent, sources[], sessionId}` |

---

> **Admin authentication**: Protected endpoints require header `X-Admin-Key: interview-admin-secret`
> (or whatever value `ADMIN_KEY` env var is set to).
>
> The frontend sets this header automatically when an admin user is logged in.

---

## 7. Frontend Pages & Features

| Page | Route | Who can access | What it does |
|------|-------|---------------|-------------|
| **Login** | `/login` | Everyone | Username + password login |
| **Dashboard** | `/` | Admin + Users | Admin: analytics, charts, user table. User: personal KPIs, score trend, skills, recent sessions |
| **Study Material** | `/documents` | Everyone | Upload docs (any format → converted), tag with account/role, download as PDF |
| **Mock Interviews** | `/interviews` | Users only | Select account + role + experience → start AI interview |
| **Interview Session** | `/interviews/:id` | Users only | Answer questions, see real-time AI evaluation scores |
| **Post Interview** | `/real-interviews` | Users only | Log real interview details and questions → AI classifies them |
| **Accounts & Roles** | `/accounts-roles` | Admin only | Manage accounts (with logos) and roles |

---

## 8. Default Credentials

### Frontend (localStorage-based auth)

| Account | Username | Password | Access |
|---------|----------|----------|--------|
| Built-in admin | `admin` | `admin` | Full admin dashboard, all pages |
| Any user added by admin | their exact name | `password` | User dashboard, mock interviews, post interview |
| Admin added by admin | their exact name | `admin` | Full admin access |

### Backend users API

Users created via `POST /api/v1/users` are stored in the database (`app_users` table).
These are separate from the frontend localStorage users.

---

## 9. AI Features Setup

### Claude API (Mock Interviews + Answer Scoring + Classification)

1. Go to https://console.anthropic.com
2. Create an API key
3. Set `CLAUDE_API_KEY=sk-ant-...` before starting the backend

**What breaks without it:**
- Mock interview questions → returns placeholder text `[Claude API not configured]`
- Answer evaluation → scores all return 0
- Question classification → returns default `{domain: "general", difficulty: "medium"}`
- Document categorization → category stays `"General"`, tags empty

**What still works without it:**
- All CRUD operations (accounts, roles, users, documents)
- File upload and text extraction
- Export to PDF/DOCX
- All frontend UI

---

### Voyage AI (Semantic Document Search)

1. Go to https://dash.voyageai.com
2. Create an account and get an API key (free tier available)
3. Set `VOYAGE_API_KEY=pa-...` before starting the backend

**What happens with Voyage AI:**
- Uploaded documents are embedded with `voyage-large-2` (1536 dimensions)
- Mock interview questions use **semantic search** to find relevant study material context
- Chatbot uses vector similarity to find relevant chunks

**What happens without Voyage AI:**
- Falls back to **keyword LIKE search** automatically (no errors, just less accurate)

---

## 10. pgvector / Semantic Search Setup

pgvector is only active in **production mode** (PostgreSQL).

### What happens automatically on first start (prod profile):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_chunk_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

These are all idempotent — safe to re-run.

### How it works:

```
Upload doc → Extract text (Tika) → Chunk (1500 chars) → Save chunks
                                                              ↓ (async)
                                              Voyage AI → 1536-dim vector
                                                              ↓
                                              Store in document_chunks.embedding
                                                              ↓
Mock interview / Chatbot → Embed query → pgvector cosine search → Top 5 chunks
```

### Similarity search query used:

```sql
SELECT id FROM document_chunks
WHERE embedding IS NOT NULL
ORDER BY embedding <-> CAST(? AS vector)
LIMIT 5
```

---

## 11. Role-Based Access Control

### Frontend (localStorage)

- Admin users see: Dashboard analytics, Accounts & Roles management, Study Material
- Regular users see: Dashboard (personal), Study Material, Mock Interviews, Post Interview

### Backend (API key)

All write operations that create or delete data require the header:

```
X-Admin-Key: interview-admin-secret
```

Protected endpoints:
- `POST /admin/accounts-with-roles`
- `DELETE /accounts/{id}`
- `DELETE /roles/{id}`
- `POST /users`, `PATCH /users/{id}`, `DELETE /users/{id}`
- `GET /admin/dashboard/*`

The frontend automatically adds this header when an admin is logged in via `setAdminMode(true)` in `api/client.ts`.

To change the admin key, set:
- Backend: `ADMIN_KEY=your-secret`
- Frontend: `VITE_ADMIN_KEY=your-secret` in `frontend/.env`

---

## 12. Troubleshooting

### Backend won't start

| Error | Fix |
|-------|-----|
| `JAVA_HOME not set` | Set `JAVA_HOME` to your JDK 17+ directory |
| `Port 8080 already in use` | Add `server.port=8081` to `application.yml`; update `VITE_API_BASE_URL` in `.env` |
| `Connection refused to PostgreSQL` | Make sure PostgreSQL service is running; check port 5432 |
| `password authentication failed` | Wrong `DB_PASSWORD` — check the password you set during PostgreSQL install |
| `database "interviewprep" does not exist` | Run `CREATE DATABASE interviewprep;` in pgAdmin |
| `TypeTag::UNKNOWN` (Lombok) | Lombok incompatible with Java 25 — already fixed by removing Lombok from entities |

### Frontend issues

| Error | Fix |
|-------|-----|
| Blank page or login loop | Clear localStorage (DevTools → Application → Storage → Clear) |
| Account dropdown empty | Backend not running or backend URL wrong in `.env` |
| `admin` / `admin` login fails | Clear `localStorage` — old data may have wrong password hash |
| CORS error in console | Add frontend URL to `app.cors.allowed-origins` in `application.yml` |

### AI features not working

| Symptom | Fix |
|---------|-----|
| Questions show `[Claude API not configured]` | Set `CLAUDE_API_KEY` env var before starting backend |
| All scores return 0 | Same — Claude key missing |
| Semantic search not working | `VOYAGE_API_KEY` not set — keyword search is used instead (not an error) |
| pgvector extension error on startup | PostgreSQL version too old (need 14+) or pgvector not installed |

### H2 console access

Go to: http://localhost:8080/h2-console

```
JDBC URL:   jdbc:h2:file:./data/interviewdb
User:       sa
Password:   (leave blank)
```

---

## Summary: Minimum Setup to Run Everything

```
1. Install Java 17+ and Node.js 18+
2. Get a Claude API key from console.anthropic.com
3. Set CLAUDE_API_KEY environment variable
4. cd backend && mvn spring-boot:run
5. cd frontend && npm install && npm run dev
6. Open http://localhost:5173
7. Login: admin / admin
```

**Everything else (PostgreSQL, Voyage AI) is optional and has fallbacks.**
