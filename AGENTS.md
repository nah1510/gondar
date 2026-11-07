# Raspberry Pi SSH & Deployment
- Host: `pi` (`pi.phambaohan.id.vn`), User: `pi` (SSH via `cloudflared`).
- PowerShell SSH command:
  `$env:PATH += ";C:\Program Files (x86)\cloudflared"; ssh -o BatchMode=yes pi "<COMMAND>"`
- Next.js app path on Pi: `~/gondar-nextjs` (symlinked to git repo `~/gondar/nextjs`, port `3000`).
- Systemd service: `gondar-nextjs.service`.
- Routing: `phambaohan.id.vn` -> Cloudflare Worker -> `app-gondar-pi.phambaohan.id.vn` (Pi Tunnel `http://localhost:3000`), auto-fallback to Vercel on `502/503/504/530` or 4s timeout.
- Pi deploy flow (after `git push origin main`):
  `cd ~/gondar-nextjs && git pull origin main && npm run build && sudo systemctl restart gondar-nextjs.service`

# Build & Deploy Policy
- NEVER run build or deploy commands (`npm run build`, `next build`, `go build`, or remote Pi/Vercel builds) automatically after code changes.
- ONLY run build or deploy commands when explicitly requested by the user.
