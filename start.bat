@echo off
echo =======================================================================
echo  National Patient Data Management System (NPDMS) - Ethiopia
echo  Jimma University - Department of Computer Science (Worku Fikadu, 2026)
echo =======================================================================
echo Starting Backend Service on http://localhost:5000 ...
start "NPDMS Backend Server" cmd /k "cd backend && node server.js"
echo Starting Frontend UI on http://localhost:3000 ...
start "NPDMS Frontend Vite" cmd /k "cd frontend && npm run dev"
echo Both servers started! Opening browser at http://localhost:3000 ...
timeout /t 3 >nul
start http://localhost:3000
