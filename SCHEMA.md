# Database Schema & Role-Based Dashboard Guide

## Table of Contents
1. [How Data Is Currently Stored](#1-how-data-is-currently-stored)
2. [Complete PostgreSQL Schema](#2-complete-postgresql-schema)
3. [All Tables to Create](#3-all-tables-to-create--full-ddl)
4. [Indexes for Efficiency](#4-indexes-for-efficiency)
5. [Role-Based Dashboard Architecture](#5-role-based-dashboard-architecture)
6. [API Endpoints by Role](#6-api-endpoints-by-role)
7. [Security Rules](#7-security-rules)

---

## 1. How Data Is Currently Stored

### Development Mode (Default)
The application runs on **H2** (embedded file-based database) in dev mode:
- Database file: `backend/data/interviewdb.mv.db`
- Inspect via: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/interviewdb;MODE=PostgreSQL`
- Username: `sa` | Password: *(empty)*

### Production Mode
Switch to **PostgreSQL** by changing `application-prod.yml`.

### Question Storage (Two Files)
| File | Path | Purpose |
|------|------|---------|
| JSON shadow | `backend/data/master_questions.json` | Machine-readable source of truth |
| Master PDF | `backend/data/master_questions.pdf` | Human-readable output |

---

## 2. Complete PostgreSQL Schema

The application uses **two schemas**:

| Schema | Purpose |
|--------|---------|
| `public` | Core application tables (users, sessions, evaluations) |
| `interview_bot` | Bot interview pipeline (questions, files, sessions) |

---

## 3. All Tables to Create — Full DDL

### SCHEMA: `public`

```sql
-- ─── Enable UUID extension ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── accounts ────────────────────────────────────────────────────────────────
CREATE TABLE public.accounts (
    id       UUID         NOT NULL DEFAULT gen_random_uuid(),
    name     VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    CONSTRAINT pk_accounts PRIMARY KEY (id),
    CONSTRAINT uq_accounts_name UNIQUE (name)
);

-- ─── roles ───────────────────────────────────────────────────────────────────
CREATE TABLE public.roles (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    account_id UUID,
    CONSTRAINT pk_roles PRIMARY KEY (id),
    CONSTRAINT fk_roles_account FOREIGN KEY (account_id)
        REFERENCES public.accounts (id) ON DELETE CASCADE
);

-- ─── app_users ────────────────────────────────────────────────────────────────
CREATE TABLE public.app_users (
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
    CONSTRAINT pk_app_users  PRIMARY KEY (id),
    CONSTRAINT uq_users_name  UNIQUE (name),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- ─── interview_sessions ───────────────────────────────────────────────────────
CREATE TABLE public.interview_sessions (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    account_id       UUID,
    role_id          UUID,
    user_id          UUID,                          -- links session to user
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    overall_score    DOUBLE PRECISION,
    overall_feedback VARCHAR(4000),
    CONSTRAINT pk_interview_sessions PRIMARY KEY (id),
    CONSTRAINT fk_sessions_account FOREIGN KEY (account_id)
        REFERENCES public.accounts (id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_role FOREIGN KEY (role_id)
        REFERENCES public.roles (id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (id) ON DELETE SET NULL
);

-- ─── questions ───────────────────────────────────────────────────────────────
CREATE TABLE public.questions (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    session_id  UUID    NOT NULL,
    order_index INTEGER NOT NULL,
    text        TEXT    NOT NULL,
    CONSTRAINT pk_questions PRIMARY KEY (id),
    CONSTRAINT fk_questions_session FOREIGN KEY (session_id)
        REFERENCES public.interview_sessions (id) ON DELETE CASCADE
);

-- ─── answers ─────────────────────────────────────────────────────────────────
CREATE TABLE public.answers (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    question_id UUID        NOT NULL,
    text        TEXT        NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_answers PRIMARY KEY (id),
    CONSTRAINT uq_answers_question UNIQUE (question_id),
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id)
        REFERENCES public.questions (id) ON DELETE CASCADE
);

-- ─── evaluations ─────────────────────────────────────────────────────────────
CREATE TABLE public.evaluations (
    id           UUID             NOT NULL DEFAULT gen_random_uuid(),
    answer_id    UUID             NOT NULL,
    clarity      DOUBLE PRECISION,
    depth        DOUBLE PRECISION,
    quality      DOUBLE PRECISION,
    overall      DOUBLE PRECISION,
    strengths    VARCHAR(2000),
    improvements VARCHAR(2000),
    CONSTRAINT pk_evaluations PRIMARY KEY (id),
    CONSTRAINT uq_evaluations_answer UNIQUE (answer_id),
    CONSTRAINT fk_evaluations_answer FOREIGN KEY (answer_id)
        REFERENCES public.answers (id) ON DELETE CASCADE
);
```

---

### SCHEMA: `interview_bot`

```sql
-- ─── Create schema ────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS interview_bot;

-- ─── interview_bot.questions ──────────────────────────────────────────────────
CREATE TABLE interview_bot.questions (
    id                 UUID         NOT NULL,
    content            TEXT         NOT NULL,
    normalized_content TEXT,
    category           VARCHAR(255),
    company            VARCHAR(255),
    role               VARCHAR(255),
    difficulty         VARCHAR(255),
    created_at         TIMESTAMP,
    CONSTRAINT pk_bot_questions PRIMARY KEY (id)
);

-- ─── interview_bot.files ──────────────────────────────────────────────────────
CREATE TABLE interview_bot.files (
    id          UUID         NOT NULL,
    user_id     UUID,                        -- references app_users(id) implicitly
    file_name   VARCHAR(255),
    file_path   VARCHAR(255),
    uploaded_at TIMESTAMP,
    CONSTRAINT pk_bot_files PRIMARY KEY (id)
);

-- ─── interview_bot.file_question_map ─────────────────────────────────────────
CREATE TABLE interview_bot.file_question_map (
    file_id     UUID NOT NULL,
    question_id UUID NOT NULL,
    CONSTRAINT pk_file_question_map PRIMARY KEY (file_id, question_id)
);

-- ─── interview_bot.interview_sessions ────────────────────────────────────────
CREATE TABLE interview_bot.interview_sessions (
    id         UUID         NOT NULL,
    user_id    UUID,                         -- references app_users(id) implicitly
    company    VARCHAR(255),
    role       VARCHAR(255),
    status     VARCHAR(255),
    created_at TIMESTAMP,
    CONSTRAINT pk_bot_sessions PRIMARY KEY (id)
);
```

---

## 4. Indexes for Efficiency

```sql
-- ─── public schema indexes ────────────────────────────────────────────────────

-- Fast user lookup by name (used in JWT auth, every request)
CREATE INDEX idx_user_name  ON public.app_users (name);

-- Fast user lookup by email (used during login)
CREATE INDEX idx_user_email ON public.app_users (email);

-- Fast session filtering by user (used in /dashboard/user, /interviews)
CREATE INDEX idx_session_user    ON public.interview_sessions (user_id);

-- Fast session filtering by account (used in admin reports)
CREATE INDEX idx_session_account ON public.interview_sessions (account_id);

-- Fast lookup of questions within a session (ordered)
CREATE INDEX idx_question_session ON public.questions (session_id, order_index);

-- ─── interview_bot schema indexes ────────────────────────────────────────────

-- Fast question lookup by company + role (used by bot interview start)
CREATE INDEX idx_bot_q_company_role ON interview_bot.questions (company, role);

-- Fast question dedup check
CREATE INDEX idx_bot_q_normalized ON interview_bot.questions (normalized_content);

-- Fast file lookup by user
CREATE INDEX idx_bot_files_user ON interview_bot.files (user_id);
```

---

## 5. Role-Based Dashboard Architecture

### How It Works

```
User logs in → JWT contains { userId, name, isAdmin }
                │
                ▼
     currentUser.isAdmin ?
          │            │
        YES            NO
          │            │
          ▼            ▼
   AdminDashboard   UserDashboard
   /dashboard/admin  /dashboard/user
          │            │
          ▼            ▼
  All users' data   Only that user's
  aggregated        own sessions
```

### User Dashboard (`GET /api/v1/dashboard/user`)

- **Who:** Any authenticated user
- **Data:** Filtered `WHERE user_id = :currentUserId`
- **Returns:**

```json
{
  "totalSessions":    5,
  "completedSessions": 3,
  "avgScore":         7.2,
  "bestScore":        8.5,
  "skillLevel":       "Intermediate",
  "latestScore":      8.5,
  "latestFeedback":   "Strengths: SQL joins...",
  "lastActivity":     "2026-05-06T10:30:00Z"
}
```

**Skill level derivation:**
| Avg Score | Level |
|-----------|-------|
| ≥ 8.0 | Advanced |
| ≥ 6.0 | Intermediate |
| ≥ 4.0 | Beginner |
| > 0 | Novice |
| 0 | Not Attempted |

---

### Admin Dashboard (`GET /api/v1/dashboard/admin`)

- **Who:** Admin role only (`@PreAuthorize("hasRole('ADMIN')")`)
- **Data:** All users, all sessions
- **Returns:**

```json
{
  "totalUsers":        25,
  "totalSessions":    120,
  "completedSessions": 98,
  "avgScore":          6.8,
  "allUsers": [
    {
      "userId": "...",
      "name": "John",
      "roleName": "Data Engineer",
      "accountName": "PayPal",
      "totalSessions": 5,
      "completedSessions": 4,
      "avgScore": 7.2,
      "bestScore": 8.5,
      "lastActivity": "2026-05-06T10:30:00Z"
    }
  ],
  "topPerformers": [ ...top 5 by avgScore... ],
  "recentActivity": [
    {
      "userName": "John",
      "accountName": "PayPal",
      "roleName": "Data Engineer",
      "score": 8.5,
      "completedAt": "2026-05-06T10:30:00Z"
    }
  ]
}
```

---

## 6. API Endpoints by Role

| Endpoint | Method | User | Admin | Description |
|----------|--------|------|-------|-------------|
| `/api/v1/dashboard/user` | GET | ✅ Own data only | ✅ | Personal stats |
| `/api/v1/dashboard/admin` | GET | ❌ 403 | ✅ | All users' stats |
| `/api/v1/interviews` | GET | ✅ Own sessions | ✅ All sessions | Session list |
| `/api/v1/interviews` | POST | ✅ | ✅ | Start session (linked to caller) |
| `/api/v1/admin/dashboard/summary` | GET | ❌ 403 | ✅ | Aggregate summary |
| `/api/v1/admin/dashboard/users/performance` | GET | ❌ 403 | ✅ | Per-user performance |
| `/api/v1/users` | GET | ✅ | ✅ | User list |
| `/api/v1/users/{id}/promote` | PATCH | ❌ | ✅ | Promote to admin |

---

## 7. Security Rules

### JWT Flow

```
1. User registers / logs in → backend issues JWT
2. JWT payload contains:  { sub: "username", roles: ["ROLE_USER"] }
3. Every request:  Authorization: Bearer <token>
4. JwtAuthFilter:  validates token → sets SecurityContext
5. Controller:     Authentication auth = ... → auth.getName() = username
6. User lookup:    appUserRepository.findByName(auth.getName())
```

### Data Isolation

```java
// ✅ CORRECT — backend filters by userId, not by what frontend sends
@GetMapping("/user")
public UserDashboardDto getUserDashboard(Authentication auth) {
    AppUser user = userRepository.findByName(auth.getName());
    List<InterviewSession> sessions = sessionRepository.findByUser_Id(user.getId());
    // ...
}

// ❌ WRONG — never trust userId from request body or query param
// @GetMapping("/user?userId=...")  <-- never do this
```

### Spring Security Config

```java
// Current SecurityConfig:
// - /api/v1/dashboard/** → anyRequest().authenticated()  (JWT required)
// - @PreAuthorize("hasRole('ADMIN')") on admin endpoints
// - Regular users get 403 if they call admin endpoints
```

### How user_id is set on sessions

```java
// InterviewController.start() — called when user starts an interview:
@PostMapping
public InterviewSessionDto start(@RequestBody StartInterviewRequest req, Authentication auth) {
    String callerName = auth.getName();                       // from JWT
    return interviewService.start(req.accountId(), req.roleId(), callerName);
}

// InterviewService.start():
userRepository.findByName(callerName).ifPresent(session::setUser);
// → session.user_id = authenticated user's UUID
```

---

## Entity-Relationship Diagram

```
public.accounts
    │ id (PK)
    │ name
    │ logo_url
    │
    ├──< public.roles
    │        id (PK)
    │        name
    │        account_id (FK)
    │
    └──< public.interview_sessions
             id (PK)
             account_id (FK) ──> accounts
             role_id    (FK) ──> roles
             user_id    (FK) ──> app_users  ← KEY for user isolation
             started_at
             completed_at
             overall_score
             overall_feedback
             │
             └──< public.questions
                      id (PK)
                      session_id (FK)
                      order_index
                      text
                      │
                      └── public.answers (1:1)
                               id (PK)
                               question_id (FK, UNIQUE)
                               text
                               submitted_at
                               │
                               └── public.evaluations (1:1)
                                        id (PK)
                                        answer_id (FK, UNIQUE)
                                        clarity
                                        depth
                                        quality
                                        overall
                                        strengths
                                        improvements

public.app_users
    id (PK)
    name (UNIQUE)
    email (UNIQUE)
    password_hash
    role_name
    account_name
    admin
    active
    mock_count
    created_at
    updated_at

interview_bot.questions
    id (PK)
    content
    normalized_content
    category
    company
    role
    difficulty
    created_at

interview_bot.files
    id (PK)
    user_id
    file_name
    file_path
    uploaded_at

interview_bot.interview_sessions
    id (PK)
    user_id
    company
    role
    status
    created_at
```
