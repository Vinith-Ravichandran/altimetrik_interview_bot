# PostgreSQL Migration Guide

## What Changed

| Before | After |
|--------|-------|
| H2 embedded (file-based, dev only) | PostgreSQL |
| `backend/data/interviewdb.mv.db` | PostgreSQL server |
| `jdbc:h2:file:./data/interviewdb` | `jdbc:postgresql://localhost:5432/interviewprep` |
| H2 console at `/h2-console` | pgAdmin or `psql` |

---

## Step 1 — Install & Start PostgreSQL

Download from https://www.postgresql.org/download/ (version 15 or 16 recommended).

After install, verify it's running:
```bash
psql --version
# PostgreSQL 16.x
```

---

## Step 2 — Create the Database

Connect as the postgres superuser and run:

```sql
-- Connect as postgres
psql -U postgres

-- Create the application database
CREATE DATABASE interviewprep;

-- Create a dedicated app user (recommended for production)
CREATE USER interviewapp WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE interviewprep TO interviewapp;

-- Connect to the new database
\c interviewprep

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO interviewapp;
```

---

## Step 3 — Run the CREATE TABLE Statements

Connect to the `interviewprep` database and execute the SQL below **in order**.

```sql
\c interviewprep
```

### Extension

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

### Schema: `public`

#### accounts
```sql
CREATE TABLE IF NOT EXISTS public.accounts (
    id       UUID         NOT NULL DEFAULT gen_random_uuid(),
    name     VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    CONSTRAINT pk_accounts      PRIMARY KEY (id),
    CONSTRAINT uq_accounts_name UNIQUE (name)
);
```

#### roles
```sql
CREATE TABLE IF NOT EXISTS public.roles (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    account_id UUID,
    CONSTRAINT pk_roles         PRIMARY KEY (id),
    CONSTRAINT fk_roles_account FOREIGN KEY (account_id)
        REFERENCES public.accounts (id) ON DELETE CASCADE
);
```

#### app_users
```sql
CREATE TABLE IF NOT EXISTS public.app_users (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role_name     VARCHAR(255),
    account_name  VARCHAR(255),
    admin         BOOLEAN      NOT NULL DEFAULT FALSE,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    mock_count    INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_app_users   PRIMARY KEY (id),
    CONSTRAINT uq_users_name  UNIQUE (name),
    CONSTRAINT uq_users_email UNIQUE (email)
);
```

#### interview_sessions
```sql
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id               UUID             NOT NULL DEFAULT gen_random_uuid(),
    account_id       UUID,
    role_id          UUID,
    user_id          UUID,
    started_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    overall_score    DOUBLE PRECISION,
    overall_feedback VARCHAR(4000),
    CONSTRAINT pk_interview_sessions  PRIMARY KEY (id),
    CONSTRAINT fk_sessions_account    FOREIGN KEY (account_id)
        REFERENCES public.accounts   (id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_role       FOREIGN KEY (role_id)
        REFERENCES public.roles      (id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_user       FOREIGN KEY (user_id)
        REFERENCES public.app_users  (id) ON DELETE SET NULL
);
```

#### questions
```sql
CREATE TABLE IF NOT EXISTS public.questions (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    session_id  UUID    NOT NULL,
    order_index INTEGER NOT NULL,
    text        TEXT    NOT NULL,
    CONSTRAINT pk_questions         PRIMARY KEY (id),
    CONSTRAINT fk_questions_session FOREIGN KEY (session_id)
        REFERENCES public.interview_sessions (id) ON DELETE CASCADE
);
```

#### answers
```sql
CREATE TABLE IF NOT EXISTS public.answers (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    question_id  UUID        NOT NULL,
    text         TEXT        NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_answers          PRIMARY KEY (id),
    CONSTRAINT uq_answers_question UNIQUE (question_id),
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id)
        REFERENCES public.questions (id) ON DELETE CASCADE
);
```

#### evaluations
```sql
CREATE TABLE IF NOT EXISTS public.evaluations (
    id           UUID             NOT NULL DEFAULT gen_random_uuid(),
    answer_id    UUID             NOT NULL,
    clarity      DOUBLE PRECISION,
    depth        DOUBLE PRECISION,
    quality      DOUBLE PRECISION,
    overall      DOUBLE PRECISION,
    strengths    VARCHAR(2000),
    improvements VARCHAR(2000),
    CONSTRAINT pk_evaluations        PRIMARY KEY (id),
    CONSTRAINT uq_evaluations_answer UNIQUE (answer_id),
    CONSTRAINT fk_evaluations_answer FOREIGN KEY (answer_id)
        REFERENCES public.answers (id) ON DELETE CASCADE
);
```

