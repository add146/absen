-- Migration 0016: Fraud Detection Columns
-- Add columns to store fraud analysis results

-- ALTER TABLE attendances ADD COLUMN fraud_flags TEXT; -- Already applied partially
-- ALTER TABLE attendances ADD COLUMN fraud_score INTEGER DEFAULT 0; -- Likely already exists

CREATE INDEX IF NOT EXISTS idx_attendances_fraud_score ON attendances(fraud_score);
