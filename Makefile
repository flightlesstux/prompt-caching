.DEFAULT_GOAL := help
.PHONY: help install build clean dev typecheck lint test test-watch benchmark verify docker-build docker-run

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  prompt-caching — available commands"
	@echo ""
	@echo "  Setup"
	@echo "    make install       Install dependencies"
	@echo ""
	@echo "  Development"
	@echo "    make build         Compile TypeScript → dist/"
	@echo "    make dev           Watch mode (rebuilds on save)"
	@echo "    make clean         Remove dist/ and coverage/"
	@echo ""
	@echo "  Quality (run before every PR)"
	@echo "    make typecheck     TypeScript type checking — zero errors required"
	@echo "    make lint          ESLint — zero warnings required"
	@echo "    make test          Run all tests"
	@echo "    make test-watch    Run tests in watch mode"
	@echo "    make benchmark     Run cache hit rate benchmarks"
	@echo "    make verify        Run typecheck + lint + test in sequence (CI equivalent)"
	@echo ""
	@echo "  Docker"
	@echo "    make docker-build  Build Docker image using node:22-alpine"
	@echo "    make docker-run    Run the MCP server in Docker"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

install:
	npm ci

# ── Development ───────────────────────────────────────────────────────────────

build:
	npm run build

dev:
	npm run dev

clean:
	rm -rf dist coverage

# ── Quality ───────────────────────────────────────────────────────────────────

typecheck:
	npm run typecheck

lint:
	npm run lint

test:
	npm run test

test-watch:
	npm run test:watch

benchmark:
	npm run benchmark

verify: typecheck lint test
	@echo ""
	@echo "  ✓ typecheck passed"
	@echo "  ✓ lint passed"
	@echo "  ✓ tests passed"
	@echo ""
	@echo "  Ready to push."
	@echo ""

# ── Docker ────────────────────────────────────────────────────────────────────

docker-build:
	docker build -t prompt-caching:local .

docker-run:
	docker run --rm -it prompt-caching:local
