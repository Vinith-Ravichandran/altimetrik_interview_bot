# Interview Prep — Backend Setup Plan

## Prerequisites — Install These First

| Tool | Version | Purpose |
|------|---------|---------|
| **JDK 17** | 17+ | Run the Spring Boot backend |
| **Maven** | 3.8+ | Build the Java project (or use the `mvnw` wrapper) |
| **Node.js** | 18+ | Run the React frontend |

Download JDK 17: https://adoptium.net (Temurin 17)

Verify installs:
```bash
java -version    # should say 17
mvn -version     # or ./mvnw -version
node -version    # should say 18+
```

---

## Step 1 — Get a Claude API Key

The backend calls Claude (Anthropic) for:
- Generating interview questions during mock sessions
- Evaluating answers (clarity, depth, quality scores)
- Classifying real interview questions by domain and difficulty

1. Go to **console.anthropic.com** → sign up / log in
2. Create an API key
3. Copy it — you will need it in Step 3

---

## Step 2 — Backend Setup

```bash
cd "backend"
```

Set the API key as an environment variable before running:

```bash
# Windows Command Prompt
set CLAUDE_API_KEY=sk-ant-your-key-here

# Windows PowerShell
$env:CLAUDE_API_KEY="sk-ant-your-key-here"
```

Run the backend:
```bash
mvn spring-boot:run

# If Maven is not installed globally, use the wrapper:
.\mvnw spring-boot:run
```

Backend starts on **http://localhost:8080**

Verify it is running:
```
http://localhost:8080/api/v1/accounts   →  should return []
http://localhost:8080/h2-console        →  in-browser database viewer
```

> **Note:** The database is in-memory (H2). Every time you restart the backend, all
> data (accounts, roles, interview sessions, documents) is wiped. User accounts added
> on the Dashboard are safe — they are stored in browser localStorage.

---

## Step 3 — Frontend Setup

```bash
cd "frontend"
npm install
npm run dev
```

Frontend starts on **http://localhost:5173**

---

## Step 4 — Typical First-Run Sequence

```
1. Start backend   →  mvn spring-boot:run        (terminal 1)
2. Start frontend  →  npm run dev                 (terminal 2)
3. Open browser    →  http://localhost:5173
4. Log in as admin →  username: admin  /  password: admin
5. Go to Accounts & Roles  →  add accounts (e.g. "Google", "Altimetrik")
6. Go to Dashboard         →  add roles (e.g. "Senior Engineer", "QA Lead")
7. Add users from Dashboard
8. Log out → log in as a user to verify their view
```

---

## Step 5 — What Each Feature Needs to Work

| Feature | Needs Backend? | Needs Claude Key? | Notes |
|---------|:--------------:|:-----------------:|-------|
| Login / Logout | No | No | localStorage only |
| Admin add users | No | No | localStorage only |
| Admin manage roles | No | No | localStorage only |
| User role / account dropdowns | Accounts only | No | Roles from localStorage, accounts from `/api/v1/accounts` |
| **Study Material** upload | Yes | No | Files stored in DB |
| **Accounts & Roles** page | Yes | No | CRUD via backend API |
| **Mock Interviews** — questions | Yes | **Yes** | Claude generates questions |
| **Mock Interviews** — scoring | Yes | **Yes** | Claude evaluates answers |
| **Real Interviews** — classify | Yes | **Yes** | Claude classifies questions |
| Export PDF / DOCX | Yes | No | Apache POI / iText |

---

## API Endpoints Reference

**Base path:** `http://localhost:8080/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List all accounts |
| POST | `/accounts` | Create account |
| DELETE | `/accounts/{id}` | Delete account |
| GET | `/roles` | List all roles |
| POST | `/roles` | Create role |
| DELETE | `/roles/{id}` | Delete role |
| POST | `/documents` | Upload study material (multipart, max 25 MB) |
| GET | `/documents` | List uploaded documents |
| DELETE | `/documents/{id}` | Delete document |
| GET | `/documents/{id}/export?format=pdf` | Export as PDF |
| GET | `/documents/{id}/export?format=docx` | Export as DOCX |
| POST | `/interviews` | Start mock interview session |
| GET | `/interviews` | List all sessions |
| GET | `/interviews/{id}` | Get session details |
| POST | `/interviews/{id}/next-question` | Generate next question |
| POST | `/interviews/questions/{id}/answer` | Submit answer |
| POST | `/interviews/{id}/finish` | Finish session, get overall score |
| POST | `/real-interviews` | Log a real interview |
| GET | `/real-interviews` | List all real interview logs |

---

## Optional: Switch to PostgreSQL (Persistent Data)

By default the backend uses an H2 in-memory database. To keep data between restarts:

1. Install PostgreSQL and create a database:
   ```sql
   CREATE DATABASE interviewprep;
   ```

2. Update `backend/src/main/resources/application.yml`:
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://localhost:5432/interviewprep
       username: your_pg_user
       password: your_pg_password
     jpa:
       hibernate:
         ddl-auto: update
       database-platform: org.hibernate.dialect.PostgreSQLDialect
   ```

3. Restart the backend — schema is created automatically on first run.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `CLAUDE_API_KEY` warning on startup | Set the env var before running `mvn spring-boot:run` |
| Account dropdown empty in frontend | Backend is not running — start it first |
| Mock interview questions not generating | Claude API key is missing or invalid |
| Port 8080 already in use | Add `server.port=8081` in `application.yml`; set `VITE_API_BASE_URL=http://localhost:8081` in `frontend/.env` |
| H2 console login fails | JDBC URL: `jdbc:h2:mem:interview` · User: `sa` · Password: *(leave blank)* |
| `java: error: release version 17 not supported` | JDK version too old — install JDK 17+ |
| `npm install` fails | Node.js version too old — install Node 18+ |

---

## Default Credentials

| Account | Username | Password |
|---------|----------|----------|
| Admin | `admin` | `admin` |
| Any user added by admin | their name (exact) | `password` |

Admins added by the admin user also use password `admin` by default.
