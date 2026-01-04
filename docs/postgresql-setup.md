# PostgreSQL Setup Guide

This guide provides comprehensive instructions for setting up PostgreSQL for the Sugih personal finance management application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation Options](#installation-options)
- [Docker Setup (Recommended)](#docker-setup-recommended)
- [Local Installation](#local-installation)
- [Environment Configuration](#environment-configuration)
- [Database Migration](#database-migration)
- [Database Management Tools](#database-management-tools)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

Sugih uses PostgreSQL 16 as its primary database with the following features:

- **Connection pooling** for efficient resource utilization
- **Drizzle ORM** for type-safe database operations
- **Migration system** for version-controlled schema changes
- **Comprehensive indexing** for optimal query performance
- **ACID compliance** for data integrity

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18.0 or higher
- **pnpm** (preferred) or npm
- **Docker & Docker Compose** (for containerized setup)
- **Git** for version control

Check your versions:

```bash
node --version  # Should be v18+
pnpm --version  # Should be 8+
docker --version
docker-compose --version
```

## Installation Options

You have two options for PostgreSQL setup:

### Option 1: Docker (Recommended) ✅

- **Pros**: Isolated environment, easy setup, consistent across team
- **Cons**: Requires Docker Desktop
- **Best for**: Development, team consistency

### Option 2: Local Installation ✅

- **Pros**: Direct access, potentially better performance
- **Cons**: More complex setup, system-specific configuration
- **Best for**: Production, developers who prefer native tools

Choose the option that best fits your workflow. This guide covers both.

## Docker Setup (Recommended)

Docker provides a consistent, isolated PostgreSQL environment that's identical across all developers and deployment environments.

### Step 1: Start PostgreSQL Container

The project includes a `docker-compose.yml` file configured for Sugih:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: sugih-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sugih_user
      POSTGRES_PASSWORD: sugih_password
      POSTGRES_DB: sugih_dev
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./drizzle:/app/drizzle:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sugih_user -d sugih_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sugih-network

  postgres-admin:
    image: dpage/pgadmin4:latest
    container_name: sugih-postgres-admin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@gmail.com
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_CONFIG_SERVER_MODE: "False"
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sugih-network

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  sugih-network:
    driver: bridge
```

Start the services:

```bash
# Start PostgreSQL and pgAdmin in background
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs postgres
```

### Step 2: Verify PostgreSQL is Running

```bash
# Check container is healthy
docker-compose ps

# Should show "Up (healthy)" for postgres service

# Test connection
docker-compose exec postgres pg_isready -U sugih_user -d sugih_dev

# Expected output: postgres:5432 - accepting connections
```

### Step 3: Connect to PostgreSQL

```bash
# Connect via psql
docker-compose exec postgres psql -U sugih_user -d sugih_dev

# Or from host (requires psql installed)
psql -h localhost -U sugih_user -d sugih_dev
```

### Step 4: Optional - Access pgAdmin

1. Open browser to http://localhost:5050
2. Login with:
   - **Email**: admin@gmail.com
   - **Password**: admin
3. Add a new server connection:
   - **Name**: Sugih Development
   - **Host**: postgres (container name)
   - **Port**: 5432
   - **Database**: sugih_dev
   - **Username**: sugih_user
   - **Password**: sugih_password

### Docker Management Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ destroys data)
docker-compose down -v

# Restart services
docker-compose restart

# View logs
docker-compose logs -f postgres

# Execute SQL directly
docker-compose exec postgres psql -U sugih_user -d sugih_dev -c "SELECT version();"

# Access PostgreSQL shell
docker-compose exec postgres bash
```

### Troubleshooting Docker Issues

#### Port Already in Use

If port 5432 is already in use:

```bash
# Find what's using the port
lsof -i :5432

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

#### Container Won't Start

```bash
# Check logs for errors
docker-compose logs postgres

# Common issues:
# 1. Port conflict
# 2. Insufficient permissions
# 3. Corrupted volume

# Reset everything
docker-compose down -v
docker system prune -f
docker-compose up -d
```

#### Permission Denied

```bash
# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended)
sudo docker-compose up -d
```

## Local Installation

For developers who prefer native PostgreSQL installation.

### macOS

Using Homebrew:

```bash
# Install PostgreSQL 16
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create development database
createdb sugih_dev

# Create user (optional)
psql -d sugih_dev -c "CREATE USER sugih_user WITH PASSWORD 'sugih_password';"
psql -d sugih_dev -c "GRANT ALL PRIVILEGES ON DATABASE sugih_dev TO sugih_user;"
```

### Ubuntu/Debian

```bash
# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install postgresql-16

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user
sudo -u postgres psql

# In psql shell:
CREATE DATABASE sugih_dev;
CREATE USER sugih_user WITH PASSWORD 'sugih_password';
GRANT ALL PRIVILEGES ON DATABASE sugih_dev TO sugih_user;
\q
```

### Windows

1. Download PostgreSQL 16 from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer with default settings
3. During installation:
   - **Port**: 5432
   - **Password**: (remember this)
   - **Database**: postgres (default)
4. After installation:
   ```cmd
   # Open pgAdmin or psql
   createdb sugih_dev
   ```
5. Create user via pgAdmin or psql:
   ```sql
   CREATE USER sugih_user WITH PASSWORD 'sugih_password';
   GRANT ALL PRIVILEGES ON DATABASE sugih_dev TO sugih_user;
   ```

### Verify Local Installation

```bash
# Test connection
psql -h localhost -U postgres -d sugih_dev

# Or with specific user
psql -h localhost -U sugih_user -d sugih_dev

# Check PostgreSQL version
psql -h localhost -U sugih_user -d sugih_dev -c "SELECT version();"

# Expected output: PostgreSQL 16.x
```

## Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env
```

### Step 2: Configure Database Variables

Edit `.env` file with your database configuration:

```env
# ==============================================
# DATABASE CONFIGURATION
# ==============================================

# Primary connection string (used by application)
DATABASE_URL=postgresql://sugih_user:sugih_password@localhost:5432/sugih_dev

# Individual PostgreSQL connection parameters
PGHOST=localhost
PGPORT=5432
PGUSER=sugih_user
PGPASSWORD=sugih_password
PGDATABASE=sugih_dev

# SSL Configuration (set to 'require' in production)
PGSSL=false

# Connection Pool Settings
PGPOOL_MIN=2
PGPOOL_MAX=10

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================

NODE_ENV=development
PORT=3000

# Public application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================
# OPTIONAL: ADMIN INTERFACE
# ==============================================

# Drizzle Studio (database GUI)
# Access at http://localhost:3000/drizzle
ENABLE_DRIZZLE_STUDIO=true

# pgAdmin (if using Docker)
# Access at http://localhost:5050
ENABLE_PGADMIN=false
```

### Step 3: Validate Configuration

Test your configuration:

```bash
# Validate DATABASE_URL format
node -e "console.log(process.env.DATABASE_URL)"

# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  } else {
    console.log('✓ Database connected successfully');
    console.log('Current time:', res.rows[0].now);
    pool.end();
  }
});
"
```

### Development vs Production

#### Development (.env.development)

```env
NODE_ENV=development
DATABASE_URL=postgresql://sugih_user:sugih_password@localhost:5432/sugih_dev
PGSSL=false
ENABLE_DRIZZLE_STUDIO=true
```

#### Production (.env.production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://sugih_user:secure_password@prod-host:5432/sugih_prod
PGSSL=true
PGPOOL_MAX=20
ENABLE_DRIZZLE_STUDIO=false
```

## Database Migration

### Initial Setup

After PostgreSQL is running and configured:

```bash
# 1. Install dependencies
pnpm install

# 2. Generate initial migration
pnpm db:generate

# Expected output:
# Generated new migration: drizzle/0000_welcome_newsprint.sql

# 3. Apply migration to database
pnpm db:migrate

# Expected output:
# Migration completed successfully

# 4. Verify schema
pnpm db:studio
```

### Migration Workflow

When you modify database schema:

```bash
# 1. Make changes to schema files
#    Edit: src/modules/*/schema.ts

# 2. Generate migration
pnpm db:generate

# 3. Review generated SQL
cat drizzle/0001_your_migration_name.sql

# 4. Apply migration
pnpm db:migrate

# 5. Verify changes
pnpm db:studio
```

### Common Migration Commands

```bash
# Generate new migration
pnpm db:generate

# Apply all pending migrations
pnpm db:migrate

# Reset database (development only)
pnpm db:push --force-reset

# Check migration status
pnpm drizzle-kit status

# Create migration rollback (if needed)
# (PostgreSQL doesn't auto-create rollbacks, write custom SQL)

# Generate TypeScript types
pnpm drizzle-kit generate:pg
```

### Schema Management Best Practices

1. **Always review migrations** before applying:

   ```bash
   cat drizzle/0001_new_migration.sql
   ```

2. **Test migrations** in development first:

   ```bash
   # Test on development database
   pnpm db:migrate

   # Verify schema
   pnpm db:studio
   ```

3. **Use descriptive migration names**:

   ```bash
   # Good
   pnpm db:generate --name add-budget-timestamps

   # Less descriptive
   pnpm db:generate
   ```

4. **Never edit generated migrations**:
   - If you need changes, create a new migration
   - Or reset development database and regenerate

### Migration File Structure

```
drizzle/
├── 0000_welcome.sql              # Initial migration
├── 0001_add_wallets_table.sql    # Add wallets
├── 0002_add_categories.sql       # Add categories
├── meta/
│   └── _journal.json            # Migration journal
└── migration.test.ts            # Migration validation tests
```

### Database Reset (Development Only)

When things go wrong in development:

```bash
# ⚠️ WARNING: This deletes all data

# Option 1: Using Drizzle (recommended)
pnpm db:push --force-reset

# Option 2: Manual reset
psql -h localhost -U sugih_user -d sugih_dev -c "DROP SCHEMA public CASCADE;"
psql -h localhost -U sugih_user -d sugih_dev -c "CREATE SCHEMA public;"
pnpm db:migrate

# Option 3: Docker (destroys data)
docker-compose down -v
docker-compose up -d
pnpm db:migrate
```

## Database Management Tools

### Drizzle Studio

Visual database management built into the project:

```bash
# Start development server with Studio
pnpm dev

# Access at:
# http://localhost:3000/drizzle
```

Features:

- Browse tables and data
- Execute SQL queries
- Visual schema viewer
- Real-time updates

### pgAdmin (Docker)

Web-based PostgreSQL administration:

```bash
# Access at:
# http://localhost:5050

# Login:
# Email: admin@gmail.com
# Password: admin

# Add Server:
# Name: Sugih Development
# Host: postgres
# Port: 5432
# Database: sugih_dev
# Username: sugih_user
# Password: sugih_password
```

### Command Line Tools

#### psql (PostgreSQL CLI)

```bash
# Connect to database
psql -h localhost -U sugih_user -d sugih_dev

# Useful psql commands:
\dt              # List tables
\d table_name    # Describe table
\l               # List databases
\du              # List users
\di              # List indexes
\ds              # List sequences
\dp              # List table privileges

# Execute SQL from file
\i schema.sql

# Quit
\q
```

#### Docker psql

```bash
# Connect via Docker
docker-compose exec postgres psql -U sugih_user -d sugih_dev

# Execute SQL command
docker-compose exec postgres psql -U sugih_user -d sugih_dev -c "SELECT version();"

# Import SQL file
docker-compose exec -i postgres psql -U sugih_user -d sugih_dev < schema.sql

# Export data
docker-compose exec postgres pg_dump -U sugih_user -d sugih_dev > backup.sql
```

## Performance Tuning

### Connection Pooling

The application uses connection pooling via the `postgres` library:

```typescript
// src/db/client.ts
const sql = postgres(config.url, {
  host: config.host,
  port: config.port,
  // ... other config
  max: config.maxConnections, // Default: 10 connections
  idle_timeout: config.idleTimeout, // Default: 30000ms
  connection_timeout: config.connectionTimeout, // Default: 5000ms
});
```

**Configuration** (in `.env`):

```env
PGPOOL_MIN=2           # Minimum connections
PGPOOL_MAX=10          # Maximum connections
PGPOOL_IDLE_TIMEOUT=30000    # Close idle connections after 30s
PGPOOL_CONNECTION_TIMEOUT=5000  # Connection timeout 5s
```

### Database Optimization

#### Indexes

The migration creates optimized indexes:

```sql
-- Budget month-category unique index
CREATE UNIQUE INDEX budget_month_category_idx ON budgets (month, category_id);

-- Transaction idempotency index
CREATE UNIQUE INDEX transaction_events_idempotency_key_idx ON transaction_events (idempotency_key);

-- Foreign key indexes (automatic)
-- PostgreSQL creates indexes on foreign keys automatically
```

**Query Performance**:

```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM budgets WHERE month = '2025-01-01';

-- View all indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

#### Query Optimization

1. **Use parameterized queries** (automatic with Drizzle):

   ```typescript
   // Good
   await sql`SELECT * FROM wallets WHERE id = ${walletId}`;

   // Avoid (SQL injection risk)
   await sql`SELECT * FROM wallets WHERE id = '${walletId}'`;
   ```

2. **Use appropriate data types**:

   ```typescript
   // Good: Specific varchar length
   name: varchar("name", { length: 255 }).notNull();

   // Less optimal: Unlimited text
   name: text().notNull();
   ```

3. **Leverage indexes**:

   ```typescript
   // Query will use index
   await sql`SELECT * FROM budgets WHERE month = ${month}`;

   // Query won't use index (function on column)
   await sql`SELECT * FROM budgets WHERE EXTRACT(MONTH FROM month) = 1`;
   ```

### Monitoring

#### Check Connection Pool

```typescript
// src/db/client.ts
const pool = getDb();

// Get pool statistics
console.log(pool.pool.activeCount); // Active connections
console.log(pool.pool.idleCount); // Idle connections
console.log(pool.pool.waitingCount); // Waiting requests
```

#### Query Performance

```bash
# Enable query logging (development)
# Add to PostgreSQL configuration or connection:
LOGGING_LEVEL=debug
```

Or monitor slow queries:

```sql
-- Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- View slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions**:

```bash
# Check PostgreSQL is running
# Docker:
docker-compose ps
docker-compose logs postgres

# Local:
brew services list | grep postgresql
sudo systemctl status postgresql

# Check port
lsof -i :5432

# Test connection
psql -h localhost -U sugih_user -d sugih_dev
```

#### 2. Authentication Failed

**Error**: `FATAL: password authentication failed for user "sugih_user"`

**Solutions**:

```bash
# Reset password (PostgreSQL)
psql -U postgres -c "ALTER USER sugih_user WITH PASSWORD 'sugih_password';"

# Check pg_hba.conf for authentication method
# Should be 'md5' or 'scram-sha-256' for password auth

# Or create user with password
psql -U postgres -c "CREATE USER sugih_user WITH PASSWORD 'sugih_password';"
```

#### 3. Database Does Not Exist

**Error**: `FATAL: database "sugih_dev" does not exist`

**Solutions**:

```bash
# Create database
# Docker:
docker-compose exec postgres createdb -U sugih_user sugih_dev

# Local:
createdb sugih_dev
psql -U postgres -c "CREATE DATABASE sugih_dev OWNER sugih_user;"

# List databases
psql -U sugih_user -c "\l"
```

#### 4. Migration Failed

**Error**: Migration fails with constraint or syntax errors

**Solutions**:

```bash
# Check migration SQL
cat drizzle/0001_migration.sql

# Verify schema
pnpm db:studio

# Reset and retry (development only)
pnpm db:push --force-reset
pnpm db:generate
pnpm db:migrate

# Manual fix: Apply specific migration
psql -h localhost -U sugih_user -d sugih_dev -f drizzle/0001_migration.sql
```

#### 5. Port Already in Use

**Error**: `Error: bind EADDRINUSE: address already in use :::5432`

**Solutions**:

```bash
# Find process using port
lsof -i :5432
netstat -tulpn | grep 5432

# Change PostgreSQL port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead

# Or kill process
kill -9 <PID>
```

#### 6. Disk Space Issues

**Error**: `FATAL: could not write to log file: No space left on device`

**Solutions**:

```bash
# Check disk space
df -h

# Clean up Docker volumes (⚠️ destroys data)
docker-compose down -v
docker system prune -a

# Or move data directory
# Edit docker-compose.yml:
volumes:
  - /path/to/larger/disk/postgres_data:/var/lib/postgresql/data
```

### Debugging Tools

#### Check Database Status

```bash
# Docker
docker-compose exec postgres pg_isready -U sugih_user -d sugih_dev
docker-compose logs postgres

# Local
pg_isready -h localhost -p 5432 -U sugih_user

# Via application
node -e "
const { getDb } = require('./src/db/client');
const db = getDb();
db\`SELECT 1\`.then(() => console.log('✓ Database connected'))
   .catch(err => console.error('✗ Connection failed:', err.message));
"
```

#### Inspect Schema

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Describe table structure
\d+ wallets

-- Check constraints
SELECT conname, contype, confupdtype, confdeltype
FROM pg_constraint
WHERE conrelid = 'wallets'::regclass;

-- View indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'wallets';
```

#### Monitor Connections

```sql
-- Active connections
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE state = 'active';

-- Connection count by state
SELECT state, COUNT(*)
FROM pg_stat_activity
GROUP BY state;
```

## Best Practices

### Development Workflow

1. **Start PostgreSQL first**:

   ```bash
   # Start database before starting app
   docker-compose up -d
   pnpm dev
   ```

2. **Use migrations for schema changes**:
   - Never manually alter database schema
   - Always generate and review migrations
   - Test migrations in development

3. **Keep .env updated**:
   - Don't commit .env to git
   - Use .env.example for template
   - Document any new environment variables

### Database Design

1. **Use appropriate data types**:

   ```typescript
   // Good: Specific constraints
   name: varchar("name", { length: 255 }).notNull();

   // Good: Unconstrained text
   description: text();

   // Good: Structured data
   amount: bigint("amount_idr", { mode: "number" }).notNull();
   ```

2. **Leverage PostgreSQL features**:
   - Timestamps with timezone: `timestamp with timezone`
   - UUID for IDs: `text` (or `uuid` type)
   - Enums for constrained values: `varchar` with check constraint
   - Unique constraints for data integrity

3. **Index wisely**:
   - Foreign keys (automatic)
   - Frequently queried columns
   - Unique constraints
   - Composite indexes for multi-column queries

### Query Optimization

1. **Use parameterized queries**:

   ```typescript
   // Good
   await sql`SELECT * FROM wallets WHERE id = ${id}`;

   // Avoid
   await sql`SELECT * FROM wallets WHERE id = '${id}'`;
   ```

2. **Select only needed columns**:

   ```typescript
   // Good
   await sql`SELECT id, name FROM wallets`;

   // Less efficient
   await sql`SELECT * FROM wallets`;
   ```

3. **Use pagination for large datasets**:

   ```typescript
   // Good
   await sql`SELECT * FROM transactions LIMIT 50 OFFSET ${offset}`;

   // Avoid for large tables
   await sql`SELECT * FROM transactions`;
   ```

### Security

1. **Never commit credentials**:

   ```gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use SSL in production**:

   ```env
   PGSSL=true
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

3. **Principle of least privilege**:
   ```sql
   -- Create read-only user
   CREATE USER app_readonly WITH PASSWORD 'password';
   GRANT CONNECT ON DATABASE sugih_dev TO app_readonly;
   GRANT USAGE ON SCHEMA public TO app_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
   ```

### Testing

1. **Use test database**:

   ```env
   # Separate test database
   TEST_DATABASE_URL=postgresql://sugih_user:sugih_password@localhost:5432/sugih_test
   ```

2. **Clean up test data**:

   ```typescript
   // In test setup/teardown
   beforeEach(async () => {
     await sql`DELETE FROM test_table WHERE id LIKE 'test_%'`;
   });
   ```

3. **Test migrations**:
   ```typescript
   // drizzle/migration.test.ts
   describe("Migration validation", () => {
     it("should apply all migrations successfully", async () => {
       // Test migration execution
     });
   });
   ```

## Additional Resources

### Official Documentation

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Postgres.js (Node.js driver)](https://github.com/porsager/postgres)

### Useful Commands Reference

```bash
# Docker
docker-compose up -d              # Start services
docker-compose down              # Stop services
docker-compose logs -f postgres  # View logs
docker-compose exec postgres psql -U sugih_user -d sugih_dev  # Connect

# Database
psql -h localhost -U sugih_user -d sugih_dev  # Connect
pg_dump sugih_dev > backup.sql   # Backup
pg_restore backup.sql            # Restore

# Project
pnpm db:generate                 # Generate migration
pnpm db:migrate                  # Apply migration
pnpm db:studio                   # Open database GUI
pnpm test                        # Run tests
```

### Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review PostgreSQL logs: `docker-compose logs postgres`
3. Check application logs for specific errors
4. Verify environment configuration
5. Test database connection manually with psql

For team-specific issues, ensure everyone uses the same PostgreSQL version and configuration.

---

**Last Updated**: January 2024  
**PostgreSQL Version**: 16.x  
**Drizzle ORM Version**: 0.45.x
