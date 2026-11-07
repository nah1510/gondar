# Raspberry Pi SSH Remote Execution
- Host: `pi` (pi.phambaohan.id.vn) | User: `pi` (Password disabled).
- Routing: Cloudflare Tunnel via `cloudflared`.
- Required execution format in PowerShell (ensures cloudflared is in PATH):
  $env:PATH += ";C:\Program Files (x86)\cloudflared"; ssh -o BatchMode=yes pi "<COMMAND>"

# Build & Deploy Policy
- NEVER run build or deploy commands (`npm run build`, `next build`, `go build`, or remote builds/deploys on Raspberry Pi / Vercel) automatically after code changes.
- ONLY run build or deploy commands when explicitly requested by the user.
