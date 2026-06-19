@echo off
:: Universal Bloxd CLI helper batch script
:: Compatible with Windows 10, Windows 11 and all standard CMD execution shells.
:: Run this inside your Bloxd SDK project directory.

if "%~1"=="" goto help

node "%~dp0bloxd-helper.js" %*
goto end

:help
node "%~dp0bloxd-helper.js" help
goto end

:end