#### documents
```sql
CREATE TABLE IF NOT EXISTS public.documents (
    id             UUID         NOT NULL DEFAULT gen_random_uuid(),
    filename       VARCHAR(255) NOT NULL,
    content_type   VARCHAR(255) NOT NULL,
    size_bytes     BIGINT,
    file_path      VARCHAR(1000),
    account_name   VARCHAR(255),
    role_name      VARCHAR(255),
    category       VARCHAR(255),
    tags           VARCHAR(1000),
    extracted_text TEXT,
    uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_documents PRIMARY KEY (id)
);
```

#### document_chunks
```sql
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    document_id UUID    NOT NULL,
    chunk_index INTEGER,
    text        TEXT    NOT NULL,
    CONSTRAINT pk_document_chunks    PRIMARY KEY (id),
    CONSTRAINT fk_chunks_document    FOREIGN KEY (document_id)
        REFERENCES public.documents (id) ON DELETE CASCADE
);
```

#### chat_sessions
```sql
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    CONSTRAINT pk_chat_sessions      PRIMARY KEY (id),
    CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (id) ON DELETE SET NULL
);
```

#### chat_messages
```sql
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL,
    role       VARCHAR(20) NOT NULL,
    content    TEXT        NOT NULL,
    intent     VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_chat_messages         PRIMARY KEY (id),
    CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id)
        REFERENCES public.chat_sessions (id) ON DELETE CASCADE
);
```

#### real_interview_logs
```sql
CREATE TABLE IF NOT EXISTS public.real_interview_logs (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    account_id    UUID,
    panelist_name VARCHAR(255),
    logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_real_interview_logs  PRIMARY KEY (id),
    CONSTRAINT fk_real_logs_account    FOREIGN KEY (account_id)
        REFERENCES public.accounts (id) ON DELETE SET NULL
);
```

#### real_interview_questions
```sql
CREATE TABLE IF NOT EXISTS public.real_interview_questions (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    log_id     UUID         NOT NULL,
    text       TEXT         NOT NULL,
    domain     VARCHAR(255),
    service    VARCHAR(255),
    difficulty VARCHAR(255),
    CONSTRAINT pk_real_interview_questions PRIMARY KEY (id),
    CONSTRAINT fk_real_questions_log       FOREIGN KEY (log_id)
        REFERENCES public.real_interview_logs (id) ON DELETE CASCADE
);
```

---

### Schema: `interview_bot`

```sql
CREATE SCHEMA IF NOT EXISTS interview_bot;
```

#### interview_bot.questions
```sql
CREATE TABLE IF NOT EXISTS interview_bot.questions (
    id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    content            TEXT         NOT NULL,
    normalized_content TEXT,
    category           VARCHAR(255),
    company            VARCHAR(255),
    role               VARCHAR(255),
    difficulty         VARCHAR(255),
    created_at         TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT pk_bot_questions PRIMARY KEY (id)
);
```

#### interview_bot.files
```sql
CREATE TABLE IF NOT EXISTS interview_bot.files (
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID,
    file_name   VARCHAR(255),
    file_path   VARCHAR(255),
    uploaded_at TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT pk_bot_files PRIMARY KEY (id)
);
```

#### interview_bot.file_question_map
```sql
CREATE TABLE IF NOT EXISTS interview_bot.file_question_map (
    file_id     UUID NOT NULL,
    question_id UUID NOT NULL,
    CONSTRAINT pk_file_question_map PRIMARY KEY (file_id, question_id)
);
```

#### interview_bot.interview_sessions
```sql
CREATE TABLE IF NOT EXISTS interview_bot.interview_sessions (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID,
    company    VARCHAR(255),
    role       VARCHAR(255),
    status     VARCHAR(255),
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT pk_bot_sessions PRIMARY KEY (id)
);
```

---

### Indexes

```sql
-- Fast login / JWT validation
CREATE INDEX IF NOT EXISTS idx_user_name  ON public.app_users (name);
CREATE INDEX IF NOT EXISTS idx_user_email ON public.app_users (email);

-- User dashboard queries (WHERE user_id = ?)
CREATE INDEX IF NOT EXISTS idx_session_user    ON public.interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_session_account ON public.interview_sessions (account_id);

-- Question ordering within a session
CREATE INDEX IF NOT EXISTS idx_question_session ON public.questions (session_id, order_index);

-- Document chunk retrieval
CREATE INDEX IF NOT EXISTS idx_chunk_document ON public.document_chunks (document_id);

-- Chat message retrieval
CREATE INDEX IF NOT EXISTS idx_msg_session ON public.chat_messages (session_id);

-- Bot question filtering
CREATE INDEX IF NOT EXISTS idx_bot_q_company_role ON interview_bot.questions (company, role);
CREATE INDEX IF NOT EXISTS idx_bot_q_normalized   ON interview_bot.questions (normalized_content);

-- Bot file lookup by user
CREATE INDEX IF NOT EXISTS idx_bot_files_user ON interview_bot.files (user_id);
```

