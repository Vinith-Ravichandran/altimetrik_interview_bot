# AI Interview Preparation System

A full-stack AI-powered platform for mock interview practice, document ingestion, and question management.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.3 (Java 17) |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Database | H2 (dev) / PostgreSQL (prod) |
| LLM — Document extraction | OpenAI `gpt-4o-mini` |
| LLM — Interview evaluation | Anthropic Claude (`claude-haiku-4-5`) |
| Text extraction | Apache Tika 2.9 |
| PDF generation | iText 8 |

---

## Where Data Is Stored

### 1. User Accounts

**Table:** `public.app_users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Unique, indexed |
| `email` | VARCHAR(255) | Unique, indexed |
| `password_hash` | VARCHAR(255) | BCrypt-encoded |
| `role_name` | VARCHAR(255) | Optional role tag |
| `account_name` | VARCHAR(255) | Optional account tag |
| `admin` | BOOLEAN | Default `false` |
| `active` | BOOLEAN | Default `true` |
| `mock_count` | INT | Incremented on interview completion |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-set on update |

**Dev database file:** `backend/data/interviewdb.mv.db` (H2 file-based)

**How to inspect (dev):** Open `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/interviewdb;MODE=PostgreSQL`
- Username: `sa` / Password: *(empty)*

---

### 2. Accounts & Roles

**Tables:** `public.accounts`, `public.roles`

#### `accounts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Company/organisation name |
| `logo_url` | VARCHAR | Optional logo URL |

#### `roles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Role title (e.g. "Data Engineer") |
| `account_id` | UUID | FK → `accounts.id` |

Accounts and roles are created via the **Accounts & Roles** page (`/accounts-roles`) by admins.
Existing accounts can be edited (name, logo, add/remove roles) using the **Edit** button per account.

---

### 3. Interview Sessions

**Table:** `public.interview_sessions`

Stores every mock interview session: start time, completion time, overall score, overall feedback, and the list of questions with answers and evaluations.

Related tables: `public.questions`, `public.answers`, `public.evaluations`

Each session references `account_id` and `role_id` from the selection made before starting.

---

### 4. Uploaded File Records

