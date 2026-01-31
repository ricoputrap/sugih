/**
 * Transaction Actions
 *
 * Provides CRUD operations for transactions using PostgreSQL.
 * Handles expense, income, transfer, savings contribution, and savings withdrawal transactions.
 * Each transaction creates corresponding postings (ledger entries) for double-entry accounting.
 */

import { nanoid } from "nanoid";
import { getDb, getPool } from "@/db/drizzle-client";
import { inArray } from "drizzle-orm";
import { unprocessableEntity } from "@/lib/http";
import { formatZodError } from "@/lib/zod";
import {
  BulkDeleteTransactionsSchema,
  ExpenseCreateSchema,
  ExpenseUpdateSchema,
  IncomeCreateSchema,
  IncomeUpdateSchema,
  type Posting,
  SavingsContributeSchema,
  SavingsContributeUpdateSchema,
  SavingsWithdrawSchema,
  SavingsWithdrawUpdateSchema,
  type TransactionEvent,
  TransactionIdSchema,
  type TransactionListQueryInput,
  TransactionListQuerySchema,
  TransferCreateSchema,
  TransferUpdateSchema,
  transactionEvents,
} from "./schema";

// Extended transaction type with postings
export interface TransactionWithPostings extends TransactionEvent {
  category_name?: string | null;
  display_amount_idr?: number;
  display_account?: string;
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
  const pool = getPool();

  const validatedQuery = TransactionListQuerySchema.parse(query);

  // Build base query with joins for category names and account identifiers
  const whereConditions = ["te.deleted_at IS NULL"];
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

  if (validatedQuery.categoryType) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM categories c2
      WHERE c2.id = te.category_id
      AND c2.type = $${paramIndex}
    )`);
    params.push(validatedQuery.categoryType);
    paramIndex++;
  }

  const whereClause = whereConditions.join(" AND ");

  // Get transaction events with category names using raw SQL
  const eventsResult = await pool.query(
    `SELECT
      te.id, te.occurred_at, te.type, te.note, te.payee, te.category_id,
      te.deleted_at, te.created_at, te.updated_at, te.idempotency_key,
      c.name as category_name
    FROM transaction_events te
    LEFT JOIN categories c ON te.category_id = c.id AND c.archived = false
    WHERE ${whereClause}
    ORDER BY te.occurred_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, validatedQuery.limit, validatedQuery.offset],
  );

  const events = eventsResult.rows as Array<
    TransactionEvent & { category_name: string | null }
  >;

  // Get postings for all events with wallet and bucket names
  const eventIds = events.map((e) => e.id);
  if (eventIds.length === 0) {
    return [];
  }

  const postingsResult = await pool.query(
    `SELECT
      p.id, p.event_id, p.wallet_id, p.savings_bucket_id, p.amount_idr, p.created_at,
      w.name as wallet_name,
      sb.name as bucket_name
    FROM postings p
    LEFT JOIN wallets w ON p.wallet_id = w.id AND w.archived = false
    LEFT JOIN savings_buckets sb ON p.savings_bucket_id = sb.id AND sb.archived = false
    WHERE p.event_id = ANY($1)
    ORDER BY p.created_at ASC`,
    [eventIds],
  );

  // Group postings by event_id
  const postingsByEvent: Record<
    string,
    Array<Posting & { wallet_name: string | null; bucket_name: string | null }>
  > = {};

  for (const row of postingsResult.rows) {
    const eventId = row.event_id as string;
    if (!postingsByEvent[eventId]) {
      postingsByEvent[eventId] = [];
    }
    postingsByEvent[eventId].push({
      id: row.id as string,
      event_id: row.event_id as string,
      wallet_id: row.wallet_id as string | null,
      savings_bucket_id: row.savings_bucket_id as string | null,
      amount_idr: Number(row.amount_idr),
      created_at: row.created_at as Date,
      wallet_name: row.wallet_name as string | null,
      bucket_name: row.bucket_name as string | null,
    });
  }

  // Calculate display amounts and account names for each transaction
  return events.map((event) => {
    const eventPostings = postingsByEvent[event.id] || [];

    // Calculate display amount based on transaction type
    let displayAmount = 0;
    let displayAccount = "";

    switch (event.type) {
      case "expense": {
        // For expenses, display the positive amount spent
        const walletPosting = eventPostings.find((p) => p.wallet_id);
        displayAmount = walletPosting
          ? Math.abs(Number(walletPosting.amount_idr))
          : 0;
        displayAccount = walletPosting?.wallet_name || "Unknown Wallet";
        break;
      }
      case "income": {
        // For income, display the positive amount received
        const walletPosting = eventPostings.find((p) => p.wallet_id);
        displayAmount = walletPosting ? Number(walletPosting.amount_idr) : 0;
        displayAccount = walletPosting?.wallet_name || "Unknown Wallet";
        break;
      }
      case "transfer": {
        // For transfers, display the amount transferred
        const fromPosting = eventPostings.find((p) => Number(p.amount_idr) < 0);
        displayAmount = fromPosting
          ? Math.abs(Number(fromPosting.amount_idr))
          : 0;
        const fromWallet = eventPostings.find(
          (p) => Number(p.amount_idr) < 0,
        )?.wallet_name;
        const toWallet = eventPostings.find(
          (p) => Number(p.amount_idr) > 0,
        )?.wallet_name;
        displayAccount = `${fromWallet || "Unknown"} → ${toWallet || "Unknown"}`;
        break;
      }
      case "savings_contribution": {
        // For savings contribution, display the amount contributed
        const bucketPosting = eventPostings.find((p) => p.savings_bucket_id);
        displayAmount = bucketPosting ? Number(bucketPosting.amount_idr) : 0;
        displayAccount = `To: ${bucketPosting?.bucket_name || "Unknown Bucket"}`;
        break;
      }
      case "savings_withdrawal": {
        // For savings withdrawal, display the amount withdrawn
        const bucketPosting = eventPostings.find((p) => p.savings_bucket_id);
        displayAmount = bucketPosting
          ? Math.abs(Number(bucketPosting.amount_idr))
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
      postings: eventPostings.map(
        ({ wallet_name, bucket_name, ...posting }) => posting,
      ),
    };
  });
}

