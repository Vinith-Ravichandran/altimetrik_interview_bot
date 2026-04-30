# Interview Prep — What I Need From You

Before the app is fully running, I need a few details from you.
Answer each section and I will apply the configuration.

---

## 1. Claude API Key  *(required for mock interviews and scoring)*

The backend uses Claude (Anthropic) to:
- Generate interview questions
- Score your answers (clarity, depth, quality)
- Classify real interview questions by domain and difficulty

**Do you have a Claude API key?**

- [ ] Yes — my key is: `sk-ant-________________________________________________`
- [ ] No — I need to create one at https://console.anthropic.com

> If you skip this, the app still runs but mock interview questions will return
> a placeholder message instead of real AI-generated questions.

---

## 2. Database Choice  *(affects whether data survives a backend restart)*

| Option | Pros | Cons |
|--------|------|------|
| **H2 in-memory** *(current default)* | Zero setup, works immediately | All accounts, roles, documents wiped on restart |
| **PostgreSQL** | Data persists forever | Needs PostgreSQL installed |

**Which do you want?**

- [ ] Keep H2 — I don't mind re-adding accounts/roles/documents after each restart
- [ ] Switch to PostgreSQL — I want data to persist

---

## 3. If PostgreSQL — connection details

Fill in the values for your PostgreSQL instance:

| Setting | Your Value |
|---------|------------|
| Host | `localhost` *(change if remote)* |
| Port | `5432` *(default)* |
| Database name | e.g. `interviewprep` |
| Username | e.g. `postgres` |
| Password | *(your pg password)* |

If you do not have PostgreSQL installed yet, I can provide install steps for Windows.

---

## 4. Backend Port

The backend defaults to port **8080**.

**Is port 8080 free on your machine?**

- [ ] Yes, 8080 is fine
- [ ] No, use port: `________`

---

## 5. Frontend Port

The frontend defaults to port **5173**.

**Is port 5173 free on your machine?**

- [ ] Yes, 5173 is fine
- [ ] No, use port: `________`

---

## 6. Deployment Target

**Where will this app run?**

- [ ] Local machine only (just me)
- [ ] Shared on a local network (team access via IP)
- [ ] Cloud / server (tell me which: AWS / Azure / GCP / other)

This affects CORS settings and how environment variables are configured.

---

## What Has Already Been Implemented

For reference, here is what was done without needing your input:

| Change | File |
|--------|------|
| Mock session score auto-saved on finish | `frontend/src/pages/InterviewSession.tsx` |
| Frontend API URL configurable via env file | `frontend/.env` |
| PostgreSQL config template ready | `backend/src/main/resources/application-prod.yml` |
| One-click startup scripts | `start-backend.bat`, `start-frontend.bat` |

Once you answer the questions above, I will:
1. Set your Claude API key in the startup script (so you never have to type it again)
2. Switch the database if you chose PostgreSQL
3. Update any port numbers that conflict
4. Adjust CORS for your deployment target
