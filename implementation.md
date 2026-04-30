# Backend Setup — Complete Implementation Guide

---

## 1. Recommended Database: PostgreSQL

### Why PostgreSQL for this application?

PostgreSQL is the perfect fit because of how our data is structured.
Every piece of data in this app is **relational** — things point to other things:

```
Account  ──→  Role  ──→  InterviewSession  ──→  Question  ──→  Answer  ──→  Evaluation
Account  ──→  RealInterviewLog  ──→  RealInterviewQuestion
Document ──→  DocumentChunk
```

PostgreSQL is built exactly for this kind of connected data.

| Our Data | Why PostgreSQL handles it well |
|----------|-------------------------------|
| Accounts + Roles | One Account has many Roles — foreign key relationship |
| Interview Sessions | Linked to both Account and Role by UUID — needs relational integrity |
| Questions / Answers / Evaluations | Deeply nested — 4 levels of parent-child relations |
| Study Materials | Documents split into chunks — needs reliable joins |
| Post Interview Logs | Questions classified and linked to accounts |

### Why NOT the alternatives?

| Database | Why we skip it |
|----------|---------------|
| H2 (current) | In-memory — all data wiped every time you restart the backend |
| MySQL | Works, but PostgreSQL handles UUID primary keys and JSON better — our backend is already configured for PostgreSQL |
| MongoDB | Our data is relational, not document-based — wrong tool |
| SQLite | Not suitable for multi-user or server deployments |

### What PostgreSQL stores in our app

| Table | What it holds | Lost without persistence? |
|-------|--------------|--------------------------|
| `accounts` | Ford, PayPal, Google... | Yes — must re-add every restart |
| `roles` | Data Engineer, Backend Dev... | Yes — re-add every restart |
| `interview_sessions` | Every mock interview you ran | Yes — entire history gone |
| `questions` | AI-generated questions per session | Yes |
| `answers` | Your submitted answers | Yes |
| `evaluations` | Scores: clarity, depth, quality | Yes — performance history gone |
| `documents` | Uploaded study materials | Yes — all uploads gone |
| `document_chunks` | Extracted text for AI context | Yes |
| `real_interview_logs` | Post-interview entries | Yes — all logs gone |
| `real_interview_questions` | Classified questions from logs | Yes |

---

## 2. What to Download

You need **one installer** that includes everything:

---

### Download 1 — PostgreSQL 16 (Includes pgAdmin)

| Item | Detail |
|------|--------|
| **What** | PostgreSQL Database Server |
| **Version** | 16 (latest stable) |
| **Download URL** | https://www.enterprisedb.com/downloads/postgres-postgresql-downloads |
| **File size** | ~300 MB |
| **Platform** | Windows x86-64 |

**What gets installed inside this one installer:**

| Component | Purpose in our app |
|-----------|-------------------|
| **PostgreSQL Server** | The actual database engine that stores all app data |
| **pgAdmin 4** | Visual GUI to see your tables, run queries, check data — like a dashboard for your database |
| **SQL Shell (psql)** | Command line tool to interact with the database |
| **Stack Builder** | Optional — skip this during install |

> You do NOT need to download pgAdmin separately — it comes bundled with the PostgreSQL installer on Windows.

---

### Already installed (verify before proceeding)

Run these in your terminal to confirm:

```bash
java -version       # Must show: 17 or higher
mvn -version        # Must show: 3.8 or higher
node -version       # Must show: 18 or higher
```

If any of these are missing:

| Missing | Download from |
|---------|--------------|
| Java 17 | https://adoptium.net (choose Temurin 17 LTS) |
| Maven | https://maven.apache.org/download.cgi |
| Node.js | https://nodejs.org (choose LTS version) |

---

## 3. PostgreSQL Installation Steps (Windows)

1. Run the downloaded installer as Administrator
2. On **Select Components** screen, check these (uncheck Stack Builder):
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4
   - ✅ Command Line Tools
   - ☐ Stack Builder ← uncheck this
3. Installation Directory → keep default (`C:\Program Files\PostgreSQL\16`)
4. Data Directory → keep default
5. **Set Superuser Password** → type a password you will remember
   - This becomes your `DB_PASSWORD`
   - Example: `admin123` or `postgres123`
   - **Write this down — you cannot recover it**
6. Port → keep `5432` (default)
7. Locale → keep default
8. Click through and complete the installation

### Create the database (after install)

Open **pgAdmin 4** from your Start menu, then:

1. In the left panel: Servers → PostgreSQL 16 → right-click **Databases** → Create → Database
2. Name: `interviewprep`
3. Owner: `postgres`
4. Click Save

**OR** use the SQL Shell (psql):
```sql
CREATE DATABASE interviewprep;
```

---

## 4. Credentials I Need From You

