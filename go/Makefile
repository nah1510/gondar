# Tên tài khoản Docker Hub của bạn
DOCKER_USER=nah1510
IMAGE_NAME=timo-app
TAG=latest
.PHONY: all build docker-build push clean server

server:
	@echo "======> Running Go server locally..."
	go run cmd/server/main.go

all: build docker-build push clean

build:
	@echo "======> 1. Building Go binary for Linux..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o timo-app cmd/server/main.go

docker-build:
	@echo "======> 2. Building Docker Image..."
	docker build -t $(DOCKER_USER)/$(IMAGE_NAME):$(TAG) .

push:
	@echo "======> 3. Pushing Image to Docker Hub..."
	docker push $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)

clean:
	@echo "======> 4. Cleaning up local binary..."
	rm -f timo-app