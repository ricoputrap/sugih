#!/bin/bash
# Sugih Dashboard Setup Script
# This script initializes the project with the correct Node.js version and dependencies

set -e  # Exit on any error

echo "🚀 Setting up Sugih Dashboard..."
echo ""

# Check if nvm is installed
if [ -z "$NVM_DIR" ]; then
    echo "❌ nvm not found. Please install nvm first:"
    echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "   Then restart your terminal and run this script again."
    exit 1
fi

# Load nvm
source "$NVM_DIR/nvm.sh"

# Use the Node.js version specified in .nvmrc
if [ -f ".nvmrc" ]; then
    echo "📌 Found .nvmrc with Node version: $(cat .nvmrc)"
    nvm use
else
    echo "⚠️  No .nvmrc found. Using latest LTS version..."
    nvm use --lts
fi

# Verify Node.js version
NODE_VERSION=$(node --version)
echo "✅ Using Node.js $NODE_VERSION"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

PNPM_VERSION=$(pnpm --version)
echo "✅ Using pnpm v$PNPM_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found."
    if [ -f ".env.example" ]; then
        echo "📝 Copying .env.example to .env..."
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "   Please edit .env with your database credentials."
    else
        echo "   Please create a .env file with your database configuration."
    fi
else
    echo "✅ .env file exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your database credentials (if needed)"
echo "  2. Set up your PostgreSQL database"
echo "  3. Run database migrations: pnpm db:push"
echo "  4. Start the development server: pnpm dev"
echo ""
echo "Available commands:"
echo "  pnpm dev         - Start development server"
echo "  pnpm build       - Build for production"
echo "  pnpm start       - Start production server"
echo "  pnpm lint        - Run linting"
echo "  pnpm db:push     - Push database schema"
echo "  pnpm db:migrate  - Run database migrations"
echo "  pnpm db:studio   - Open Drizzle Studio"
echo ""
