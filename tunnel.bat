echo off
title Cloudflare Tunnel
echo Demarrage du tunnel Cloudflare...
cloudflared.exe tunnel --url http://localhost:8000
pause
