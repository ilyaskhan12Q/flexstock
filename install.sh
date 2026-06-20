#!/bin/bash
# ── FlexStock Automated Installer ──────────────────────────────────────────────

# Text Styling Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}       FlexStock - Automated System Installer        ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"

# Helper function to print statuses
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}
log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}
log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}
log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Check for Env configuration file
if [ ! -f .env ]; then
    log_warn ".env file not found at project root. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        log_success "Created default .env file. Please customize credentials as needed."
    else
        log_error "Critical: .env.example file not found. Aborting installation."
        exit 1
    fi
else
    log_success "Found active .env configuration file."
fi

# Load Env variables
export $(grep -v '^#' .env | xargs)
log_info "Deploying instance of: ${BOLD}${APP_NAME:-FlexStock}${NC}"

# 2. Check Docker dependency
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH. Please install Docker and retry."
    exit 1
fi

# Check Docker Compose (v2 or v1)
DOCKER_COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
        log_info "Using legacy docker-compose tool wrapper."
    else
        log_error "Docker Compose is not installed. Please install docker-compose and retry."
        exit 1
    fi
fi
log_success "Docker dependencies checked successfully."

# 3. Start Database Services via Docker Compose
log_info "Spinning up PostgreSQL Database container..."
$DOCKER_COMPOSE up -d postgres

if [ $? -ne 0 ]; then
    log_error "Failed to start database container. Check docker daemon logs."
    exit 1
fi
log_success "Database container is up and running."

# Wait for Postgres to be ready for connections
log_info "Waiting for database port 5432 availability..."
until docker exec flexstock-postgres pg_isready -U postgres >/dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo ""
log_success "Database is ready to receive client connections."

# 4. Copy Environment configuration into server folder
log_info "Synchronizing environment credentials..."
cp .env server/.env
log_success "Environment files synchronized."

# 5. Installing Monorepo Dependencies
log_info "Installing monorepo NPM dependencies..."
npm install

if [ $? -ne 0 ]; then
    log_error "Failed to install NPM dependencies."
    exit 1
fi
log_success "Dependencies installed."

# 6. Apply Database Migrations & Seed data
log_info "Deploying database schemas via Prisma..."
cd server
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    log_error "Failed to deploy database migrations."
    cd ..
    exit 1
fi
log_success "Database schemas deployed successfully."

log_info "Seeding default database records (users, products, categories)..."
npm run prisma:seed

if [ $? -ne 0 ]; then
    log_warn "Seeding completed with warnings/already seeded."
else
    log_success "Database seeding finished successfully."
fi
cd ..

# 7. Final compilation build checklist
log_info "Building production bundles for React frontend..."
cd client
npm run build
if [ $? -ne 0 ]; then
    log_error "Frontend bundle compilation failed."
    cd ..
    exit 1
fi
log_success "Production frontend bundle compiled successfully under client/dist/"
cd ..

echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}       FlexStock Installation Completed!            ${NC}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "You can now run the system locally in developer mode:"
echo -e "  --> ${BOLD}npm run dev${NC}"
echo -e "For production deployment servers, serve client/dist/ assets"
echo -e "and launch server under: node server/src/index.js"
echo -e "${GREEN}${BOLD}====================================================${NC}"
