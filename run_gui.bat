@echo off
title Mini Search Engine (DSA) Web Application
echo ========================================================
echo  MINI SEARCH ENGINE - WEB GUI RUNNER
echo ========================================================
echo Compiling Java source files...
javac -d bin src/com/minisearch/*.java
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Compilation failed.
    pause
    exit /b %ERRORLEVEL%
)

echo Opening default browser at http://localhost:8080 ...
start "" http://localhost:8080

echo Starting Web Server on port 8080...
echo (Press Ctrl+C to stop the server)
java -cp bin com.minisearch.WebServer
pause
