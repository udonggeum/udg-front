.PHONY: all init install dev build test lint clean docker-build docker-run docker-stop docker-clean pushall help

# Docker configuration
DOCKER_REGISTRY := ghcr.io/udonggeum
DOCKER_IMAGE := udonggeum-frontend
DOCKER_TAG := $(shell cat VERSION)
DOCKER_FULL_IMAGE := $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)

# Default target
all: build

# Help command
help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make build        - Build for production"
	@echo "  make lint         - Run ESLint"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "Docker commands:"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo "  make docker-stop  - Stop Docker container"
	@echo "  make docker-clean - Remove Docker image and container"
	@echo "  make docker-tag   - Show current Docker tag"
	@echo "  make pushall      - Build and push to GitHub Container Registry"
	@echo ""
	@echo "Current version: $(DOCKER_TAG)"

# Initialize project
init:
	@echo "Initializing project..."
	@$(MAKE) install

# Install dependencies
install:
	@echo "Installing dependencies..."
	@npm ci

# Start development server
dev:
	@echo "Starting development server..."
	@npm run dev

# Build for production
build:
	@echo "Building for production..."
	@npm run build

# Run linter
lint:
	@echo "Running ESLint..."
	@npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf .next
	@rm -rf out
	@rm -rf node_modules/.cache
	@echo "Clean complete!"

# Docker: Build image
docker-build:
	@echo "Building Docker image: $(DOCKER_FULL_IMAGE)"
	@docker build -t $(DOCKER_FULL_IMAGE) .
	@echo "Docker image built successfully!"

# Docker: Run container
docker-run:
	@echo "Running Docker container..."
	@docker run -d --name udonggeum-frontend-renewal -p 3000:3000 $(DOCKER_FULL_IMAGE)
	@echo "Container started! Access at http://localhost:3000"

# Docker: Stop container
docker-stop:
	@echo "Stopping Docker container..."
	@docker stop udonggeum-frontend-renewal 2>/dev/null || true
	@docker rm udonggeum-frontend-renewal 2>/dev/null || true
	@echo "Container stopped!"

# Docker: Clean up
docker-clean: docker-stop
	@echo "Removing Docker image..."
	@docker rmi $(DOCKER_FULL_IMAGE) 2>/dev/null || true
	@echo "Docker cleanup complete!"

# Build and push to GitHub Container Registry
pushall:
	@echo "Building and pushing Docker image to GHCR..."
	@echo "Image: $(DOCKER_FULL_IMAGE)"
	@docker build -t $(DOCKER_FULL_IMAGE) .
	@docker push $(DOCKER_FULL_IMAGE)
	@echo "Push complete!"

# Show current Docker tag
docker-tag:
	@echo "Current Docker tag: $(DOCKER_TAG)"
	@echo "Full image name: $(DOCKER_FULL_IMAGE)"

# Docker Compose: Start all services
compose-up:
	@echo "Starting all services with docker-compose..."
	@docker-compose up -d --build

# Docker Compose: Stop all services
compose-down:
	@echo "Stopping all services..."
	@docker-compose down

# Docker Compose: View logs
compose-logs:
	@docker-compose logs -f

# Full cleanup (node_modules, .next, docker)
clean-all: clean docker-clean
	@echo "Removing node_modules..."
	@rm -rf node_modules
	@echo "Full cleanup complete!"
