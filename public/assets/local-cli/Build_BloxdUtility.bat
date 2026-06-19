@echo off
echo ========================================================
echo   BloxdUtility Launcher Builder (.exe Compiler)
echo ========================================================
echo.
echo Make sure you have downloaded "BloxdUtility_Launcher.py"
echo into this same folder.
echo.
echo Step 1: Installing required Python packages...
pip install pywebview pyinstaller
echo.
echo Step 2: Compiling .py to .exe using PyInstaller...
pyinstaller --noconfirm --onedir --windowed "BloxdUtility_Launcher.py"
echo.
echo ========================================================
echo DONE!
echo Your BloxdUtility Launcher executable is now inside the 
echo "dist\BloxdUtility_Launcher" folder.
echo You can run the .exe from there, and it will open Bloxd.io
echo.
pause