/**
 * Get a transaction by ID
 */
export async function getTransactionById(id: string): Promise<
  | (TransactionEvent & {
      postings: Posting[];
      category_name?: string | null;
      display_amount_idr: number;
      display_account: string;
    })
  | null
> {
  const pool = getPool();

  TransactionIdSchema.parse({ id });

  // Get transaction event with category name using raw SQL
  const eventsResult = await pool.query(
    `SELECT
      te.id, te.occurred_at, te.type, te.note, te.payee, te.category_id,
      te.deleted_at, te.created_at, te.updated_at, te.idempotency_key,
      c.name as category_name
    FROM transaction_events te
    LEFT JOIN categories c ON te.category_id = c.id AND c.archived = false
    WHERE te.id = $1`,
    [id],
  );

  if (eventsResult.rows.length === 0) {
    return null;
  }

  const event = eventsResult.rows[0] as TransactionEvent & {
    category_name: string | null;
  };

  // Get postings with wallet and bucket names
  const postingsResult = await pool.query(
    `SELECT
      p.id, p.event_id, p.wallet_id, p.savings_bucket_id, p.amount_idr, p.created_at,
      w.name as wallet_name,
      sb.name as bucket_name
    FROM postings p
    LEFT JOIN wallets w ON p.wallet_id = w.id AND w.archived = false
    LEFT JOIN savings_buckets sb ON p.savings_bucket_id = sb.id AND sb.archived = false
    WHERE p.event_id = $1
    ORDER BY p.created_at ASC`,
    [id],
  );

  const postings = postingsResult.rows as Array<
    Posting & { wallet_name: string | null; bucket_name: string | null }
  >;

  // Calculate display amount and account based on transaction type
  let displayAmount = 0;
  let displayAccount = "";

  switch (event.type) {
    case "expense": {
      const walletPosting = postings.find((p) => p.wallet_id);
      displayAmount = walletPosting
        ? Math.abs(Number(walletPosting.amount_idr))
        : 0;
      displayAccount = walletPosting?.wallet_name || "Unknown Wallet";
      break;
    }
    case "income": {
      const walletPosting = postings.find((p) => p.wallet_id);
      displayAmount = walletPosting ? Number(walletPosting.amount_idr) : 0;
      displayAccount = walletPosting?.wallet_name || "Unknown Wallet";
      break;
    }
    case "transfer": {
      const fromPosting = postings.find((p) => Number(p.amount_idr) < 0);
      displayAmount = fromPosting
        ? Math.abs(Number(fromPosting.amount_idr))
        : 0;
      const fromWallet = postings.find(
        (p) => Number(p.amount_idr) < 0,
      )?.wallet_name;
      const toWallet = postings.find(
        (p) => Number(p.amount_idr) > 0,
      )?.wallet_name;
      displayAccount = `${fromWallet || "Unknown"} → ${toWallet || "Unknown"}`;
      break;
    }
    case "savings_contribution": {
      const bucketPosting = postings.find((p) => p.savings_bucket_id);
      displayAmount = bucketPosting ? Number(bucketPosting.amount_idr) : 0;
      displayAccount = `To: ${bucketPosting?.bucket_name || "Unknown Bucket"}`;
      break;
    }
    case "savings_withdrawal": {
      const bucketPosting = postings.find((p) => p.savings_bucket_id);
      displayAmount = bucketPosting
        ? Math.abs(Number(bucketPosting.amount_idr))
        : 0;
      displayAccount = `From: ${bucketPosting?.bucket_name || "Unknown Bucket"}`;
      break;
    }
  }

  return {
    ...event,
    postings: postings.map(
      ({ wallet_name, bucket_name, ...posting }) => posting,
    ),
    category_name: event.category_name,
    display_amount_idr: displayAmount,
    display_account: displayAccount,
  };
}

/**
 * Create an expense transaction
 */
