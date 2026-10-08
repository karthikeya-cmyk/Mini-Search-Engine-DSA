@echo off
setlocal enabledelayedexpansion
title Nexus // Mini Search Engine (DSA) Web Application

echo ========================================================
echo  NEXUS MINI SEARCH ENGINE - FULL SYSTEM & FILE RUNNER
echo ========================================================

:: Step 1: Detect Java / Javac
set "JAVAC_CMD=javac"
set "JAVA_CMD=java"

where javac >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if defined JAVA_HOME if exist "%JAVA_HOME%\bin\javac.exe" (
        set "JAVAC_CMD=%JAVA_HOME%\bin\javac.exe"
        set "JAVA_CMD=%JAVA_HOME%\bin\java.exe"
    ) else if exist "%USERPROFILE%\.jdks\openjdk-26.0.2\bin\javac.exe" (
        set "JAVAC_CMD=%USERPROFILE%\.jdks\openjdk-26.0.2\bin\javac.exe"
        set "JAVA_CMD=%USERPROFILE%\.jdks\openjdk-26.0.2\bin\java.exe"
    ) else (
        for /d %%D in ("%USERPROFILE%\.jdks\openjdk*") do (
            if exist "%%D\bin\javac.exe" (
                set "JAVAC_CMD=%%D\bin\javac.exe"
                set "JAVA_CMD=%%D\bin\java.exe"
            )
        )
        if "!JAVAC_CMD!"=="javac" (
            for /d %%D in ("C:\Program Files\Java\jdk*") do (
                if exist "%%D\bin\javac.exe" (
                    set "JAVAC_CMD=%%D\bin\javac.exe"
                    set "JAVA_CMD=%%D\bin\java.exe"
                )
            )
        )
    )
)

echo [INFO] Using Java Compiler: "!JAVAC_CMD!"
echo [INFO] Compiling Java DSA backend source files...

if not exist bin mkdir bin
"!JAVAC_CMD!" -d bin src/com/minisearch/*.java
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend compilation failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo  SERVER ACTIVE: http://localhost:8080
echo ========================================================
echo Opening default web browser at http://localhost:8080 ...
start "" http://localhost:8080

echo Starting Web Server on port 8080 with full disk file access...
echo (Press Ctrl+C in this window to stop the server)
"!JAVA_CMD!" -cp bin com.minisearch.WebServer
pause
