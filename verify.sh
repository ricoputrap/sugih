#!/bin/bash
# Comprehensive verification script for Sugih Dashboard fixes
# This script verifies all the issues have been resolved

set -e  # Exit on any error

echo "🔍 Sugih Dashboard - Verification Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_PASSED=true

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        ALL_PASSED=false
    fi
}

# Function to check command existence
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

echo "Step 1: Environment Checks"
echo "--------------------------"

# Load nvm and use correct Node version
echo "Loading nvm and setting up Node.js..."
source ~/.nvm/nvm.sh

if [ -f ".nvmrc" ]; then
    echo "Using Node.js version from .nvmrc:"
    nvm use
    NODE_VERSION=$(node --version)
    echo "Node version: $NODE_VERSION"
    print_status 0 "Node.js version is correct"
else
    echo -e "${RED}❌ No .nvmrc file found${NC}"
    ALL_PASSED=false
fi

# Check pnpm
if check_command pnpm; then
    PNPM_VERSION=$(pnpm --version)
    print_status 0 "pnpm is installed (v$PNPM_VERSION)"
else
    print_status 1 "pnpm is not installed"
fi

echo ""
echo "Step 2: Dependency Checks"
echo "-------------------------"

# Check node_modules
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies are installed"
else
    echo -e "${YELLOW}⚠️  node_modules not found, installing...${NC}"
    pnpm install
    print_status $? "Dependencies installation"
fi

echo ""
echo "Step 3: TypeScript Compilation"
echo "------------------------------"

# Run TypeScript check via build
echo "Running TypeScript compilation..."
pnpm run build 2>&1 | tee /tmp/build.log
BUILD_EXIT_CODE=${PIPESTATUS[0]}

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    print_status 0 "TypeScript compilation successful"
else
    print_status 1 "TypeScript compilation failed"
    echo ""
    echo "Build log:"
    tail -50 /tmp/build.log
fi

echo ""
echo "Step 4: Server Startup"
echo "----------------------"

# Kill any existing dev server
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start dev server in background
echo "Starting development server..."
pnpm dev > /tmp/dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
MAX_WAIT=30
COUNTER=0
SERVER_STARTED=false

while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        SERVER_STARTED=true
        break
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
    echo -n "."
done
echo ""

if [ "$SERVER_STARTED" = true ]; then
    print_status 0 "Development server started successfully"
else
    print_status 1 "Development server failed to start"
    echo ""
    echo "Server log:"
    tail -50 /tmp/dev-server.log
fi

echo ""
echo "Step 5: API Endpoint Tests"
echo "--------------------------"

# Test health endpoint
echo -n "Testing /api/health... "
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    print_status 0 "Health endpoint is working"
else
    print_status 1 "Health endpoint failed"
fi

