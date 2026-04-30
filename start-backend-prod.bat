@echo off
echo ================================================
echo  Interview Prep - Starting Backend (PostgreSQL)
echo ================================================

REM ── Load credentials from backend\.env ────────────────────
if exist "%~dp0backend\.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0backend\.env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
  )
  echo [INFO] Loaded environment from backend\.env
) else (
  echo [ERROR] backend\.env not found.
  echo         Copy backend\.env.example to backend\.env and fill in your values.
  pause
  exit /b 1
)

REM ── Validate required variables ────────────────────────────
if "%DB_PASSWORD%"=="" (
  echo [ERROR] DB_PASSWORD is not set in backend\.env
  pause & exit /b 1
)
if "%JWT_SECRET%"=="" (
  echo [ERROR] JWT_SECRET is not set in backend\.env
  pause & exit /b 1
)

REM ── Optional: warn if AI key missing ──────────────────────
if "%CLAUDE_API_KEY%"=="" (
  echo [INFO] CLAUDE_API_KEY not set. AI interview features use stub responses.
  echo.
)

cd /d "%~dp0backend"
call mvn spring-boot:run -Dspring-boot.run.profiles=prod
