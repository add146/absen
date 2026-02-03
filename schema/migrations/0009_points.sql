-- Add Points System Tables
-- Storing user points balance and transaction history

-- NOTE: points_balance column already exists in users table from 0001_initial.sql
-- This migration only adds the point_history table

-- Create point_history table
CREATE TABLE IF NOT EXISTS point_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Positive for earning, negative for spending
  type TEXT NOT NULL, -- 'earn_checkin', 'earn_task', 'redeem_shop', 'adjustment'
  description TEXT,
  reference_id TEXT, -- Optimization: link to attendance_id or order_id
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for quick lookup of user history
CREATE INDEX IF NOT EXISTS idx_point_history_user ON point_history(user_id);
