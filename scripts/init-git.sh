#!/usr/bin/env bash
# init-git.sh — Helper script to push extracted release to a new/existing GitHub repo
#
# Usage:
#   ./init-git.sh                              # create new repo on GitHub (needs gh CLI)
#   ./init-git.sh https://github.com/USER/REPO.git  # push to existing repo

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_help() {
  echo "GO An Nahl — Git Init Helper"
  echo ""
  echo "Usage:"
  echo "  ./init-git.sh                                  # Create new GitHub repo via gh CLI"
  echo "  ./init-git.sh https://github.com/USER/REPO.git # Push to existing repo"
  echo "  ./init-git.sh --help                          # Show this help"
  echo ""
  echo "Prerequisites:"
  echo "  - git installed"
  echo "  - gh CLI installed (for new repo creation): https://cli.github.com/"
  echo "  - Run this script from the root of the extracted release"
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  GO An Nahl — Git Repository Initializer                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_help
  exit 0
fi

# Verify we're in the right directory
if [[ ! -f "package.json" || ! -d "src" ]]; then
  echo -e "${RED}✗${NC} This doesn't look like the GO An Nahl release directory."
  echo -e "  Run this script from inside the extracted zip folder (where package.json is)."
  exit 1
fi

# Check git is installed
if ! command -v git &>/dev/null; then
  echo -e "${RED}✗${NC} git is not installed. Install: https://git-scm.com/downloads"
  exit 1
fi

# Initialize git repo
if [[ ! -d ".git" ]]; then
  echo -e "${YELLOW}→${NC} Initializing git repository..."
  git init -b main
  echo -e "${GREEN}✓${NC} Git initialized (branch: main)"
else
  echo -e "${GREEN}✓${NC} Git repo already initialized"
fi

# Verify .gitignore is present
if [[ ! -f ".gitignore" ]]; then
  echo -e "${RED}✗${NC} .gitignore not found. Aborting to prevent committing secrets."
  exit 1
fi

# Make sure .env is ignored (double-check)
if [[ -f ".env" ]] && ! git check-ignore .env &>/dev/null; then
  echo -e "${RED}⚠ WARNING:${NC} .env exists but is not in .gitignore!"
  echo -e "  Adding .env to .gitignore..."
  echo ".env" >> .gitignore
fi

# Stage all files
echo -e "${YELLOW}→${NC} Staging files..."
git add .

# Show what will be committed
staged_count=$(git diff --cached --name-only | wc -l)
echo -e "${GREEN}✓${NC} ${staged_count} files staged for commit"

# Verify no .env or secrets in staging
if git diff --cached --name-only | grep -qE "^\.env$"; then
  echo -e "${RED}✗${NC} FATAL: .env is about to be committed! Aborting."
  exit 1
fi

if git diff --cached --name-only | grep -qE "node_modules|\.next/|/db/custom\.db"; then
  echo -e "${RED}✗${NC} FATAL: Build artifacts or local DB being committed! Aborting."
  exit 1
fi

echo -e "${GREEN}✓${NC} No secrets/build artifacts detected in staging"

# First commit
echo -e "${YELLOW}→${NC} Creating initial commit..."
git commit -m "Initial commit: GO An Nahl v0.2.1 — Rumah Tahfidz management app

- Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Prisma ORM (SQLite dev, Postgres prod)
- Firebase Auth integration (REST API + local fallback)
- PWA: installable + offline shell + push notifications
- 14 views: dashboard, santri, ustaz, kelas, kelompok, pembayaran,
  laporan, profil, users, pesan WA, firebase, database
- 41 API routes
- Vercel-ready: vercel.json + postinstall + auto-detect DB provider" --no-verify

echo -e "${GREEN}✓${NC} Initial commit created"
echo ""

# Determine remote
if [[ -n "${1:-}" ]]; then
  REMOTE_URL="$1"
elif command -v gh &>/dev/null; then
  echo -e "${BLUE}?${NC} Do you want to create a new GitHub repo via gh CLI? [Y/n]"
  read -r response
  if [[ "${response,,}" != "n" ]]; then
    echo -e "${YELLOW}→${NC} Creating new GitHub repo..."
    echo -e "  ${BLUE}?${NC} Repo name [go-an-nahl]:"
    read -r repo_name
    repo_name="${repo_name:-go-an-nahl}"
    echo -e "  ${BLUE}?${NC} Public or private? [public/private]:"
    read -r visibility
    vis_flag="--public"
    if [[ "${visibility,,}" == "private" ]]; then
      vis_flag="--private"
    fi
    gh repo create "${repo_name}" ${vis_flag} --source=. --remote=origin --push
    echo -e "${GREEN}✓${NC} Pushed to https://github.com/$(gh api user --jq .login)/${repo_name}"
    exit 0
  fi
  echo -e "${YELLOW}→${NC} Skipping GitHub repo creation."
  echo -e "  To push manually later, add a remote:"
  echo -e "    git remote add origin https://github.com/USERNAME/REPO.git"
  echo -e "    git push -u origin main"
  exit 0
else
  echo -e "${YELLOW}→${NC} gh CLI not found."
  echo -e "  To install: https://cli.github.com/"
  echo -e "  Or push manually:"
  echo -e "    git remote add origin https://github.com/USERNAME/REPO.git"
  echo -e "    git push -u origin main"
  exit 0
fi

# Push to existing remote
echo -e "${YELLOW}→${NC} Adding remote: ${REMOTE_URL}"
git remote remove origin 2>/dev/null || true
git remote add origin "${REMOTE_URL}"
echo -e "${GREEN}✓${NC} Remote added"

echo -e "${YELLOW}→${NC} Pushing to origin/main..."
git push -u origin main

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Successfully pushed to GitHub!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Next steps for Vercel deploy:"
echo -e "  1. Buka https://vercel.com/new"
echo -e "  2. Import repo ini"
echo -e "  3. Set env vars (lihat DEPLOY.md)"
echo -e "  4. Deploy!"
echo -e "  5. Setelah deploy: curl -X POST https://your-app.vercel.app/api/seed"
