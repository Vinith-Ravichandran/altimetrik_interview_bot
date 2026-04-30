@echo off
echo ================================================
echo  Interview Prep - Starting Backend
echo ================================================

if "%CLAUDE_API_KEY%"=="" (
  echo [WARNING] CLAUDE_API_KEY is not set.
  echo          Mock interviews and scoring will return stub responses.
  echo          Set it with: set CLAUDE_API_KEY=sk-ant-your-key-here
  echo.
)

cd /d "%~dp0backend"
call mvn spring-boot:run
