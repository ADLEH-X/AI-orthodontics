@echo off
title Ortho Papers
cd /d "%~dp0"
echo Starting Ortho Papers on http://localhost:3000 ...
node server.js --open
pause
