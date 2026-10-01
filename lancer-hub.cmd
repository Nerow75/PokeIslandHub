@echo off
rem lancer-hub.cmd
rem Lance PokeIslandHub (serveur de dev) et ouvre le navigateur. Fermer cette fenetre arrete le hub.
cd /d "%~dp0"
call npm run dev -- --open
