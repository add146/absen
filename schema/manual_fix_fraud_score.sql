-- SQL to fix the schema mismatch
-- Run this in Cloudflare Dashboard > D1 > absen-db > Console

-- 1. Add the missing fraud_score column
ALTER TABLE attendances ADD COLUMN fraud_score INTEGER DEFAULT 0;

-- 2. Add the index for fraud_score
CREATE INDEX IF NOT EXISTS idx_attendances_fraud_score ON attendances(fraud_score);

-- Note: 'fraud_flags' is omitted because it already exists.