Fill in this table with your actual values. These will be set as environment variables when starting the backend.

| Variable | What it is | Your Value |
|----------|-----------|------------|
| `DB_HOST` | Where PostgreSQL is running | `localhost` *(keep as-is unless remote)* |
| `DB_PORT` | PostgreSQL port | `5432` *(keep as-is unless you changed it)* |
| `DB_NAME` | Database name you created | `interviewprep` *(or whatever name you chose)* |
| `DB_USER` | PostgreSQL username | `postgres` *(default superuser)* |
| `DB_PASSWORD` | Password you set during installation | *(your password from step 5 above)* |
| `CLAUDE_API_KEY` | Anthropic API key | `sk-ant-...` *(from console.anthropic.com)* |
| `ADMIN_KEY` | Secret key for admin API calls | `interview-admin-secret` *(or change to something custom)* |

> **CLAUDE_API_KEY** — without this, the app still runs but mock interview questions show placeholder text instead of real AI questions. Get one free at https://console.anthropic.com

---

## 5. How to Start the Backend with PostgreSQL

Once you have the credentials, start the backend like this:

### Windows Command Prompt

```cmd
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=interviewprep
set DB_USER=postgres
set DB_PASSWORD=YOUR_PASSWORD_HERE
set CLAUDE_API_KEY=sk-ant-YOUR_KEY_HERE
set ADMIN_KEY=interview-admin-secret

cd "C:\Users\admin\Documents\project\New folder\backend"
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### Windows PowerShell

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="interviewprep"
$env:DB_USER="postgres"
$env:DB_PASSWORD="YOUR_PASSWORD_HERE"
$env:CLAUDE_API_KEY="sk-ant-YOUR_KEY_HERE"
$env:ADMIN_KEY="interview-admin-secret"

cd "C:\Users\admin\Documents\project\New folder\backend"
mvn spring-boot:run "-Dspring-boot.run.profiles=prod"
```

> The `-Dspring-boot.run.profiles=prod` flag tells Spring Boot to use `application-prod.yml`
> instead of the default H2 configuration.

### What happens on first start

1. Spring Boot connects to PostgreSQL
2. Hibernate reads all entity classes and **automatically creates all tables**
3. You will see output like:
   ```
   Hibernate: create table accounts (id uuid not null, ...)
   Hibernate: create table roles (id uuid not null, ...)
   Hibernate: create table interview_sessions (...)
   ...
   Started InterviewPrepApplication in 4.2 seconds
   ```
4. Tables are created once and preserved forever after that

---

## 6. Start the Frontend

In a second terminal window:

```cmd
cd "C:\Users\admin\Documents\project\New folder\frontend"
npm run dev
```

Frontend starts at: http://localhost:5173

---

## 7. Verify Everything is Working

| Check | How | Expected result |
|-------|-----|----------------|
| Backend running | Open http://localhost:8080/api/v1/accounts | Returns `[]` (empty array) |
| Database connected | Open pgAdmin → Tables | See all tables created |
| Frontend connected | Open http://localhost:5173 | Login page loads |
| Admin login | Login with `admin` / `admin` | Dashboard opens |
| Account creation | Accounts & Roles → Add account | Account saved, persists after restart |

---

## 8. What Changes Between H2 and PostgreSQL

| Behavior | H2 (current) | PostgreSQL (after setup) |
|----------|-------------|--------------------------|
| Data after restart | **Wiped** | **Preserved** |
| Accounts you added | Gone | Still there |
| Mock interview sessions | Gone | Full history kept |
| Study materials uploaded | Gone | All files listed |
| Post interview logs | Gone | All logs preserved |
| Performance | Fast (memory) | Fast (disk, indexed) |
| Suitable for team use | No | Yes |

---

## 9. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on port 5432 | PostgreSQL service not running | Open Services → Start PostgreSQL |
| `password authentication failed` | Wrong `DB_PASSWORD` | Double-check the password you set during install |
| `database "interviewprep" does not exist` | Forgot to create the DB | Run `CREATE DATABASE interviewprep;` in pgAdmin |
| `could not find driver` | Wrong `DB_USER` in env | Confirm username in pgAdmin |
| Tables not created | Wrong profile activated | Make sure you added `-Dspring-boot.run.profiles=prod` |
| `CLAUDE_API_KEY not configured` warning | Key not set or blank | Set the env variable before running mvn |

---

## 10. Summary — What to Provide

Once you install PostgreSQL and create the database, reply with:

```
DB_HOST     = localhost
DB_PORT     = 5432
DB_NAME     = interviewprep
DB_USER     = postgres
DB_PASSWORD = _______________
CLAUDE_API_KEY = _______________
```

I will then update the startup script (`start-backend.bat`) to include all values permanently so you never need to type them manually again.
