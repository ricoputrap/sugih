# Sugih - Personal Finance Management

A comprehensive personal finance management application built with Next.js, PostgreSQL, and Drizzle ORM.

## Features

- **Multi-Wallet Support**: Manage multiple bank accounts, cash wallets, and e-wallets
- **Transaction Tracking**: Record income, expenses, transfers, and savings contributions
- **Category Management**: Organize transactions by categories
- **Savings Buckets**: Track savings goals and contributions
- **Budget Planning**: Set monthly budgets and track spending
- **Double-Entry Bookkeeping**: Accurate ledger with proper accounting principles

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Language**: TypeScript
- **Testing**: Vitest
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form + Zod

## Database Setup

### Prerequisites

- PostgreSQL 16+ installed locally or via Docker
- Node.js 18+ and pnpm

### Option 1: Using Docker (Recommended)

1. Clone the repository:

```bash
git clone <repository-url>
cd sugih
```

2. Start PostgreSQL using Docker Compose:

```bash
docker-compose up -d
```

3. This will start:
   - PostgreSQL database on port 5432
   - pgAdmin on port 5050 (optional, for database management)
     - Email: admin@email.com
     - Password: admin

### Option 2: Local PostgreSQL Installation

1. Install PostgreSQL 16+ on your system
2. Create a database:

```bash
createdb sugih_dev
```

3. Create a user (optional):

```bash
psql -d sugih_dev -c "CREATE USER sugih_user WITH PASSWORD 'sugih_password';"
psql -d sugih_dev -c "GRANT ALL PRIVILEGES ON DATABASE sugih_dev TO sugih_user;"
```

### Environment Configuration

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Update `.env` with your database credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://sugih_user:sugih_password@localhost:5432/sugih_dev

# PostgreSQL Connection Settings
PGHOST=localhost
PGPORT=5432
PGUSER=sugih_user
PGPASSWORD=sugih_password
PGDATABASE=sugih_dev

# Development Settings
NODE_ENV=development
PORT=3000

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Migration

1. Install dependencies:

```bash
pnpm install
```

2. Generate and run migrations:

```bash
# Generate migration files from Drizzle schema
pnpm db:generate

# Apply migrations to database
pnpm db:migrate
```

3. Verify the migration:

```bash
# Check database schema
pnpm db:studio
```

## Development

### Start Development Server

```bash
pnpm dev
```

The application will be available at http://localhost:3000

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run integration tests specifically
pnpm test tests/integration
```

### Database Management

```bash
# Generate new migration after schema changes
pnpm db:generate

# Push schema changes directly (development only)
pnpm db:push

# Open Drizzle Studio for visual database management
pnpm db:studio
```

### Code Quality

```bash
# Run linting
pnpm lint

# Format code
pnpm format
```

## API Endpoints

### Wallets

- `GET /api/wallets` - List all wallets
- `POST /api/wallets` - Create a new wallet
- `GET /api/wallets/[id]` - Get wallet by ID
- `PATCH /api/wallets/[id]` - Update wallet
- `DELETE /api/wallets/[id]` - Delete wallet

### Categories

- `GET /api/categories` - List all categories
- `POST /api/categories` - Create a new category
- `GET /api/categories/[id]` - Get category by ID
- `PATCH /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Savings Buckets

- `GET /api/savings-buckets` - List all savings buckets
- `POST /api/savings-buckets` - Create a new savings bucket
- `GET /api/savings-buckets/[id]` - Get savings bucket by ID
- `PATCH /api/savings-buckets/[id]` - Update savings bucket
- `DELETE /api/savings-buckets/[id]` - Delete savings bucket

### Transactions

- `GET /api/transactions` - List transactions with filtering
- `POST /api/transactions/expense` - Create an expense transaction
- `POST /api/transactions/income` - Create an income transaction
- `POST /api/transactions/transfer` - Create a transfer transaction
- `POST /api/transactions/savings-contribute` - Create savings contribution
- `POST /api/transactions/savings-withdraw` - Create savings withdrawal

### Budgets

- `GET /api/budgets` - List budgets for a month
- `POST /api/budgets` - Create or update monthly budgets

## Database Schema

### Core Tables

#### wallets

- `id` (text, primary key) - Wallet identifier
- `name` (varchar(255), unique) - Wallet name
- `type` (varchar(32)) - wallet type (cash, bank, ewallet, other)
- `currency` (varchar(3)) - Currency code (default: IDR)
- `archived` (boolean) - Soft delete flag
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

#### categories

- `id` (text, primary key) - Category identifier
- `name` (varchar(255), unique) - Category name
- `archived` (boolean) - Soft delete flag
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

