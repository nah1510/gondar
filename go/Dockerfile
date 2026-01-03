# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Cache dependencies trước (tận dụng Docker layer cache)
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ source
COPY . .

# Build binary tối ưu cho Linux (CGO off để chạy trên alpine)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /app/server ./cmd/server/main.go

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM alpine:3.21

# Certificates cho HTTPS calls (Timo API, Google Sheets, Telegram)
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Chỉ copy binary từ stage build (~10MB thay vì ~300MB)
COPY --from=builder /app/server .

# Config file (gitignored, phải mount vào khi chạy)
# docker run -v ./config.yaml:/app/config.yaml ...
EXPOSE 8080

CMD ["./server"]