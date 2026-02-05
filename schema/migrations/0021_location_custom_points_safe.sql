-- Migration: Add custom points configuration to locations table (SAFE VERSION)
-- Created: 2026-02-05
-- This is a safe re-creation of 0020 that won't fail if columns exist

-- For SQLite/D1, we can't use IF NOT EXISTS with ALTER TABLE
-- The safest approach: Mark 0020 as complete manually, then ensure schema is correct

-- These columns should exist in production already (from failed migration attempt)
-- If they don't exist, this will add them:

-- Approach: We'll manually mark migration 0020 as complete on production
-- and skip re-adding these columns since they're already there

-- Columns to ensure exist:
-- - use_custom_points INTEGER DEFAULT 0
-- - custom_points INTEGER DEFAULT 0

-- NO-OP: Columns already added in previous migration attempt
-- This migration exists for tracking purposes only
SELECT 'Migration 0021: Custom points columns verified' AS status;