#### savings_buckets

- `id` (text, primary key) - Savings bucket identifier
- `name` (varchar(255), unique) - Bucket name
- `description` (text) - Optional description
- `archived` (boolean) - Soft delete flag
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

#### transaction_events

- `id` (text, primary key) - Transaction identifier
- `occurred_at` (timestamp) - When the transaction occurred
- `type` (varchar(32)) - Transaction type (expense, income, transfer, etc.)
- `note` (text) - Optional note
- `payee` (text) - Optional payee information
- `category_id` (text, foreign key) - Related category
- `deleted_at` (timestamp) - Soft delete timestamp
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `idempotency_key` (varchar(36), unique) - For preventing duplicates

#### postings

- `id` (text, primary key) - Posting identifier
- `event_id` (text, foreign key) - Related transaction event
- `wallet_id` (text, foreign key) - Affected wallet
- `savings_bucket_id` (text, foreign key) - Related savings bucket
- `amount_idr` (bigint) - Amount in Indonesian Rupiah
- `created_at` (timestamp) - Creation timestamp

#### budgets

- `id` (text, primary key) - Budget identifier
- `month` (varchar(10)) - Month in YYYY-MM-01 format
- `category_id` (text, foreign key) - Related category
- `amount_idr` (bigint) - Budgeted amount in Rupiah
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- Unique index on (month, category_id)

## PostgreSQL Migration Guide

### From SQLite to PostgreSQL

This application has been migrated from SQLite to PostgreSQL. Key changes include:

1. **Data Types**:
   - `text` → `varchar(n)` for fields with known maximum lengths
   - `integer` timestamps → `timestamp with timezone`
   - Added proper UUID handling

2. **Constraints**:
   - Enhanced foreign key constraints
   - Unique constraints on business logic fields
   - Check constraints for enum values

3. **Features**:
   - Connection pooling for better performance
   - Better transaction support
   - Advanced indexing for query optimization

### Testing the Migration

Run the comprehensive integration tests to verify the migration:

```bash
pnpm test tests/integration/database.test.ts
```

These tests validate:

- All CRUD operations across modules
- Foreign key relationships
- Transaction handling
- Data integrity constraints
- Performance with proper indexing

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   └── api/               # API routes
│       ├── wallets/       # Wallet endpoints
│       ├── categories/    # Category endpoints
│       ├── savings-buckets/
│       ├── transactions/  # Transaction endpoints
│       └── budgets/       # Budget endpoints
├── db/                    # Database layer
│   ├── client.ts         # PostgreSQL client
│   ├── config.ts         # Database configuration
│   ├── helpers.ts        # Query helpers
│   └── migrate.ts        # Migration runner
├── modules/              # Business logic modules
│   ├── Wallet/           # Wallet module
│   │   ├── schema.ts     # Drizzle schema
│   │   ├── actions.ts    # Business actions
│   │   └── ...
│   ├── Category/         # Category module
│   ├── SavingsBucket/    # Savings bucket module
│   ├── Transaction/      # Transaction module
│   └── Budget/           # Budget module
└── lib/                  # Shared utilities
tests/
├── integration/          # Integration tests
│   └── database.test.ts # End-to-end database tests
└── unit/                 # Unit tests
```

## Key Features

### Double-Entry Bookkeeping

Every transaction creates balanced ledger entries (postings):

- **Expenses**: Negative posting to wallet, category tracking
- **Income**: Positive posting to wallet
- **Transfers**: Negative posting from source, positive to destination
- **Savings**: Entries to/from savings buckets with wallet tracking

### Idempotency

Transactions support idempotency keys to prevent duplicates:

- Include `idempotencyKey` in transaction requests
- Same key = same transaction (no duplicates)

### Archiving

Soft delete via `archived` flags:

- Maintains data integrity
- Preserves transaction history
- Clean separation of active/archived data

### Budget Tracking

Monthly budget planning:

- Set budgets per category per month
- Track spending against allocations
- Validate month format (YYYY-MM-01)

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running:

```bash
pg_isready -h localhost -p 5432
```

2. Check credentials in `.env`
3. Ensure database exists:

```bash
psql -l
```

4. Check Docker container status:

```bash
docker-compose ps
```

### Migration Issues

1. Reset database (development only):

```bash
dropdb sugih_dev
createdb sugih_dev
pnpm db:migrate
```

2. Generate fresh migration:

```bash
pnpm db:generate
```

### Test Failures

1. Ensure PostgreSQL is running
2. Check test database URL in environment
3. Run tests with verbose output:

```bash
pnpm test --reporter=verbose
```

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass:

```bash
pnpm test && pnpm lint
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