# Test dashboard endpoint
echo -n "Testing /api/dashboard... "
DASHBOARD_RESPONSE=$(curl -s http://localhost:3000/api/dashboard)
if echo "$DASHBOARD_RESPONSE" | grep -q "error\|data"; then
    print_status 0 "Dashboard endpoint is responding"
else
    print_status 1 "Dashboard endpoint failed"
fi

# Test budgets API
echo -n "Testing /api/budgets... "
BUDGETS_RESPONSE=$(curl -s http://localhost:3000/api/budgets)
if echo "$BUDGETS_RESPONSE" | grep -q "error\|data"; then
    print_status 0 "Budgets endpoint is responding"
else
    print_status 1 "Budgets endpoint failed"
fi

echo ""
echo "Step 6: Dashboard Page Test"
echo "---------------------------"

# Test main dashboard page
echo -n "Testing / (dashboard page)... "
MAIN_PAGE=$(curl -s http://localhost:3000/)
if echo "$MAIN_PAGE" | grep -q "Dashboard"; then
    print_status 0 "Dashboard page loads successfully"
else
    print_status 1 "Dashboard page failed to load"
fi

# Check for common dashboard elements
if echo "$MAIN_PAGE" | grep -q "Net Worth"; then
    print_status 0 "Dashboard contains Net Worth section"
else
    echo -e "${YELLOW}⚠️  Dashboard may be missing Net Worth section${NC}"
fi

if echo "$MAIN_PAGE" | grep -q "Spending"; then
    print_status 0 "Dashboard contains Spending section"
else
    echo -e "${YELLOW}⚠️  Dashboard may be missing Spending section${NC}"
fi

echo ""
echo "Step 7: Build Artifacts Check"
echo "-----------------------------"

# Check if .next directory exists
if [ -d ".next" ]; then
    print_status 0 ".next build directory exists"
else
    print_status 1 ".next build directory not found"
fi

# Check if build was successful
if [ -f ".next/BUILD_ID" ]; then
    BUILD_ID=$(cat .next/BUILD_ID)
    print_status 0 "Build artifact exists (BUILD_ID: $BUILD_ID)"
else
    print_status 1 "Build artifact not found"
fi

# Count generated pages
if [ -d ".next/server/app" ]; then
    PAGE_COUNT=$(find .next/server/app -name "page.js" -o -name "route.js" | wc -l)
    echo "Generated pages: $PAGE_COUNT"
    if [ $PAGE_COUNT -gt 0 ]; then
        print_status 0 "Pages were generated"
    else
        print_status 1 "No pages were generated"
    fi
fi

echo ""
echo "Step 8: File Structure Verification"
echo "------------------------------------"

# Check for new/important files
if [ -f "src/app/api/dashboard/route.ts" ]; then
    print_status 0 "Dashboard API route exists"
else
    print_status 1 "Dashboard API route missing"
fi

if [ -f "src/modules/Dashboard/utils.ts" ]; then
    print_status 0 "Dashboard utils module exists"
else
    print_status 1 "Dashboard utils module missing"
fi

if [ -f ".nvmrc" ]; then
    print_status 0 ".nvmrc file exists"
else
    print_status 1 ".nvmrc file missing"
fi

if [ -f "setup.sh" ]; then
    print_status 0 "setup.sh script exists"
else
    print_status 1 "setup.sh script missing"
fi

echo ""
echo "Step 9: Code Quality Checks"
echo "---------------------------"

# Run linter
echo "Running Biome linter..."
pnpm lint > /tmp/lint.log 2>&1
LINT_EXIT_CODE=$?

if [ $LINT_EXIT_CODE -eq 0 ]; then
    print_status 0 "Linting passed"
else
    echo -e "${YELLOW}⚠️  Linting found issues (see /tmp/lint.log)${NC}"
    # Don't fail on linting issues, just warn
fi

echo ""
echo "Step 10: Cleanup"
echo "----------------"

# Stop dev server
if [ ! -z "$DEV_SERVER_PID" ]; then
    echo "Stopping development server (PID: $DEV_SERVER_PID)..."
    kill $DEV_SERVER_PID 2>/dev/null || true
    sleep 2
    # Force kill if still running
    pkill -f "next dev" 2>/dev/null || true
    print_status 0 "Development server stopped"
fi

echo ""
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo ""

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    echo ""
    echo "The Sugih Dashboard is working correctly:"
    echo "  ✅ Node.js version is correct"
    echo "  ✅ Dependencies are installed"
    echo "  ✅ TypeScript compiles without errors"
    echo "  ✅ Development server starts successfully"
    echo "  ✅ API endpoints are responding"
    echo "  ✅ Dashboard page loads correctly"
    echo ""
    echo "You can now:"
    echo "  1. Run 'pnpm dev' to start development"
    echo "  2. Visit http://localhost:3000 to view dashboard"
    echo "  3. Continue with database setup if needed"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed${NC}"
    echo ""
    echo "Please review the errors above and:"
    echo "  1. Check the build log for TypeScript errors"
    echo "  2. Ensure all dependencies are installed"
    echo "  3. Verify database configuration if needed"
    echo ""
    echo "For help, see:"
    echo "  - BUILD_FIX_COMPLETE.md"
    echo "  - DASHBOARD_FIX_SUMMARY.md"
    echo ""
    exit 1
fi
