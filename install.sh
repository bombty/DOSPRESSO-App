#!/bin/bash

# ============================================
# DOSPRESSO Franchise Management WebApp
# Automated Installation Script
# ============================================
# Usage: curl -fsSL https://your-domain/install.sh | bash
# Or: ./install.sh
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   DOSPRESSO Franchise Management WebApp                  ║"
echo "║   Automated Installation Script v1.0                     ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}Warning: Not running as root. Some operations may fail.${NC}"
  echo -e "${YELLOW}Consider running: sudo ./install.sh${NC}"
fi

# ============================================
# Step 1: Check prerequisites
# ============================================
echo -e "\n${BLUE}[1/6] Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully!${NC}"
else
    echo -e "${GREEN}Docker is already installed.${NC}"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    apt-get update && apt-get install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed successfully!${NC}"
else
    echo -e "${GREEN}Docker Compose is already installed.${NC}"
fi

# ============================================
# Step 2: Collect configuration
# ============================================
echo -e "\n${BLUE}[2/6] Configuration Setup${NC}"
echo -e "${YELLOW}Please provide the following information:${NC}\n"

# Domain
read -p "Enter your domain (e.g., dospresso.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
    echo -e "${YELLOW}Using default: localhost${NC}"
fi

# Admin Email
read -p "Enter admin email for SSL certificates: " ADMIN_EMAIL
if [ -z "$ADMIN_EMAIL" ]; then
    ADMIN_EMAIL="admin@$DOMAIN"
fi

# Database Password
read -s -p "Enter database password (or press Enter for random): " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
    echo -e "${YELLOW}Generated random database password.${NC}"
fi

# Session Secret
SESSION_SECRET=$(openssl rand -base64 32)

# SMTP Configuration
echo -e "\n${YELLOW}Email Configuration (for notifications):${NC}"
read -p "SMTP Host (e.g., smtp.ionos.de): " SMTP_HOST
read -p "SMTP Port [587]: " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}
read -p "SMTP User: " SMTP_USER
read -s -p "SMTP Password: " SMTP_PASSWORD
echo ""
read -p "From Email [noreply@$DOMAIN]: " SMTP_FROM_EMAIL
SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL:-noreply@$DOMAIN}

# OpenAI API Key (optional)
echo -e "\n${YELLOW}AI Features (optional):${NC}"
read -s -p "OpenAI API Key (press Enter to skip): " OPENAI_API_KEY
echo ""

# ============================================
# Step 3: Create environment file
# ============================================
echo -e "\n${BLUE}[3/6] Creating configuration files...${NC}"

cat > .env << EOF
# DOSPRESSO Configuration
# Generated on $(date)

DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL

POSTGRES_DB=dospresso
POSTGRES_USER=dospresso
POSTGRES_PASSWORD=$DB_PASSWORD

SESSION_SECRET=$SESSION_SECRET

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM_EMAIL=$SMTP_FROM_EMAIL

OPENAI_API_KEY=$OPENAI_API_KEY

NODE_ENV=production
EOF

chmod 600 .env
echo -e "${GREEN}Configuration saved to .env${NC}"

# ============================================
# Step 4: Create init-db.sql
# ============================================
echo -e "\n${BLUE}[4/6] Creating database initialization script...${NC}"

cat > init-db.sql << 'EOF'
-- DOSPRESSO Database Initialization
-- This script runs automatically on first startup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial admin user (password: admin123 - CHANGE THIS!)
-- The actual user creation will be handled by the application
EOF

echo -e "${GREEN}Database init script created.${NC}"

# ============================================
# Step 5: Pull and build images
# ============================================
echo -e "\n${BLUE}[5/6] Building and starting containers...${NC}"

# Start services
docker compose pull
docker compose build --no-cache
docker compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 30

# Check health
if docker compose ps | grep -q "healthy"; then
    echo -e "${GREEN}All services are healthy!${NC}"
else
    echo -e "${YELLOW}Services are starting... (this may take a minute)${NC}"
    sleep 30
fi

# ============================================
# Step 6: Run database migrations
# ============================================
echo -e "\n${BLUE}[6/6] Running database migrations...${NC}"

docker compose exec -T app npm run db:push || echo -e "${YELLOW}Migrations will run on first startup${NC}"

# ============================================
# Installation Complete
# ============================================
echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   ✅ DOSPRESSO Installation Complete!                    ║"
echo "║                                                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║   Your application is now running at:                    ║"
echo "║   https://$DOMAIN"
echo "║                                                          ║"
echo "║   Default Admin Login:                                   ║"
echo "║   - Go to the login page                                 ║"
echo "║   - Click 'Login with Replit' or setup local auth        ║"
echo "║                                                          ║"
echo "║   Useful Commands:                                       ║"
echo "║   - View logs: docker compose logs -f                    ║"
echo "║   - Stop: docker compose down                            ║"
echo "║   - Restart: docker compose restart                      ║"
echo "║   - Update: docker compose pull && docker compose up -d  ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "\n${YELLOW}Important Security Notes:${NC}"
echo "1. Change the default admin password immediately"
echo "2. Backup your .env file securely"
echo "3. Set up regular database backups"
echo ""
echo -e "${BLUE}Need help? Visit: https://github.com/dospresso/docs${NC}"
