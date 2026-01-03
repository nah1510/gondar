.PHONY: help go next deploy

help:
	@echo "Available commands:"
	@echo "  make go     - Run the Go backend API server"
	@echo "  make next   - Run the Next.js frontend development server"
	@echo "  make deploy - Deploy the Next.js app to Vercel manually"

go:
	@echo "Starting Go backend..."
	cd go && go run cmd/server/main.go

nx:
	@echo "Starting Next.js frontend..."
	cd nextjs && npm run dev

nb:
	@echo "Starting build Next.js..."
	cd nextjs && npm run build

nd:
	@echo "Deploying Next.js to Vercel..."
	cd nextjs && npx vercel --prod

seed:
	@echo "Running database seed..."
	cd nextjs && npx prisma db seed

