/**
 * Migration Runner for Category Type Field
 *
 * This script applies migration 0004 which adds the type field to categories table.
 * Run with: npx tsx scripts/run-migration-0004.ts
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting migration 0004: Add category type field...');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'drizzle', '0004_woozy_jackpot.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement breakpoint
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

      await pool.query(statement);
      console.log('✅ Success');
    }

    console.log('\n🎉 Migration completed successfully!');

    // Verify the migration
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'categories' AND column_name = 'type'
    `);

    if (result.rows.length > 0) {
      console.log('\n✓ Verification: type column exists');
      console.log('  Column details:', result.rows[0]);
    } else {
      console.error('❌ Verification failed: type column not found');
    }

    // Check enum type
    const enumResult = await pool.query(`
      SELECT enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'category_type'
      ORDER BY enumsortorder
    `);

    if (enumResult.rows.length > 0) {
      console.log('\n✓ Verification: category_type enum exists');
      console.log('  Values:', enumResult.rows.map(r => r.enumlabel).join(', '));
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