---

## Step 4 — Set Environment Variables

Set these before starting the backend. Choose the method that matches how you run the app.

### Option A — Terminal (temporary, current session only)

```bash
# Windows PowerShell
$env:DB_HOST     = "localhost"
$env:DB_PORT     = "5432"
$env:DB_NAME     = "interviewprep"
$env:DB_USER     = "postgres"
$env:DB_PASSWORD = "your_password_here"

$env:OPENAI_API_KEY = "sk-proj-..."
$env:CLAUDE_API_KEY = "sk-ant-..."
$env:JWT_SECRET     = "some-32-char-secret-key-here-!!"
```

```cmd
:: Windows CMD
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=interviewprep
set DB_USER=postgres
set DB_PASSWORD=your_password_here

set OPENAI_API_KEY=sk-proj-...
set CLAUDE_API_KEY=sk-ant-...
set JWT_SECRET=some-32-char-secret-key-here-!!
```

### Option B — `.env` file in `backend/` (load manually before running)

Create `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interviewprep
DB_USER=postgres
DB_PASSWORD=your_password_here
OPENAI_API_KEY=sk-proj-...
CLAUDE_API_KEY=sk-ant-...
JWT_SECRET=some-32-char-secret-key-here-!!
```

> **Add `.env` to `.gitignore`** — never commit credentials.

### Option C — Edit `application.yml` directly (simplest, dev only)

Replace the placeholders in `application.yml`:
```yaml
spring:
  datasource:
    username: postgres
    password: your_password_here
```

---

## Step 5 — Start the Backend

```bash
cd backend
./mvnw spring-boot:run
```

On startup you will see logs like:
```
HikariPool-1 - Starting...
HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection
Hibernate: create table if not exists public.app_users (...)
Hibernate: create table if not exists public.interview_sessions (...)
...
Started InterviewPrepApplication in 4.2 seconds
```

If Hibernate's `ddl-auto: update` is active, it will **automatically create any missing tables**. You only need to run the SQL above manually if you want to pre-create everything (or if you change `ddl-auto` to `validate` or `none`).

---

## Step 6 — Verify

```bash
# Connect to the database and check tables
psql -U postgres -d interviewprep

\dt public.*              -- list all tables in public schema
\dt interview_bot.*       -- list all tables in interview_bot schema

SELECT * FROM public.app_users;
SELECT * FROM interview_bot.questions LIMIT 5;
```

---

## What the Code Does Automatically

| Task | Handled by |
|------|-----------|
| Create `interview_bot` schema | `BotSchemaInitializer.java` (runs at startup) |
| Create all tables | Hibernate `ddl-auto: update` |
| Migrate schema changes | Hibernate `ddl-auto: update` (adds new columns, does not drop) |
| Connection pooling | HikariCP (configured in `application.yml`) |

---

## Environment Variables Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DB_HOST` | `localhost` | No | PostgreSQL hostname |
| `DB_PORT` | `5432` | No | PostgreSQL port |
| `DB_NAME` | `interviewprep` | No | Database name |
| `DB_USER` | `postgres` | No | DB username |
| `DB_PASSWORD` | `postgres` | **Yes** | DB password |
| `OPENAI_API_KEY` | *(empty)* | For uploads | OpenAI key for question extraction |
| `CLAUDE_API_KEY` | *(empty)* | For interviews | Anthropic key for interview evaluation |
| `JWT_SECRET` | dev default | **Yes in prod** | Min 32-character secret |
| `STORAGE_PATH` | `./uploads` | No | File upload directory |
| `MASTER_PDF_PATH` | `./data/master_questions.pdf` | No | Master PDF path |
| `MASTER_JSON_PATH` | `./data/master_questions.json` | No | Master JSON path |

---

## Troubleshooting

### `Connection refused` on startup
PostgreSQL is not running. Start it:
```bash
# macOS (Homebrew)
brew services start postgresql@16

# Windows — start from Services or:
pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start

# Linux
sudo systemctl start postgresql
```

### `password authentication failed`
Wrong `DB_USER` or `DB_PASSWORD`. Verify with:
```bash
psql -U postgres -d interviewprep
```

### `schema "interview_bot" does not exist`
The `BotSchemaInitializer` runs at startup and creates it automatically. If it fails, run manually:
```sql
CREATE SCHEMA IF NOT EXISTS interview_bot;
```

### `column "extracted_text" is of type oid`
Old H2 data was imported incorrectly. This won't happen on a fresh PostgreSQL install since all entities now use `columnDefinition = "TEXT"`.

### `CLOB` type error on table creation
All `CLOB` references have been replaced with `TEXT` in the entity files. If you see this error, make sure you rebuilt the project after the code changes:
```bash
./mvnw clean package -DskipTests
./mvnw spring-boot:run
```
