@echo off
title Nexus // Mini Search Engine (DSA) Web Application
echo ========================================================
echo  NEXUS MINI SEARCH ENGINE - 100%% CLIENT-SIDE WEB APP
echo ========================================================
echo [INFO] Powered by in-memory DSA Engine (Trie, Max-Heap, Stack, Queue)
echo [INFO] Zero backend dependencies. Fully deployable on Netlify!
echo.
echo Opening frontend in your default web browser...
start "" "%~dp0web\index.html"
echo.
echo Frontend opened successfully.
timeout /t 3 >nul