export async function createExpense(
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  try {
    var validatedInput = await ExpenseCreateSchema.parseAsync(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid expense data", formatZodError(error));
    }
    throw error;
  }

  // Auto-generate idempotency key if not provided
  const idempotencyKey = validatedInput.idempotencyKey || nanoid();

  // Check for idempotency
  const existing = await pool.query(
    `SELECT id FROM transaction_events WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  if (existing.rows.length > 0) {
    const existingTransaction = await getTransactionById(
      existing.rows[0].id as string,
    );
    if (existingTransaction) {
      return existingTransaction;
    }
  }

  // Verify wallet exists
  const wallets = await pool.query(
    `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
    [validatedInput.walletId],
  );
  if (wallets.rows.length === 0) {
    throw new Error("Wallet not found or archived");
  }

  // Category type validation is handled in schema (ExpenseCreateSchema refinement)
  // No additional validation needed here

  const eventId = nanoid();
  const postingId = nanoid();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create transaction event
    await client.query(
      `INSERT INTO transaction_events (
        id, occurred_at, type, note, category_id,
        created_at, updated_at, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        eventId,
        validatedInput.occurredAt,
        "expense",
        validatedInput.note || null,
        validatedInput.categoryId,
        now,
        now,
        idempotencyKey,
      ],
    );

    // Create posting (negative amount for expense)
    await client.query(
      `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        postingId,
        eventId,
        validatedInput.walletId,
        -validatedInput.amountIdr,
        now,
      ],
    );

    await client.query("COMMIT");

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create an income transaction
 */
export async function createIncome(
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  try {
    var validatedInput = await IncomeCreateSchema.parseAsync(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid income data", formatZodError(error));
    }
    throw error;
  }

  // Auto-generate idempotency key if not provided
  const idempotencyKey = validatedInput.idempotencyKey || nanoid();

  // Check for idempotency
  const existing = await pool.query(
    `SELECT id FROM transaction_events WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  if (existing.rows.length > 0) {
    const existingTransaction = await getTransactionById(
      existing.rows[0].id as string,
    );
    if (existingTransaction) {
      return existingTransaction;
    }
  }

  // Verify wallet exists
  const wallets = await pool.query(
    `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
    [validatedInput.walletId],
  );
  if (wallets.rows.length === 0) {
    throw new Error("Wallet not found or archived");
  }

  // Category type validation is handled in schema (IncomeCreateSchema refinement)
  // No additional validation needed here

  const eventId = nanoid();
  const postingId = nanoid();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create transaction event
    await client.query(
      `INSERT INTO transaction_events (
        id, occurred_at, type, note, payee, category_id,
        created_at, updated_at, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        eventId,
        validatedInput.occurredAt,
        "income",
        validatedInput.note || null,
        validatedInput.payee || null,
        validatedInput.categoryId || null,
        now,
        now,
        idempotencyKey,
      ],
    );

    // Create posting (positive amount for income)
    await client.query(
      `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        postingId,
        eventId,
        validatedInput.walletId,
        validatedInput.amountIdr,
        now,
      ],
    );

    await client.query("COMMIT");

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a transfer transaction
 */
export async function createTransfer(
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  const validatedInput = TransferCreateSchema.parse(input);

  // Auto-generate idempotency key if not provided
  const idempotencyKey = validatedInput.idempotencyKey || nanoid();

  // Check for idempotency
  const existing = await pool.query(
    `SELECT id FROM transaction_events WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  if (existing.rows.length > 0) {
    const existingTransaction = await getTransactionById(
      existing.rows[0].id as string,
    );
    if (existingTransaction) {
      return existingTransaction;
    }
  }

  // Verify from wallet exists
  const fromWallets = await pool.query(
    `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
    [validatedInput.fromWalletId],
  );
  if (fromWallets.rows.length === 0) {
    throw new Error("Source wallet not found or archived");
  }

  // Verify to wallet exists
  const toWallets = await pool.query(
    `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
    [validatedInput.toWalletId],
  );
  if (toWallets.rows.length === 0) {
    throw new Error("Destination wallet not found or archived");
  }

  const eventId = nanoid();
  const fromPostingId = nanoid();
  const toPostingId = nanoid();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create transaction event
    await client.query(
      `INSERT INTO transaction_events (
        id, occurred_at, type, note,
        created_at, updated_at, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        eventId,
        validatedInput.occurredAt,
        "transfer",
        validatedInput.note || null,
        now,
        now,
        idempotencyKey,
      ],
    );

    // Create posting for source wallet (negative)
    await client.query(
      `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        fromPostingId,
        eventId,
        validatedInput.fromWalletId,
        -validatedInput.amountIdr,
        now,
      ],
    );

    // Create posting for destination wallet (positive)
    await client.query(
      `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        toPostingId,
        eventId,
        validatedInput.toWalletId,
        validatedInput.amountIdr,
        now,
      ],
    );

    await client.query("COMMIT");

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a savings contribution transaction
 */
