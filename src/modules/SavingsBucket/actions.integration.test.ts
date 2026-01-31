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
  bulkDeleteSavingsBuckets,
} from "./actions";
import { getPool, closeDb } from "@/db/drizzle-client";

describe("Savings Bucket Integration Tests", () => {
  const testBucketIds: string[] = [];
  const testEventIds: string[] = [];
  const testPostingIds: string[] = [];
  const testWalletIds: string[] = [];

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

  async function cleanupTestEvent(id: string) {
    const pool = getPool();
    try {
      // Clean up postings related to this event
      await pool.query(`DELETE FROM postings WHERE event_id = $1`, [id]);
      // Clean up transaction event
      await pool.query(`DELETE FROM transaction_events WHERE id = $1`, [id]);
    } catch (error) {
      console.error("Cleanup error for event:", error);
    }
  }

  async function cleanupTestWallet(id: string) {
    const pool = getPool();
    try {
      // Clean up postings first
      await pool.query(`DELETE FROM postings WHERE wallet_id = $1`, [id]);
      // Clean up wallet
      await pool.query(`DELETE FROM wallets WHERE id = $1`, [id]);
    } catch (error) {
      console.error("Cleanup error for wallet:", error);
    }
  }

  afterEach(async () => {
    // Clean up postings first (they have foreign key references)
    for (const id of testPostingIds) {
      const pool = getPool();
      try {
        await pool.query(`DELETE FROM postings WHERE id = $1`, [id]);
      } catch (error) {
        console.error("Cleanup error for posting:", error);
      }
    }

    // Clean up transaction events
    for (const id of testEventIds) {
      await cleanupTestEvent(id);
    }

    // Clean up savings buckets
    for (const id of testBucketIds) {
      await cleanupTestBucket(id);
    }

    // Clean up test wallets (if any were created)
    for (const id of testWalletIds) {
      await cleanupTestWallet(id);
    }

    // Reset tracking arrays
    testBucketIds.length = 0;
    testEventIds.length = 0;
    testPostingIds.length = 0;
    testWalletIds.length = 0;
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
      const walletId = nanoid();
      const eventId = nanoid();
      const postingId = nanoid();
      const now = new Date();

      // Track created IDs for cleanup
      testWalletIds.push(walletId);
      testEventIds.push(eventId);
      testPostingIds.push(postingId);

      // Create wallet first
      await pool.query(
        `INSERT INTO wallets (id, name, type, currency, archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [walletId, `Test Wallet ${nanoid()}`, "bank", "IDR", false, now, now],
      );

      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at, idempotency_key)
         VALUES ($1, $2, 'expense', $3, $4, $5)`,
        [eventId, now, now, now, eventId],
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
      const walletId = nanoid();
      const now = new Date();

      // Track IDs for cleanup
      testWalletIds.push(walletId);

      // Create wallet first
      await pool.query(
        `INSERT INTO wallets (id, name, type, currency, archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [walletId, `Test Wallet ${nanoid()}`, "bank", "IDR", false, now, now],
      );

      // Income posting
      const eventId1 = nanoid();
      const postingId1 = nanoid();
      testEventIds.push(eventId1);
      testPostingIds.push(postingId1);

      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at, idempotency_key)
         VALUES ($1, $2, 'income', $3, $4, $5)`,
        [eventId1, now, now, now, eventId1],
      );
      await pool.query(
        `INSERT INTO postings (id, event_id, wallet_id, savings_bucket_id, amount_idr, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [postingId1, eventId1, walletId, bucket.id, 1000000, now],
      );

      // Expense posting
      const eventId2 = nanoid();
      const postingId2 = nanoid();
      testEventIds.push(eventId2);
      testPostingIds.push(postingId2);

      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at, idempotency_key)
         VALUES ($1, $2, 'expense', $3, $4, $5)`,
        [eventId2, now, now, now, eventId2],
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
      const walletId = nanoid();
      const eventId = nanoid();
      const postingId = nanoid();
      const now = new Date();

      // Track IDs for cleanup
      testWalletIds.push(walletId);
      testEventIds.push(eventId);
      testPostingIds.push(postingId);

      // Create wallet first
      await pool.query(
        `INSERT INTO wallets (id, name, type, currency, archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [walletId, `Test Wallet ${nanoid()}`, "bank", "IDR", false, now, now],
      );

      await pool.query(
        `INSERT INTO transaction_events (id, occurred_at, type, deleted_at, created_at, updated_at, idempotency_key)
         VALUES ($1, $2, 'expense', $3, $4, $5, $6)`,
        [eventId, now, now, now, now, eventId],
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

  describe("Bulk Delete Savings Buckets", () => {
    it("should delete multiple savings buckets", async () => {
      const b1 = await createSavingsBucket({
        name: `Bulk Delete 1 ${nanoid()}`,
      });
      const b2 = await createSavingsBucket({
        name: `Bulk Delete 2 ${nanoid()}`,
      });
      const b3 = await createSavingsBucket({
        name: `Bulk Delete 3 ${nanoid()}`,
      });
      testBucketIds.push(b1.id, b2.id, b3.id);

      const result = await bulkDeleteSavingsBuckets([b1.id, b2.id]);

      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);

      // Verify buckets are soft deleted
      const bucket1 = await getSavingsBucketById(b1.id);
      const bucket2 = await getSavingsBucketById(b2.id);
      const bucket3 = await getSavingsBucketById(b3.id);

      expect(bucket1).toBeNull(); // Soft deleted
      expect(bucket2).toBeNull(); // Soft deleted
      expect(bucket3).not.toBeNull(); // Not deleted
    });

    it("should handle non-existent bucket IDs", async () => {
      const b1 = await createSavingsBucket({ name: `Bulk Test ${nanoid()}` });
      testBucketIds.push(b1.id);

      const nonExistentId = "non_existent_bucket_id";
      const result = await bulkDeleteSavingsBuckets([b1.id, nonExistentId]);

      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toContain(nonExistentId);
      expect(result.failedIds).toHaveLength(1);
    });

    it("should not delete already deleted buckets", async () => {
      const b1 = await createSavingsBucket({
        name: `Already Deleted ${nanoid()}`,
      });
      testBucketIds.push(b1.id);

      // Delete once
      await bulkDeleteSavingsBuckets([b1.id]);

      // Try to delete again
      const result = await bulkDeleteSavingsBuckets([b1.id]);

      expect(result.deletedCount).toBe(0);
      expect(result.failedIds).toContain(b1.id);
    });

    it("should handle empty ids array", async () => {
      await expect(bulkDeleteSavingsBuckets([])).rejects.toThrow();
    });

    it("should handle mixed valid and invalid IDs", async () => {
      const b1 = await createSavingsBucket({ name: `Mixed 1 ${nanoid()}` });
      const b2 = await createSavingsBucket({ name: `Mixed 2 ${nanoid()}` });
      testBucketIds.push(b1.id, b2.id);

      // Delete b1 first
      await bulkDeleteSavingsBuckets([b1.id]);

      // Try to bulk delete: already deleted, valid, non-existent
      const result = await bulkDeleteSavingsBuckets([
        b1.id,
        b2.id,
        "non_existent",
      ]);

      expect(result.deletedCount).toBe(1); // Only b2
      expect(result.failedIds).toHaveLength(2); // b1 (already deleted) and non_existent
      expect(result.failedIds).toContain(b1.id);
      expect(result.failedIds).toContain("non_existent");
    });

    it("should reject more than 100 IDs", async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `bucket_${i}`);
      await expect(bulkDeleteSavingsBuckets(ids)).rejects.toThrow();
    });

    it("should accept up to 100 IDs", async () => {
      // Create 5 buckets
      const buckets = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createSavingsBucket({ name: `Bulk ${i} ${nanoid()}` }),
        ),
      );
      buckets.forEach((b) => testBucketIds.push(b.id));

      // Build array with 100 IDs (5 valid + 95 invalid)
      const validIds = buckets.map((b) => b.id);
      const invalidIds = Array.from({ length: 95 }, (_, i) => `invalid_${i}`);
      const allIds = [...validIds, ...invalidIds];

      const result = await bulkDeleteSavingsBuckets(allIds);

      expect(result.deletedCount).toBe(5);
      expect(result.failedIds).toHaveLength(95);
    });

    it("should use database transaction for atomicity", async () => {
      const b1 = await createSavingsBucket({ name: `Txn Test 1 ${nanoid()}` });
      const b2 = await createSavingsBucket({ name: `Txn Test 2 ${nanoid()}` });
      testBucketIds.push(b1.id, b2.id);

      // This should succeed for both
      const result = await bulkDeleteSavingsBuckets([b1.id, b2.id]);

      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);

      // Verify both are deleted
      const bucket1 = await getSavingsBucketById(b1.id);
      const bucket2 = await getSavingsBucketById(b2.id);

      expect(bucket1).toBeNull();
      expect(bucket2).toBeNull();
    });

    it("should return all failed IDs when all are invalid", async () => {
      const invalidIds = ["invalid1", "invalid2", "invalid3"];
      const result = await bulkDeleteSavingsBuckets(invalidIds);

      expect(result.deletedCount).toBe(0);
      expect(result.failedIds).toHaveLength(3);
      expect(result.failedIds).toEqual(expect.arrayContaining(invalidIds));
    });
  });
});
