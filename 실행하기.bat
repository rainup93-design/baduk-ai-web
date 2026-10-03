@echo off
chcp 65001 > nul
title AI 바둑 마스터 (Baduk Master)
echo ===================================================
echo             AI 바둑 마스터 (Baduk Master)
echo ===================================================
echo.

:: 포트 3000 체크
netstat -ano | findstr :3000 > nul
if %ERRORLEVEL% EQU 0 (
    echo [알림] 바둑 서버가 이미 백그라운드에서 실행 중입니다.
    echo 웹 브라우저를 바로 엽니다: http://localhost:3000
    start http://localhost:3000
    timeout /t 3 > nul
    exit /b
)

echo [1/2] 웹 바둑 서버 시작 중...
start "" "http://localhost:3000"
node server.js
pause
