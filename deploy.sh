#!/bin/bash
# ============================================================================
# Docusaurus Docs Template - Deploy Script
# ============================================================================
# Build and redeploy the docs site using Docker + Traefik.
#
# Usage:
#   bash deploy.sh              # Deploy with Traefik (default)
#   bash deploy.sh standalone   # Deploy standalone (no reverse proxy)
# ============================================================================

set -e

# Output colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MODE="${1:-traefik}"
SOURCE="${2:-git}"   # "git" = git pull (default) | "local" = files already in place
COMPOSE_BASE="docker/docker-compose"

printf "${BLUE}============================================${NC}\n"
printf "${BLUE}  Docs - Deploy (%s)${NC}\n" "${MODE}"
printf "${BLUE}============================================${NC}\n"

# 1. Update source
if [ "$SOURCE" = "local" ]; then
    printf "${YELLOW}[1/3] Using local files (skipping git pull)...${NC}\n"
else
    printf "${YELLOW}[1/3] Updating source...${NC}\n"
    git pull
fi

# 2. Pick docker-compose file based on mode
case "$MODE" in
  traefik)
    COMPOSE_FILE="${COMPOSE_BASE}.prod.traefik.yml"
    if [ ! -f .env ]; then
      printf "${YELLOW}No .env file found - creating from .env.example...${NC}\n"
      cp .env.example .env
      printf "${YELLOW}IMPORTANT: edit .env and change SECRET_KEY before production use.${NC}\n"
    fi
    ENV_FILE="--env-file .env"
    printf "${YELLOW}[2/3] Building and deploying with Traefik...${NC}\n"
    ;;
  standalone)
    COMPOSE_FILE="${COMPOSE_BASE}.prod.standalone.yml"
    ENV_FILE=""
    printf "${YELLOW}[2/3] Building and deploying standalone...${NC}\n"
    ;;
  *)
    printf "Usage: bash %s [traefik|standalone]\n" "$0"
    exit 1
    ;;
esac

# 3. Build and deploy
docker compose ${ENV_FILE} -f "${COMPOSE_FILE}" up -d --build

# 4. Verify
printf "${YELLOW}[3/3] Checking status...${NC}\n"
sleep 3
docker compose ${ENV_FILE} -f "${COMPOSE_FILE}" ps

printf "\n"
printf "${GREEN}============================================${NC}\n"
printf "${GREEN}  Deploy completed successfully!${NC}\n"
printf "${GREEN}============================================${NC}\n"

case "$MODE" in
  traefik)
    printf "  URL: https://docs.example.com/\n"
    ;;
  standalone)
    printf "  URL: http://localhost:8090/\n"
    ;;
esac
printf "\n"
