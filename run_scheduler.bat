@echo off
title WordPress Auto News Publisher Scheduler
echo ========================================================
echo  WordPress Auto News Publisher Scheduler is starting...
echo  This window will keep running to post new articles every hour.
echo  Minimize this window to keep it running in the background.
echo ========================================================
cd /d "%~dp0"
python content-factory/scripts/wp_auto_scheduler.py
pause
