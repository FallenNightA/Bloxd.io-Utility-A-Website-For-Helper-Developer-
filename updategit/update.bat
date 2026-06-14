@echo off
echo =======================================
echo      Starting Git Automation Script    
echo =======================================

:: 1. Stage all changes
echo Staging new files and modifications...
git add .

:: 2. Prompt for a commit message
echo.
set /p msg="Put Your Message here: "

:: If you press enter without typing anything, a default message will be used
if "%msg%"=="" set msg="Automated project files update"

:: 3. Commit locally
echo.
echo Creating code snapshot...
git commit -m "%msg%"

:: 4. Push to GitHub
echo.
echo Uploading changes to GitHub (Branch: main)...
git push origin main

echo.
echo =======================================
echo            Update Complete!            
echo =======================================
pause