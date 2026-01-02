import { run } from "./client";
import fs from "fs";
import path from "path";

const MIGRATION_FILE = path.join(
  process.cwd(),
  "drizzle",
  "0000_motionless_valkyrie.sql",
);

export async function migrate() {
  console.log("🔄 Starting database migration...");

  try {
    // Read the migration SQL file
    const sql = fs.readFileSync(MIGRATION_FILE, "utf-8");

    // Split by statement breakpoints
    const statements = sql
      .split(/--> statement-breakpoint/)
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`📝 Found ${statements.length} statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}`);
        try {
          run(statement);
          console.log(`✅ Statement ${i + 1} completed`);
        } catch (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          throw error;
        }
      }
    }

    console.log("✅ Migration completed successfully!");

    // Verify tables were created
    const tables = run(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    console.log("📊 Created tables.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log("🎉 Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}
