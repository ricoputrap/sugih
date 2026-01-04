/**
 * Transaction Actions
 *
 * Provides CRUD operations for transactions using PostgreSQL.
 * Handles expense, income, transfer, savings contribution, and savings withdrawal transactions.
 * Each transaction creates corresponding postings (ledger entries) for double-entry accounting.
 */

import { nanoid } from "nanoid";
import {
  ExpenseCreateSchema,
  IncomeCreateSchema,
  TransferCreateSchema,
  SavingsContributeSchema,
  SavingsWithdrawSchema,
  TransactionListQuerySchema,
  TransactionIdSchema,
  TransactionEvent,
  Posting,
  TransactionListQueryInput,
} from "./schema";
import { getDb } from "@/db/client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

// Extended transaction type with postings
export interface TransactionWithPostings extends TransactionEvent {
  postings: Posting[];
}

/**
 * List transactions with optional filters
 */
export async function listTransactions(
  query: TransactionListQueryInput | Record<string, unknown>,
): Promise<
  (TransactionEvent & {
    category_name?: string | null;
    display_amount_idr: number;
    display_account: string;
    postings: Posting[];
  })[]
> {
  const db = getDb();

  try {
    const validatedQuery = TransactionListQuerySchema.parse(query);

    // Build base query with joins for category names and account identifiers
    let whereConditions: string[] = ["te.deleted_at IS NULL"];
    const params: any[] = [];
    let paramIndex = 1;

    if (validatedQuery.from) {
      whereConditions.push(`te.occurred_at >= $${paramIndex}`);
      params.push(validatedQuery.from);
      paramIndex++;
    }

    if (validatedQuery.to) {
      whereConditions.push(`te.occurred_at <= $${paramIndex}`);
      params.push(validatedQuery.to);
      paramIndex++;
    }

    if (validatedQuery.type) {
      whereConditions.push(`te.type = $${paramIndex}`);
      params.push(validatedQuery.type);
      paramIndex++;
    }

    if (validatedQuery.walletId) {
      whereConditions.push(
        `EXISTS (SELECT 1 FROM postings p WHERE p.event_id = te.id AND p.wallet_id = $${paramIndex})`,
      );
      params.push(validatedQuery.walletId);
      paramIndex++;
    }

    if (validatedQuery.categoryId) {
      whereConditions.push(`te.category_id = $${paramIndex}`);
      params.push(validatedQuery.categoryId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get transaction events with category names (LEFT JOIN for expenses only)
    const events = await db<
      Array<TransactionEvent & { category_name: string | null }>
    >`
      SELECT
        te.id, te.occurred_at, te.type, te.note, te.payee, te.category_id,
        te.deleted_at, te.created_at, te.updated_at, te.idempotency_key,
        c.name as category_name
      FROM transaction_events te
      LEFT JOIN categories c ON te.category_id = c.id AND c.archived = false
      WHERE ${db.unsafe(whereClause)}
      ORDER BY te.occurred_at DESC
      LIMIT ${validatedQuery.limit}
      OFFSET ${validatedQuery.offset}
    `;

    // Get postings for all events with wallet and bucket names
    const eventIds = events.map((e) => e.id);
    if (eventIds.length === 0) {
      return [];
    }

    const postings = await db<
      Array<
        Posting & { wallet_name: string | null; bucket_name: string | null }
      >
    >`
      SELECT
        p.id, p.event_id, p.wallet_id, p.savings_bucket_id, p.amount_idr, p.created_at,
        w.name as wallet_name,
        sb.name as bucket_name
      FROM postings p
      LEFT JOIN wallets w ON p.wallet_id = w.id AND w.archived = false
      LEFT JOIN savings_buckets sb ON p.savings_bucket_id = sb.id AND sb.archived = false
      WHERE p.event_id = ANY(${eventIds})
      ORDER BY p.created_at ASC
    `;

    // Group postings by event_id
    const postingsByEvent = new Map<string, Posting[]>();
    for (const posting of postings) {
      const existing = postingsByEvent.get(posting.event_id) || [];
      existing.push(posting);
      postingsByEvent.set(posting.event_id, existing);
    }

    // Calculate display amounts and account names for each transaction
    return events.map((event) => {
      const eventPostings = postingsByEvent.get(event.id) || [];

      // Calculate display amount based on transaction type
      let displayAmount = 0;
      let displayAccount = "";

      switch (event.type) {
        case "expense": {
          // For expenses, display the positive amount spent
          const walletPosting = eventPostings.find((p) => p.wallet_id);
          displayAmount = walletPosting
            ? Math.abs(walletPosting.amount_idr)
            : 0;
          displayAccount = walletPosting?.wallet_name || "Unknown Wallet";
          break;
        }
        case "income": {
          // For income, display the positive amount received
          const walletPosting = eventPostings.find((p) => p.wallet_id);
          displayAmount = walletPosting ? walletPosting.amount_idr : 0;
          displayAccount = walletPosting?.wallet_name || "Unknown Wallet";
          break;
        }
        case "transfer": {
          // For transfers, display the amount transferred
          const fromPosting = eventPostings.find((p) => p.amount_idr < 0);
          displayAmount = fromPosting ? Math.abs(fromPosting.amount_idr) : 0;
          const fromWallet = eventPostings.find(
            (p) => p.amount_idr < 0,
          )?.wallet_name;
          const toWallet = eventPostings.find(
            (p) => p.amount_idr > 0,
          )?.wallet_name;
          displayAccount = `${fromWallet || "Unknown"} → ${toWallet || "Unknown"}`;
          break;
        }
        case "savings_contribution": {
          // For savings contribution, display the amount contributed
          const bucketPosting = eventPostings.find((p) => p.savings_bucket_id);
          displayAmount = bucketPosting ? bucketPosting.amount_idr : 0;
          displayAccount = `To: ${bucketPosting?.bucket_name || "Unknown Bucket"}`;
          break;
        }
        case "savings_withdrawal": {
          // For savings withdrawal, display the amount withdrawn
          const bucketPosting = eventPostings.find((p) => p.savings_bucket_id);
          displayAmount = bucketPosting
            ? Math.abs(bucketPosting.amount_idr)
            : 0;
          displayAccount = `From: ${bucketPosting?.bucket_name || "Unknown Bucket"}`;
          break;
        }
      }

      return {
        ...event,
        category_name: event.category_name,
        display_amount_idr: displayAmount,
        display_account: displayAccount,
        postings: eventPostings,
      };
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid transaction query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Get a transaction by ID
 */
export async function getTransactionById(
  id: string,
): Promise<TransactionWithPostings | null> {
  const db = getDb();

  try {
    TransactionIdSchema.parse({ id });

    const events = await db<TransactionEvent[]>`
      SELECT
        id, occurred_at, type, note, payee, category_id,
        deleted_at, created_at, updated_at, idempotency_key
      FROM transaction_events
      WHERE id = ${id}
    `;

    if (events.length === 0) {
      return null;
    }

    const event = events[0];

    const postings = await db<Posting[]>`
      SELECT id, event_id, wallet_id, savings_bucket_id, amount_idr, created_at
      FROM postings
      WHERE event_id = ${id}
    `;

    return {
      ...event,
      postings: Array.from(postings),
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid transaction ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Create an expense transaction
 */
export async function createExpense(
  input: unknown,
): Promise<TransactionWithPostings> {
  const db = getDb();

  try {
    const validatedInput = ExpenseCreateSchema.parse(input);

    // Check for idempotency
    if (validatedInput.idempotencyKey) {
      const existing = await db<TransactionEvent[]>`
        SELECT id FROM transaction_events
        WHERE idempotency_key = ${validatedInput.idempotencyKey}
      `;
      if (existing.length > 0) {
        const existingTransaction = await getTransactionById(existing[0].id);
        if (existingTransaction) {
          return existingTransaction;
        }
      }
    }

    // Verify wallet exists
    const wallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE id = ${validatedInput.walletId} AND archived = false
    `;
    if (wallets.length === 0) {
      throw new Error("Wallet not found or archived");
    }

    // Verify category exists
    const categories = await db<{ id: string }[]>`
      SELECT id FROM categories WHERE id = ${validatedInput.categoryId} AND archived = false
    `;
    if (categories.length === 0) {
      throw new Error("Category not found or archived");
    }

    const eventId = nanoid();
    const postingId = nanoid();
    const now = new Date();

    await db.begin(async (tx) => {
      // Create transaction event
      await tx`
        INSERT INTO transaction_events (
          id, occurred_at, type, note, category_id,
          created_at, updated_at, idempotency_key
        )
        VALUES (
          ${eventId},
          ${validatedInput.occurredAt},
          ${"expense"},
          ${validatedInput.note || null},
          ${validatedInput.categoryId},
          ${now},
          ${now},
          ${validatedInput.idempotencyKey || null}
        )
      `;

      // Create posting (negative amount for expense)
      await tx`
        INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
        VALUES (
          ${postingId},
          ${eventId},
          ${validatedInput.walletId},
          ${-validatedInput.amountIdr},
          ${now}
        )
      `;
    });

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid expense data", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Create an income transaction
 */
export async function createIncome(
  input: unknown,
): Promise<TransactionWithPostings> {
  const db = getDb();

  try {
    const validatedInput = IncomeCreateSchema.parse(input);

    // Check for idempotency
    if (validatedInput.idempotencyKey) {
      const existing = await db<TransactionEvent[]>`
        SELECT id FROM transaction_events
        WHERE idempotency_key = ${validatedInput.idempotencyKey}
      `;
      if (existing.length > 0) {
        const existingTransaction = await getTransactionById(existing[0].id);
        if (existingTransaction) {
          return existingTransaction;
        }
      }
    }

    // Verify wallet exists
    const wallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE id = ${validatedInput.walletId} AND archived = false
    `;
    if (wallets.length === 0) {
      throw new Error("Wallet not found or archived");
    }

    const eventId = nanoid();
    const postingId = nanoid();
    const now = new Date();

    await db.begin(async (tx) => {
      // Create transaction event
      await tx`
        INSERT INTO transaction_events (
          id, occurred_at, type, note, payee,
          created_at, updated_at, idempotency_key
        )
        VALUES (
          ${eventId},
          ${validatedInput.occurredAt},
          ${"income"},
          ${validatedInput.note || null},
          ${validatedInput.payee || null},
          ${now},
          ${now},
          ${validatedInput.idempotencyKey || null}
        )
      `;

      // Create posting (positive amount for income)
      await tx`
        INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
        VALUES (
          ${postingId},
          ${eventId},
          ${validatedInput.walletId},
          ${validatedInput.amountIdr},
          ${now}
        )
      `;
    });

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid income data", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Create a transfer transaction
 */
export async function createTransfer(
  input: unknown,
): Promise<TransactionWithPostings> {
  const db = getDb();

  try {
    const validatedInput = TransferCreateSchema.parse(input);

    // Check for idempotency
    if (validatedInput.idempotencyKey) {
      const existing = await db<TransactionEvent[]>`
        SELECT id FROM transaction_events
        WHERE idempotency_key = ${validatedInput.idempotencyKey}
      `;
      if (existing.length > 0) {
        const existingTransaction = await getTransactionById(existing[0].id);
        if (existingTransaction) {
          return existingTransaction;
        }
      }
    }

    // Verify from wallet exists
    const fromWallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE id = ${validatedInput.fromWalletId} AND archived = false
    `;
    if (fromWallets.length === 0) {
      throw new Error("Source wallet not found or archived");
    }

    // Verify to wallet exists
    const toWallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE id = ${validatedInput.toWalletId} AND archived = false
    `;
    if (toWallets.length === 0) {
      throw new Error("Destination wallet not found or archived");
    }

    const eventId = nanoid();
    const fromPostingId = nanoid();
    const toPostingId = nanoid();
    const now = new Date();

    await db.begin(async (tx) => {
      // Create transaction event
      await tx`
        INSERT INTO transaction_events (
          id, occurred_at, type, note,
          created_at, updated_at, idempotency_key
        )
        VALUES (
          ${eventId},
          ${validatedInput.occurredAt},
          ${"transfer"},
          ${validatedInput.note || null},
          ${now},
          ${now},
          ${validatedInput.idempotencyKey || null}
        )
      `;

      // Create posting for source wallet (negative)
      await tx`
        INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
        VALUES (
          ${fromPostingId},
          ${eventId},
          ${validatedInput.fromWalletId},
          ${-validatedInput.amountIdr},
          ${now}
        )
      `;

      // Create posting for destination wallet (positive)
      await tx`
        INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
        VALUES (
          ${toPostingId},
          ${eventId},
          ${validatedInput.toWalletId},
          ${validatedInput.amountIdr},
          ${now}
        )
      `;
    });

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid transfer data", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Create a savings contribution transaction
 */
export async function createSavingsContribution(
  input: unknown,
): Promise<TransactionWithPostings> {
  const db = getDb();

  try {
    const validatedInput = SavingsContributeSchema.parse(input);

    // Check for idempotency
    if (validatedInput.idempotencyKey) {
      const existing = await db<TransactionEvent[]>`
        SELECT id FROM transaction_events
        WHERE idempotency_key = ${validatedInput.idempotencyKey}
      `;
      if (existing.length > 0) {
        const existingTransaction = await getTransactionById(existing[0].id);
        if (existingTransaction) {
          return existingTransaction;
        }
      }
    }

    // Verify wallet exists
    const wallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE id = ${validatedInput.walletId} AND archived = false
    `;
    if (wallets.length === 0) {
      throw new Error("Wallet not found or archived");
    }

    // Verify savings bucket exists
    const buckets = await db<{ id: string }[]>`
      SELECT id FROM savings_buckets WHERE id = ${validatedInput.bucketId} AND archived = false
    `;
    if (buckets.length === 0) {
      throw new Error("Savings bucket not found or archived");
    }

    const eventId = nanoid();
    const walletPostingId = nanoid();
    const bucketPostingId = nanoid();
    const now = new Date();

    await db.begin(async (tx) => {
      // Create transaction event
      await tx`
        INSERT INTO transaction_events (
          id, occurred_at, type, note,
          created_at, updated_at, idempotency_key
        )
        VALUES (
          ${eventId},
          ${validatedInput.occurredAt},
          ${"savings_contribution"},
          ${validatedInput.note || null},
          ${now},
          ${now},
          ${validatedInput.idempotencyKey || null}
        )
      `;

      // Create posting for wallet (negative - money leaving wallet)
      await tx`
        INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
        VALUES (
          ${walletPostingId},
          ${eventId},
          ${validatedInput.walletId},
          ${-validatedInput.amountIdr},
          ${now}
        )
      `;

      // Create posting for savings bucket (positive - money entering bucket)
      await tx`
        INSERT INTO postings (id, event_id, savings_bucket_id, amount_idr, created_at)
        VALUES (
          ${bucketPostingId},
          ${eventId},
          ${validatedInput.bucketId},
          ${validatedInput.amountIdr},
          ${now}
        )
      `;
    });

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings contribution data",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Create a savings withdrawal transaction
 */
export async function createSavingsWithdrawal(
  input: unknown,
): Promise<TransactionWithPostings> {
  const db = getDb();

  try {
    const validatedInput = SavingsWithdrawSchema.parse(input);

    // Check for idempotency
    if (validatedInput.idempotencyKey) {
      const existing = await db<TransactionEvent[]>`
        SELECT id FROM transaction_events
        WHERE idempotency_key = ${validatedInput.idempotencyKey}
      `;
      if (existing.length > 0) {
        const existingTransaction = await getTransactionById(existing[0].id);
        if (existingTransaction) {
          return existingTransaction;
        }
      }
    }

    // Verify wallet exists
    const wallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE id = ${validatedInput.walletId} AND archived = false
    `;
    if (wallets.length === 0) {
      throw new Error("Wallet not found or archived");
    }

    // Verify savings bucket exists
    const buckets = await db<{ id: string }[]>`
      SELECT id FROM savings_buckets WHERE id = ${validatedInput.bucketId} AND archived = false
    `;
    if (buckets.length === 0) {
      throw new Error("Savings bucket not found or archived");
    }

    const eventId = nanoid();
    const bucketPostingId = nanoid();
    const walletPostingId = nanoid();
    const now = new Date();

    await db.begin(async (tx) => {
      // Create transaction event
      await tx`
        INSERT INTO transaction_events (
          id, occurred_at, type, note,
          created_at, updated_at, idempotency_key
        )
        VALUES (
          ${eventId},
          ${validatedInput.occurredAt},
          ${"savings_withdrawal"},
          ${validatedInput.note || null},
          ${now},
          ${now},
          ${validatedInput.idempotencyKey || null}
        )
      `;

      // Create posting for savings bucket (negative - money leaving bucket)
      await tx`
        INSERT INTO postings (id, event_id, savings_bucket_id, amount_idr, created_at)
        VALUES (
          ${bucketPostingId},
          ${eventId},
          ${validatedInput.bucketId},
          ${-validatedInput.amountIdr},
          ${now}
        )
      `;

      // Create posting for wallet (positive - money entering wallet)
      await tx`
        INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
        VALUES (
          ${walletPostingId},
          ${eventId},
          ${validatedInput.walletId},
          ${validatedInput.amountIdr},
          ${now}
        )
      `;
    });

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings withdrawal data",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Soft delete a transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = getDb();

  try {
    TransactionIdSchema.parse({ id });

    const existing = await getTransactionById(id);
    if (!existing) {
      throw new Error("Transaction not found");
    }

    if (existing.deleted_at) {
      throw new Error("Transaction is already deleted");
    }

    const now = new Date();
    await db`
      UPDATE transaction_events
      SET deleted_at = ${now}, updated_at = ${now}
      WHERE id = ${id}
    `;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid transaction ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Restore a soft-deleted transaction
 */
export async function restoreTransaction(
  id: string,
): Promise<TransactionWithPostings> {
  const db = getDb();

  try {
    TransactionIdSchema.parse({ id });

    const existing = await getTransactionById(id);
    if (!existing) {
      throw new Error("Transaction not found");
    }

    if (!existing.deleted_at) {
      throw new Error("Transaction is not deleted");
    }

    const now = new Date();
    await db`
      UPDATE transaction_events
      SET deleted_at = ${null}, updated_at = ${now}
      WHERE id = ${id}
    `;

    const result = await getTransactionById(id);
    if (!result) {
      throw new Error("Failed to retrieve restored transaction");
    }

    return result;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid transaction ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Permanently delete a transaction and its postings
 */
export async function permanentlyDeleteTransaction(id: string): Promise<void> {
  const db = getDb();

  try {
    TransactionIdSchema.parse({ id });

    const existing = await getTransactionById(id);
    if (!existing) {
      throw new Error("Transaction not found");
    }

    await db.begin(async (tx) => {
      // Delete postings first (foreign key constraint)
      await tx`DELETE FROM postings WHERE event_id = ${id}`;

      // Delete transaction event
      await tx`DELETE FROM transaction_events WHERE id = ${id}`;
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid transaction ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Get transaction statistics for a date range
 */
export async function getTransactionStats(
  from?: Date,
  to?: Date,
): Promise<{
  totalIncome: number;
  totalExpense: number;
  totalTransfers: number;
  totalSavingsContributions: number;
  totalSavingsWithdrawals: number;
  transactionCount: number;
}> {
  const db = getDb();

  let whereConditions = ["deleted_at IS NULL"];

  if (from) {
    whereConditions.push(`occurred_at >= '${from.toISOString()}'`);
  }

  if (to) {
    whereConditions.push(`occurred_at <= '${to.toISOString()}'`);
  }

  const whereClause = whereConditions.join(" AND ");

  const stats = await db<
    {
      type: string;
      count: number;
      total: number;
    }[]
  >`
    SELECT
      te.type,
      COUNT(*)::int as count,
      COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total
    FROM transaction_events te
    LEFT JOIN postings p ON te.id = p.event_id AND p.amount_idr > 0
    WHERE ${db.unsafe(whereClause)}
    GROUP BY te.type
  `;

  const result = {
    totalIncome: 0,
    totalExpense: 0,
    totalTransfers: 0,
    totalSavingsContributions: 0,
    totalSavingsWithdrawals: 0,
    transactionCount: 0,
  };

  for (const stat of stats) {
    result.transactionCount += stat.count;

    switch (stat.type) {
      case "income":
        result.totalIncome = Number(stat.total);
        break;
      case "expense":
        result.totalExpense = Number(stat.total);
        break;
      case "transfer":
        result.totalTransfers = Number(stat.total);
        break;
      case "savings_contribution":
        result.totalSavingsContributions = Number(stat.total);
        break;
      case "savings_withdrawal":
        result.totalSavingsWithdrawals = Number(stat.total);
        break;
    }
  }

  return result;
}