export async function createSavingsContribution(
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  const validatedInput = SavingsContributeSchema.parse(input);

  // Auto-generate idempotency key if not provided
  const idempotencyKey = validatedInput.idempotencyKey || nanoid();

  // Check for idempotency
  const existing = await pool.query(
    `SELECT id FROM transaction_events WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  if (existing.rows.length > 0) {
    const existingTransaction = await getTransactionById(
      existing.rows[0].id as string,
    );
    if (existingTransaction) {
      return existingTransaction;
    }
  }

  // Verify wallet exists
  const wallets = await pool.query(
    `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
    [validatedInput.walletId],
  );
  if (wallets.rows.length === 0) {
    throw new Error("Wallet not found or archived");
  }

  // Verify savings bucket exists
  const buckets = await pool.query(
    `SELECT id FROM savings_buckets WHERE id = $1`,
    [validatedInput.bucketId],
  );
  if (buckets.rows.length === 0) {
    throw new Error("Savings bucket not found");
  }

  const eventId = nanoid();
  const walletPostingId = nanoid();
  const bucketPostingId = nanoid();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create transaction event
    await client.query(
      `INSERT INTO transaction_events (
        id, occurred_at, type, note,
        created_at, updated_at, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        eventId,
        validatedInput.occurredAt,
        "savings_contribution",
        validatedInput.note || null,
        now,
        now,
        idempotencyKey,
      ],
    );

    // Create posting for wallet (negative - money leaving wallet)
    await client.query(
      `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        walletPostingId,
        eventId,
        validatedInput.walletId,
        -validatedInput.amountIdr,
        now,
      ],
    );

    // Create posting for savings bucket (positive - money entering bucket)
    await client.query(
      `INSERT INTO postings (id, event_id, savings_bucket_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        bucketPostingId,
        eventId,
        validatedInput.bucketId,
        validatedInput.amountIdr,
        now,
      ],
    );

    await client.query("COMMIT");

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a savings withdrawal transaction
 */
export async function createSavingsWithdrawal(
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  const validatedInput = SavingsWithdrawSchema.parse(input);

  // Auto-generate idempotency key if not provided
  const idempotencyKey = validatedInput.idempotencyKey || nanoid();

  // Check for idempotency
  const existing = await pool.query(
    `SELECT id FROM transaction_events WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  if (existing.rows.length > 0) {
    const existingTransaction = await getTransactionById(
      existing.rows[0].id as string,
    );
    if (existingTransaction) {
      return existingTransaction;
    }
  }

  // Verify wallet exists
  const wallets = await pool.query(
    `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
    [validatedInput.walletId],
  );
  if (wallets.rows.length === 0) {
    throw new Error("Wallet not found or archived");
  }

  // Verify savings bucket exists
  const buckets = await pool.query(
    `SELECT id FROM savings_buckets WHERE id = $1`,
    [validatedInput.bucketId],
  );
  if (buckets.rows.length === 0) {
    throw new Error("Savings bucket not found");
  }

  const eventId = nanoid();
  const bucketPostingId = nanoid();
  const walletPostingId = nanoid();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create transaction event
    await client.query(
      `INSERT INTO transaction_events (
        id, occurred_at, type, note,
        created_at, updated_at, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        eventId,
        validatedInput.occurredAt,
        "savings_withdrawal",
        validatedInput.note || null,
        now,
        now,
        idempotencyKey,
      ],
    );

    // Create posting for savings bucket (negative - money leaving bucket)
    await client.query(
      `INSERT INTO postings (id, event_id, savings_bucket_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        bucketPostingId,
        eventId,
        validatedInput.bucketId,
        -validatedInput.amountIdr,
        now,
      ],
    );

    // Create posting for wallet (positive - money entering wallet)
    await client.query(
      `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        walletPostingId,
        eventId,
        validatedInput.walletId,
        validatedInput.amountIdr,
        now,
      ],
    );

    await client.query("COMMIT");

    const result = await getTransactionById(eventId);
    if (!result) {
      throw new Error("Failed to retrieve created transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Soft delete a transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  const pool = getPool();

  TransactionIdSchema.parse({ id });

  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  if (existing.deleted_at) {
    throw new Error("Transaction is already deleted");
  }

  const now = new Date();
  await pool.query(
    `UPDATE transaction_events
    SET deleted_at = $1, updated_at = $2
    WHERE id = $3`,
    [now, now, id],
  );
}

export async function bulkDeleteTransactions(
  ids: string[],
): Promise<{ deletedCount: number; failedIds: string[] }> {
  const pool = getPool();

  // Validate input
  const validatedInput = BulkDeleteTransactionsSchema.parse({ ids });

  const db = getDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check which transactions exist and are not already deleted
    const checkQuery = `
      SELECT id, deleted_at
      FROM transaction_events
      WHERE id = ANY($1)
    `;
    const checkResult = await client.query(checkQuery, [validatedInput.ids]);
    const transactions = checkResult.rows;

    // Identify failed IDs
    const foundIds = new Set(transactions.map((t) => t.id));
    const notFoundIds = validatedInput.ids.filter((id) => !foundIds.has(id));
    const alreadyDeletedIds = transactions
      .filter((t) => t.deleted_at)
      .map((t) => t.id);

    const failedIds = [...notFoundIds, ...alreadyDeletedIds];
    const deletableIds = transactions
      .filter((t) => !t.deleted_at)
      .map((t) => t.id);

    // Perform soft delete for valid, non-deleted transactions
    let deletedCount = 0;
    if (deletableIds.length > 0) {
      const now = new Date();

      // Use Drizzle ORM for type-safe bulk update
      await db
        .update(transactionEvents)
        .set({
          deleted_at: now,
          updated_at: now,
        })
        .where(inArray(transactionEvents.id, deletableIds));

      deletedCount = deletableIds.length;
    }

    await client.query("COMMIT");

    return {
      deletedCount,
      failedIds,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Restore a soft-deleted transaction
 */
export async function restoreTransaction(
  id: string,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  TransactionIdSchema.parse({ id });

  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  if (!existing.deleted_at) {
    throw new Error("Transaction is not deleted");
  }

  const now = new Date();
  await pool.query(
    `UPDATE transaction_events
    SET deleted_at = NULL, updated_at = $1
    WHERE id = $2`,
    [now, id],
  );

  const result = await getTransactionById(id);
  if (!result) {
    throw new Error("Failed to retrieve restored transaction");
  }

  return result;
}

/**
 * Permanently delete a transaction and its postings
 */
export async function permanentlyDeleteTransaction(id: string): Promise<void> {
  const pool = getPool();

  TransactionIdSchema.parse({ id });

  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete postings first (foreign key constraint)
    await client.query(`DELETE FROM postings WHERE event_id = $1`, [id]);

    // Delete transaction event
    await client.query(`DELETE FROM transaction_events WHERE id = $1`, [id]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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
  const pool = getPool();

  const whereConditions = ["te.deleted_at IS NULL"];
  const params: any[] = [];
  let paramIndex = 1;

  if (from) {
    whereConditions.push(`te.occurred_at >= $${paramIndex}`);
    params.push(from);
    paramIndex++;
  }

  if (to) {
    whereConditions.push(`te.occurred_at <= $${paramIndex}`);
    params.push(to);
    paramIndex++;
  }

  const whereClause = whereConditions.join(" AND ");

  const statsResult = await pool.query(
    `SELECT
      te.type,
      COUNT(*)::int as count,
      COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total
    FROM transaction_events te
    LEFT JOIN postings p ON te.id = p.event_id
    WHERE ${whereClause}
    GROUP BY te.type`,
    params,
  );

  const result = {
    totalIncome: 0,
    totalExpense: 0,
    totalTransfers: 0,
    totalSavingsContributions: 0,
    totalSavingsWithdrawals: 0,
    transactionCount: 0,
  };

  for (const row of statsResult.rows) {
    const type = row.type as string;
    const count = row.count as number;
    const total = Number(row.total);

    result.transactionCount += count;

    switch (type) {
      case "income":
        result.totalIncome = total;
        break;
      case "expense":
        result.totalExpense = total;
        break;
      case "transfer":
        result.totalTransfers = total;
        break;
      case "savings_contribution":
        result.totalSavingsContributions = total;
        break;
      case "savings_withdrawal":
        result.totalSavingsWithdrawals = total;
        break;
    }
  }

  return result;
}

/**
 * Update an expense transaction
 */
export async function updateExpense(
  id: string,
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  // Validate ID
  TransactionIdSchema.parse({ id });

  // Validate input
  let validatedInput;
  try {
    validatedInput = await ExpenseUpdateSchema.parseAsync(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid expense update data",
        formatZodError(error),
      );
    }
    throw error;
  }

  // Get existing transaction
  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  // Verify it's an expense transaction
  if (existing.type !== "expense") {
    throw new Error("Transaction is not an expense");
  }

  // Verify not deleted
  if (existing.deleted_at) {
    throw new Error("Cannot update a deleted transaction");
  }

  // Verify wallet exists if being updated
  if (validatedInput.walletId) {
    const wallets = await pool.query(
      `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
      [validatedInput.walletId],
    );
    if (wallets.rows.length === 0) {
      throw new Error("Wallet not found or archived");
    }
  }

  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update transaction event
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (validatedInput.occurredAt !== undefined) {
      updateFields.push(`occurred_at = $${paramIndex}`);
      updateParams.push(validatedInput.occurredAt);
      paramIndex++;
    }

    if (validatedInput.note !== undefined) {
      updateFields.push(`note = $${paramIndex}`);
      updateParams.push(validatedInput.note);
      paramIndex++;
    }

    if (validatedInput.categoryId !== undefined) {
      updateFields.push(`category_id = $${paramIndex}`);
      updateParams.push(validatedInput.categoryId);
      paramIndex++;
    }

    // Always update updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateParams.push(now);
    paramIndex++;

    // Add id as last param
    updateParams.push(id);

    if (updateFields.length > 1) {
      // More than just updated_at
      await client.query(
        `UPDATE transaction_events SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
        updateParams,
      );
    }

    // Update posting if wallet or amount changed
    if (
      validatedInput.walletId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const postingUpdateFields: string[] = [];
      const postingUpdateParams: any[] = [];
      let postingParamIndex = 1;

      if (validatedInput.walletId !== undefined) {
        postingUpdateFields.push(`wallet_id = $${postingParamIndex}`);
        postingUpdateParams.push(validatedInput.walletId);
        postingParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // Expense is stored as negative amount
        postingUpdateFields.push(`amount_idr = $${postingParamIndex}`);
        postingUpdateParams.push(-validatedInput.amountIdr);
        postingParamIndex++;
      }

      postingUpdateParams.push(id);

      if (postingUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${postingUpdateFields.join(", ")} WHERE event_id = $${postingParamIndex}`,
          postingUpdateParams,
        );
      }
    }

    await client.query("COMMIT");

    const result = await getTransactionById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update an income transaction
 */
export async function updateIncome(
  id: string,
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  // Validate ID
  TransactionIdSchema.parse({ id });

  // Validate input
  let validatedInput;
  try {
    validatedInput = await IncomeUpdateSchema.parseAsync(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid income update data",
        formatZodError(error),
      );
    }
    throw error;
  }

  // Get existing transaction
  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  // Verify it's an income transaction
  if (existing.type !== "income") {
    throw new Error("Transaction is not an income");
  }

  // Verify not deleted
  if (existing.deleted_at) {
    throw new Error("Cannot update a deleted transaction");
  }

  // Verify wallet exists if being updated
  if (validatedInput.walletId) {
    const wallets = await pool.query(
      `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
      [validatedInput.walletId],
    );
    if (wallets.rows.length === 0) {
      throw new Error("Wallet not found or archived");
    }
  }

  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update transaction event
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (validatedInput.occurredAt !== undefined) {
      updateFields.push(`occurred_at = $${paramIndex}`);
      updateParams.push(validatedInput.occurredAt);
      paramIndex++;
    }

    if (validatedInput.note !== undefined) {
      updateFields.push(`note = $${paramIndex}`);
      updateParams.push(validatedInput.note);
      paramIndex++;
    }

    if (validatedInput.payee !== undefined) {
      updateFields.push(`payee = $${paramIndex}`);
      updateParams.push(validatedInput.payee);
      paramIndex++;
    }

    if (validatedInput.categoryId !== undefined) {
      updateFields.push(`category_id = $${paramIndex}`);
      updateParams.push(validatedInput.categoryId);
      paramIndex++;
    }

    // Always update updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateParams.push(now);
    paramIndex++;

    // Add id as last param
    updateParams.push(id);

    if (updateFields.length > 1) {
      await client.query(
        `UPDATE transaction_events SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
        updateParams,
      );
    }

    // Update posting if wallet or amount changed
    if (
      validatedInput.walletId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const postingUpdateFields: string[] = [];
      const postingUpdateParams: any[] = [];
      let postingParamIndex = 1;

      if (validatedInput.walletId !== undefined) {
        postingUpdateFields.push(`wallet_id = $${postingParamIndex}`);
        postingUpdateParams.push(validatedInput.walletId);
        postingParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // Income is stored as positive amount
        postingUpdateFields.push(`amount_idr = $${postingParamIndex}`);
        postingUpdateParams.push(validatedInput.amountIdr);
        postingParamIndex++;
      }

      postingUpdateParams.push(id);

      if (postingUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${postingUpdateFields.join(", ")} WHERE event_id = $${postingParamIndex}`,
          postingUpdateParams,
        );
      }
    }

    await client.query("COMMIT");

    const result = await getTransactionById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a transfer transaction
 */
export async function updateTransfer(
  id: string,
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  // Validate ID
  TransactionIdSchema.parse({ id });

  // Validate input
  let validatedInput;
  try {
    validatedInput = TransferUpdateSchema.parse(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid transfer update data",
        formatZodError(error),
      );
    }
    throw error;
  }

  // Get existing transaction
  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  // Verify it's a transfer transaction
  if (existing.type !== "transfer") {
    throw new Error("Transaction is not a transfer");
  }

  // Verify not deleted
  if (existing.deleted_at) {
    throw new Error("Cannot update a deleted transaction");
  }

  // Get current postings to identify from/to
  const currentFromPosting = existing.postings.find(
    (p) => Number(p.amount_idr) < 0,
  );
  const currentToPosting = existing.postings.find(
    (p) => Number(p.amount_idr) > 0,
  );

  if (!currentFromPosting || !currentToPosting) {
    throw new Error("Invalid transfer transaction: missing postings");
  }

  // Get the wallet IDs to validate the different wallet check
  const newFromWalletId =
    validatedInput.fromWalletId ?? currentFromPosting.wallet_id;
  const newToWalletId = validatedInput.toWalletId ?? currentToPosting.wallet_id;

  // Validate wallets are different (even if only one is being updated)
  if (newFromWalletId === newToWalletId) {
    throw new Error("From and to wallets must be different");
  }

  // Verify from wallet exists if being updated
  if (validatedInput.fromWalletId) {
    const wallets = await pool.query(
      `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
      [validatedInput.fromWalletId],
    );
    if (wallets.rows.length === 0) {
      throw new Error("From wallet not found or archived");
    }
  }

  // Verify to wallet exists if being updated
  if (validatedInput.toWalletId) {
    const wallets = await pool.query(
      `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
      [validatedInput.toWalletId],
    );
    if (wallets.rows.length === 0) {
      throw new Error("To wallet not found or archived");
    }
  }

  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update transaction event
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (validatedInput.occurredAt !== undefined) {
      updateFields.push(`occurred_at = $${paramIndex}`);
      updateParams.push(validatedInput.occurredAt);
      paramIndex++;
    }

    if (validatedInput.note !== undefined) {
      updateFields.push(`note = $${paramIndex}`);
      updateParams.push(validatedInput.note);
      paramIndex++;
    }

    // Always update updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateParams.push(now);
    paramIndex++;

    // Add id as last param
    updateParams.push(id);

    if (updateFields.length > 1) {
      await client.query(
        `UPDATE transaction_events SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
        updateParams,
      );
    }

    // Update from posting if fromWallet or amount changed
    if (
      validatedInput.fromWalletId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const fromUpdateFields: string[] = [];
      const fromUpdateParams: any[] = [];
      let fromParamIndex = 1;

      if (validatedInput.fromWalletId !== undefined) {
        fromUpdateFields.push(`wallet_id = $${fromParamIndex}`);
        fromUpdateParams.push(validatedInput.fromWalletId);
        fromParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // From posting has negative amount
        fromUpdateFields.push(`amount_idr = $${fromParamIndex}`);
        fromUpdateParams.push(-validatedInput.amountIdr);
        fromParamIndex++;
      }

      fromUpdateParams.push(currentFromPosting.id);

      if (fromUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${fromUpdateFields.join(", ")} WHERE id = $${fromParamIndex}`,
          fromUpdateParams,
        );
      }
    }

    // Update to posting if toWallet or amount changed
    if (
      validatedInput.toWalletId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const toUpdateFields: string[] = [];
      const toUpdateParams: any[] = [];
      let toParamIndex = 1;

      if (validatedInput.toWalletId !== undefined) {
        toUpdateFields.push(`wallet_id = $${toParamIndex}`);
        toUpdateParams.push(validatedInput.toWalletId);
        toParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // To posting has positive amount
        toUpdateFields.push(`amount_idr = $${toParamIndex}`);
        toUpdateParams.push(validatedInput.amountIdr);
        toParamIndex++;
      }

      toUpdateParams.push(currentToPosting.id);

      if (toUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${toUpdateFields.join(", ")} WHERE id = $${toParamIndex}`,
          toUpdateParams,
        );
      }
    }

    await client.query("COMMIT");

    const result = await getTransactionById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a savings contribution transaction
 */
export async function updateSavingsContribution(
  id: string,
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  // Validate ID
  TransactionIdSchema.parse({ id });

  // Validate input
  let validatedInput;
  try {
    validatedInput = SavingsContributeUpdateSchema.parse(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings contribution update data",
        formatZodError(error),
      );
    }
    throw error;
  }

  // Get existing transaction
  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  // Verify it's a savings contribution transaction
  if (existing.type !== "savings_contribution") {
    throw new Error("Transaction is not a savings contribution");
  }

  // Verify not deleted
  if (existing.deleted_at) {
    throw new Error("Cannot update a deleted transaction");
  }

  // Get current postings to identify wallet/bucket
  const walletPosting = existing.postings.find((p) => p.wallet_id);
  const bucketPosting = existing.postings.find((p) => p.savings_bucket_id);

  if (!walletPosting || !bucketPosting) {
    throw new Error(
      "Invalid savings contribution transaction: missing postings",
    );
  }

  // Verify wallet exists if being updated
  if (validatedInput.walletId) {
    const wallets = await pool.query(
      `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
      [validatedInput.walletId],
    );
    if (wallets.rows.length === 0) {
      throw new Error("Wallet not found or archived");
    }
  }

  // Verify bucket exists if being updated
  if (validatedInput.bucketId) {
    const buckets = await pool.query(
      `SELECT id FROM savings_buckets WHERE id = $1 AND archived = false`,
      [validatedInput.bucketId],
    );
    if (buckets.rows.length === 0) {
      throw new Error("Savings bucket not found or archived");
    }
  }

  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update transaction event
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (validatedInput.occurredAt !== undefined) {
      updateFields.push(`occurred_at = $${paramIndex}`);
      updateParams.push(validatedInput.occurredAt);
      paramIndex++;
    }

    if (validatedInput.note !== undefined) {
      updateFields.push(`note = $${paramIndex}`);
      updateParams.push(validatedInput.note);
      paramIndex++;
    }

    // Always update updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateParams.push(now);
    paramIndex++;

    // Add id as last param
    updateParams.push(id);

    if (updateFields.length > 1) {
      await client.query(
        `UPDATE transaction_events SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
        updateParams,
      );
    }

    // Update wallet posting if wallet or amount changed
    if (
      validatedInput.walletId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const walletUpdateFields: string[] = [];
      const walletUpdateParams: any[] = [];
      let walletParamIndex = 1;

      if (validatedInput.walletId !== undefined) {
        walletUpdateFields.push(`wallet_id = $${walletParamIndex}`);
        walletUpdateParams.push(validatedInput.walletId);
        walletParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // Wallet posting has negative amount (money leaving wallet)
        walletUpdateFields.push(`amount_idr = $${walletParamIndex}`);
        walletUpdateParams.push(-validatedInput.amountIdr);
        walletParamIndex++;
      }

      walletUpdateParams.push(walletPosting.id);

      if (walletUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${walletUpdateFields.join(", ")} WHERE id = $${walletParamIndex}`,
          walletUpdateParams,
        );
      }
    }

    // Update bucket posting if bucket or amount changed
    if (
      validatedInput.bucketId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const bucketUpdateFields: string[] = [];
      const bucketUpdateParams: any[] = [];
      let bucketParamIndex = 1;

      if (validatedInput.bucketId !== undefined) {
        bucketUpdateFields.push(`savings_bucket_id = $${bucketParamIndex}`);
        bucketUpdateParams.push(validatedInput.bucketId);
        bucketParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // Bucket posting has positive amount (money entering bucket)
        bucketUpdateFields.push(`amount_idr = $${bucketParamIndex}`);
        bucketUpdateParams.push(validatedInput.amountIdr);
        bucketParamIndex++;
      }

      bucketUpdateParams.push(bucketPosting.id);

      if (bucketUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${bucketUpdateFields.join(", ")} WHERE id = $${bucketParamIndex}`,
          bucketUpdateParams,
        );
      }
    }

    await client.query("COMMIT");

    const result = await getTransactionById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a savings withdrawal transaction
 */
export async function updateSavingsWithdrawal(
  id: string,
  input: unknown,
): Promise<TransactionWithPostings> {
  const pool = getPool();

  // Validate ID
  TransactionIdSchema.parse({ id });

  // Validate input
  let validatedInput;
  try {
    validatedInput = SavingsWithdrawUpdateSchema.parse(input);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings withdrawal update data",
        formatZodError(error),
      );
    }
    throw error;
  }

  // Get existing transaction
  const existing = await getTransactionById(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  // Verify it's a savings withdrawal transaction
  if (existing.type !== "savings_withdrawal") {
    throw new Error("Transaction is not a savings withdrawal");
  }

  // Verify not deleted
  if (existing.deleted_at) {
    throw new Error("Cannot update a deleted transaction");
  }

  // Get current postings to identify wallet/bucket
  const walletPosting = existing.postings.find((p) => p.wallet_id);
  const bucketPosting = existing.postings.find((p) => p.savings_bucket_id);

  if (!walletPosting || !bucketPosting) {
    throw new Error("Invalid savings withdrawal transaction: missing postings");
  }

  // Verify wallet exists if being updated
  if (validatedInput.walletId) {
    const wallets = await pool.query(
      `SELECT id FROM wallets WHERE id = $1 AND archived = false`,
      [validatedInput.walletId],
    );
    if (wallets.rows.length === 0) {
      throw new Error("Wallet not found or archived");
    }
  }

  // Verify bucket exists if being updated
  if (validatedInput.bucketId) {
    const buckets = await pool.query(
      `SELECT id FROM savings_buckets WHERE id = $1 AND archived = false`,
      [validatedInput.bucketId],
    );
    if (buckets.rows.length === 0) {
      throw new Error("Savings bucket not found or archived");
    }
  }

  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update transaction event
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (validatedInput.occurredAt !== undefined) {
      updateFields.push(`occurred_at = $${paramIndex}`);
      updateParams.push(validatedInput.occurredAt);
      paramIndex++;
    }

    if (validatedInput.note !== undefined) {
      updateFields.push(`note = $${paramIndex}`);
      updateParams.push(validatedInput.note);
      paramIndex++;
    }

    // Always update updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateParams.push(now);
    paramIndex++;

    // Add id as last param
    updateParams.push(id);

    if (updateFields.length > 1) {
      await client.query(
        `UPDATE transaction_events SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
        updateParams,
      );
    }

    // Update bucket posting if bucket or amount changed
    if (
      validatedInput.bucketId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const bucketUpdateFields: string[] = [];
      const bucketUpdateParams: any[] = [];
      let bucketParamIndex = 1;

      if (validatedInput.bucketId !== undefined) {
        bucketUpdateFields.push(`savings_bucket_id = $${bucketParamIndex}`);
        bucketUpdateParams.push(validatedInput.bucketId);
        bucketParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // Bucket posting has negative amount (money leaving bucket)
        bucketUpdateFields.push(`amount_idr = $${bucketParamIndex}`);
        bucketUpdateParams.push(-validatedInput.amountIdr);
        bucketParamIndex++;
      }

      bucketUpdateParams.push(bucketPosting.id);

      if (bucketUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${bucketUpdateFields.join(", ")} WHERE id = $${bucketParamIndex}`,
          bucketUpdateParams,
        );
      }
    }

    // Update wallet posting if wallet or amount changed
    if (
      validatedInput.walletId !== undefined ||
      validatedInput.amountIdr !== undefined
    ) {
      const walletUpdateFields: string[] = [];
      const walletUpdateParams: any[] = [];
      let walletParamIndex = 1;

      if (validatedInput.walletId !== undefined) {
        walletUpdateFields.push(`wallet_id = $${walletParamIndex}`);
        walletUpdateParams.push(validatedInput.walletId);
        walletParamIndex++;
      }

      if (validatedInput.amountIdr !== undefined) {
        // Wallet posting has positive amount (money entering wallet)
        walletUpdateFields.push(`amount_idr = $${walletParamIndex}`);
        walletUpdateParams.push(validatedInput.amountIdr);
        walletParamIndex++;
      }

      walletUpdateParams.push(walletPosting.id);

      if (walletUpdateFields.length > 0) {
        await client.query(
          `UPDATE postings SET ${walletUpdateFields.join(", ")} WHERE id = $${walletParamIndex}`,
          walletUpdateParams,
        );
      }
    }

    await client.query("COMMIT");

    const result = await getTransactionById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated transaction");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
