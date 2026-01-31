-- Backfill NULL idempotency keys with unique values
UPDATE transaction_events
SET idempotency_key = substr('bf' || md5(random()::text || clock_timestamp()::text), 1, 36)
WHERE idempotency_key IS NULL;

ALTER TABLE "transaction_events" ALTER COLUMN "idempotency_key" SET NOT NULL;