**Table:** `interview_bot.files` (schema: `interview_bot`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Uploader reference |
| `file_name` | VARCHAR | Original filename |
| `file_path` | VARCHAR | Path on disk (temp, deleted after processing) |
| `uploaded_at` | TIMESTAMP | Upload timestamp |

Each file uploaded via the Documents page (`/documents`) creates one row here. The physical files are processed then deleted; only the metadata row persists.

---

### 5. Questions

Questions have **two storage locations**:

#### A. JSON Shadow File — machine-readable source of truth
**File:** `backend/data/master_questions.json`

```json
[
  { "question": "What is a clustered index?", "category": "SQL" },
  { "question": "What is the GIL?",           "category": "Python" }
]
```

Written atomically after every upload + deduplication pass. This is what the backend reads for `GET /api/v1/process/questions`.

#### B. Master PDF — human-readable output
**File:** `backend/data/master_questions.pdf`

Organised by category:
```
=== SQL ===
1. What is a clustered index?
2. Explain window functions.

=== Python ===
1. What is the GIL?
```

Regenerated on every upload from the JSON shadow. Not used for programmatic access.

#### C. Bot Questions DB Table
**Table:** `interview_bot.bot_questions`

Stores questions extracted via the Bot Interview pipeline (`POST /api/v1/bot/process/{fileId}`). Used to power live mock interview sessions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `content` | TEXT | Question text |
| `normalized_content` | VARCHAR | Deduplication key |
| `category` | VARCHAR | SQL, Python, Java, etc. |
| `company` | VARCHAR | Account/company tag |
| `role` | VARCHAR | Role tag |
| `difficulty` | VARCHAR | Easy / Medium / Hard |
| `created_at` | TIMESTAMP | |

---

## Category List

| Category | Description |
|----------|------------|
| `SQL` | SQL queries, joins, indexing, optimisation |
| `Python` | Core Python, OOP, GIL, data structures |
| `Java` | Java syntax, Spring, multithreading |
| `BigQuery` | GCP BigQuery, partitioning, clustering |
| `GCS` | Google Cloud Storage |
| `Others` | Anything not matching the above |

---

## API Reference

### Document Processing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/process/upload` | Public | Upload files, extract + categorise questions, update master PDF |
| `GET` | `/api/v1/process/questions` | Public | Read all questions from JSON shadow |
| `GET` | `/api/v1/process/files` | Public | List all uploaded file records |

### Interview Bot
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/bot/upload` | Public | Upload file for bot pipeline |
| `POST` | `/api/v1/bot/process/{fileId}` | Public | Extract questions, tag with company/role |
| `GET` | `/api/v1/bot/questions` | Public | List bot questions (filterable by company/role) |
| `POST` | `/api/v1/bot/interview/start` | Public | Start a mock interview session |
| `POST` | `/api/v1/bot/interview/answer` | Public | Submit an answer, get score + feedback |
| `POST` | `/api/v1/bot/interview/end` | Public | End session, get full report |

### Accounts & Roles
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/accounts` | Public | List all accounts with roles |
| `PATCH` | `/api/v1/accounts/{id}` | Admin | Update account name / logo URL |
| `POST` | `/api/v1/accounts/{id}/roles` | Admin | Add a new role to an existing account |
| `DELETE` | `/api/v1/accounts/{id}` | Admin | Delete account and all its roles |
| `DELETE` | `/api/v1/roles/{id}` | Admin | Delete a single role |
| `POST` | `/api/v1/admin/accounts-with-roles` | Admin | Create account + roles in one request |

### Auth & Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Register new user, returns JWT |
| `POST` | `/api/v1/auth/login` | Public | Login, returns JWT |
| `GET` | `/api/v1/users/me` | JWT | Current user profile |
| `GET` | `/api/v1/users` | JWT | List all users (admin only in practice) |
| `PATCH` | `/api/v1/users/{id}/promote` | JWT | Promote to admin |
| `PATCH` | `/api/v1/users/{id}/deactivate` | JWT | Deactivate user |
| `PATCH` | `/api/v1/users/{id}/activate` | JWT | Activate user |
| `DELETE` | `/api/v1/users/{id}` | JWT | Delete user (non-admins only) |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (upload) | OpenAI key for document question extraction |
| `CLAUDE_API_KEY` | Yes (interview) | Anthropic Claude key for interview evaluation |
| `JWT_SECRET` | Recommended | 32+ char secret for signing JWTs |
| `MASTER_PDF_PATH` | No | Override default `./data/master_questions.pdf` |
| `MASTER_JSON_PATH` | No | Override default `./data/master_questions.json` |

---

## Running Locally

```bash
# Backend
cd backend
export OPENAI_API_KEY=sk-proj-...
export CLAUDE_API_KEY=sk-ant-...
./mvnw spring-boot:run          # http://localhost:8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

H2 Console (dev): `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/interviewdb;MODE=PostgreSQL`
- Username: `sa`, Password: *(empty)*

---

## Data Flows

### Upload → Questions
```
User uploads files (PDF/DOCX/TXT)  →  POST /api/v1/process/upload
  │
  ├─ Apache Tika: extract text from each file
  ├─ Combine all text
  ├─ OpenAI: extract + categorise questions → [{ question, category }]
  ├─ Deduplicate:
  │   Level 1 — exact normalised match
  │   Level 2 — Jaccard similarity ≥ 0.75
  ├─ PdfService.mergeAndWrite():
  │   Read master_questions.json → merge → dedup again
  │   Write master_questions.json  (source of truth)
  │   Write master_questions.pdf   (human-readable)
  └─ Return { totalExtracted, totalUnique, questions[], files[] }
```

### Mock Interview
```
Select account + role  →  POST /bot/interview/start
  │  Load up to 10 questions from interview_bot.bot_questions
  │
Answer question  →  POST /bot/interview/answer
  │  Claude evaluates: score 0-10, feedback, next action
  │  FOLLOW_UP (depth ≤ 3)  or  NEXT_QUESTION
  │
End session  →  POST /bot/interview/end
  └─ Claude generates final report:
     overall_score, skill_level, strengths[], weaknesses[], category_analysis[]
```
