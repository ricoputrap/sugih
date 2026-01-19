/**
 * Savings Bucket Integration Tests
 *
 * Tests for Savings Bucket module using Drizzle ORM with raw SQL patterns.
 * Follows the same structure as Wallet module integration tests.
 */

import { describe, it, expect, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listSavingsBuckets,
  getSavingsBucketById,
  createSavingsBucket,
  updateSavingsBucket,
  archiveSavingsBucket,
  restoreSavingsBucket,
  deleteSavingsBucket,
  getSavingsBucketStats,
} from "./actions";
import { getPool, closeDb } from "@/db/drizzle-client";

describe("Savings Bucket Integration Tests", () => {
  const testBucketIds: string[] = [];

  async function cleanupTestBucket(id: string) {
    const pool = getPool();
    try {
      // Clean up postings first if any
      await pool.query(`DELETE FROM postings WHERE savings_bucket_id = $1`, [
        id,
      ]);
      // Clean up savings bucket
      await pool.query(`DELETE FROM savings_buckets WHERE id = $1`, [id]);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  afterEach(async () => {
    for (const id of testBucketIds) {
      await cleanupTestBucket(id);
    }
    testBucketIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Savings Bucket", () => {
    it("should create a new savings bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Test Bucket ${nanoid()}`,
        description: "Test description",
      });
      testBucketIds.push(bucket.id);

      expect(bucket.id).toBeDefined();
      expect(bucket.name).toMatch(/Test Bucket/);
      expect(bucket.description).toBe("Test description");
      expect(bucket.archived).toBe(false);
    });

    it("should create bucket with null description", async () => {
      const bucket = await createSavingsBucket({
        name: `Null Desc ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      expect(bucket.description).toBeNull();
    });

    it("should reject duplicate bucket name", async () => {
      const name = `Duplicate ${nanoid()}`;
      const bucket = await createSavingsBucket({ name });
      testBucketIds.push(bucket.id);

      await expect(createSavingsBucket({ name })).rejects.toThrow(
        "already exists",
      );
    });

    it("should reject empty bucket name", async () => {
      await expect(
        createSavingsBucket({ name: "", description: "Test" }),
      ).rejects.toThrow();
    });
  });

  describe("List Savings Buckets", () => {
    it("should list all buckets ordered by name", async () => {
      const b1 = await createSavingsBucket({ name: `Zebra ${nanoid()}` });
      const b2 = await createSavingsBucket({ name: `Alpha ${nanoid()}` });
      testBucketIds.push(b1.id, b2.id);

      const allBuckets = await listSavingsBuckets();
      const testBuckets = allBuckets.filter((b) =>
        testBucketIds.includes(b.id),
      );

      expect(testBuckets).toHaveLength(2);
      expect(testBuckets[0].name).toContain("Alpha");
      expect(testBuckets[1].name).toContain("Zebra");
    });

    it("should include archived buckets", async () => {
      const bucket = await createSavingsBucket({
        name: `Archive Test ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      await archiveSavingsBucket(bucket.id);

      const allBuckets = await listSavingsBuckets();
      const found = allBuckets.find((b) => b.id === bucket.id);

      expect(found).toBeDefined();
      expect(found?.archived).toBe(true);
    });
  });

  describe("Get Savings Bucket by ID", () => {
    it("should return bucket when ID exists", async () => {
      const bucket = await createSavingsBucket({
        name: `Get Test ${nanoid()}`,
        description: "For get by ID test",
      });
      testBucketIds.push(bucket.id);

      const retrieved = await getSavingsBucketById(bucket.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(bucket.id);
      expect(retrieved?.name).toBe(bucket.name);
      expect(retrieved?.description).toBe("For get by ID test");
    });

    it("should return null when ID does not exist", async () => {
      const retrieved = await getSavingsBucketById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("Update Savings Bucket", () => {
    it("should update bucket name", async () => {
      const bucket = await createSavingsBucket({
        name: `Original ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      const newName = `Updated ${nanoid()}`;
      const updated = await updateSavingsBucket(bucket.id, { name: newName });

      expect(updated.name).toBe(newName);
    });

    it("should update bucket description", async () => {
      const bucket = await createSavingsBucket({
        name: `Desc Test ${nanoid()}`,
        description: "Original description",
      });
      testBucketIds.push(bucket.id);

      const updated = await updateSavingsBucket(bucket.id, {
        description: "New description",
      });

      expect(updated.description).toBe("New description");
    });

    it("should reject duplicate name on update", async () => {
      const bucket1 = await createSavingsBucket({
        name: `First ${nanoid()}`,
      });
      const bucket2 = await createSavingsBucket({
        name: `Second ${nanoid()}`,
      });
      testBucketIds.push(bucket1.id, bucket2.id);

      await expect(
        updateSavingsBucket(bucket1.id, { name: bucket2.name }),
      ).rejects.toThrow("already exists");
    });
  });

  describe("Archive Savings Bucket", () => {
    it("should archive an active bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Archive ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      const archived = await archiveSavingsBucket(bucket.id);

      expect(archived.archived).toBe(true);
    });

    it("should reject archiving already archived bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Already ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      await archiveSavingsBucket(bucket.id);

      await expect(archiveSavingsBucket(bucket.id)).rejects.toThrow(
        "already archived",
      );
    });
  });

  describe("Restore Savings Bucket", () => {
    it("should restore an archived bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Restore ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      await archiveSavingsBucket(bucket.id);
      const restored = await restoreSavingsBucket(bucket.id);

      expect(restored.archived).toBe(false);
    });

    it("should reject restoring non-archived bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Not Archived ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      await expect(restoreSavingsBucket(bucket.id)).rejects.toThrow(
        "not archived",
      );
    });
  });

  describe("Delete Savings Bucket", () => {
    it("should permanently delete a bucket with no transactions", async () => {
      const bucket = await createSavingsBucket({
        name: `Delete ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      await deleteSavingsBucket(bucket.id);

      const retrieved = await getSavingsBucketById(bucket.id);
      expect(retrieved).toBeNull();
    });

    it("should reject deleting bucket with transactions", async () => {
      const bucket = await createSavingsBucket({
        name: `With Transactions ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      // Create a posting for this bucket
      const pool = getPool();
      const walletId = "cPRN4GwjAn0EhLig1KJla"; // Use existing wallet
      const eventId = nanoid();
      const postingId = nanoid();
      const now = new Date();

      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at)
         VALUES ($1, $2, 'expense', $3, $4)`,
        [eventId, now, now, now],
      );

      await pool.query(
        `INSERT INTO postings (id, event_id, wallet_id, savings_bucket_id, amount_idr, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [postingId, eventId, walletId, bucket.id, 100000, now],
      );

      await expect(deleteSavingsBucket(bucket.id)).rejects.toThrow(
        "Cannot delete savings bucket with existing transactions",
      );
    });
  });

  describe("Get Savings Bucket Stats", () => {
    it("should return zero stats for empty bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Stats Zero ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      const stats = await getSavingsBucketStats(bucket.id);

      expect(stats.transactionCount).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.currentBalance).toBe(0);
    });

    it("should return correct stats with transactions", async () => {
      const bucket = await createSavingsBucket({
        name: `Stats ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      // Create postings for this bucket
      const pool = getPool();
      const walletId = "cPRN4GwjAn0EhLig1KJla"; // Use existing wallet
      const now = new Date();

      // Income posting
      const eventId1 = nanoid();
      const postingId1 = nanoid();
      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at)
         VALUES ($1, $2, 'income', $3, $4)`,
        [eventId1, now, now, now],
      );
      await pool.query(
        `INSERT INTO postings (id, event_id, wallet_id, savings_bucket_id, amount_idr, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [postingId1, eventId1, walletId, bucket.id, 1000000, now],
      );

      // Expense posting
      const eventId2 = nanoid();
      const postingId2 = nanoid();
      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at)
         VALUES ($1, $2, 'expense', $3, $4)`,
        [eventId2, now, now, now],
      );
      await pool.query(
        `INSERT INTO postings (id, event_id, wallet_id, savings_bucket_id, amount_idr, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [postingId2, eventId2, walletId, bucket.id, -300000, now],
      );

      const stats = await getSavingsBucketStats(bucket.id);

      expect(stats.transactionCount).toBe(2);
      expect(stats.totalAmount).toBe(700000);
      expect(stats.currentBalance).toBe(700000);
    });

    it("should not count deleted transactions", async () => {
      const bucket = await createSavingsBucket({
        name: `Deleted ${nanoid()}`,
      });
      testBucketIds.push(bucket.id);

      // Create a deleted posting
      const pool = getPool();
      const walletId = "cPRN4GwjAn0EhLig1KJla"; // Use existing wallet
      const eventId = nanoid();
      const postingId = nanoid();
      const now = new Date();

      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, deleted_at, created_at, updated_at)
         VALUES ($1, $2, 'expense', $3, $4, $5)`,
        [eventId, now, now, now, now],
      );

      await pool.query(
        `INSERT INTO postings (id, event_id, wallet_id, savings_bucket_id, amount_idr, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [postingId, eventId, walletId, bucket.id, -100000, now],
      );

      const stats = await getSavingsBucketStats(bucket.id);

      expect(stats.transactionCount).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });
  });
});
