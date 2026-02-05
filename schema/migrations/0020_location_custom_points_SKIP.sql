-- Migration: Add custom points configuration to locations table (FIXED)
-- This allows per-location point overrides independent of global rules
-- 
-- NOTE: If columns already exist in production, this migration will be skipped
-- by the migration system automatically (applied_migrations table tracks this)

-- Since columns might already exist from a previous failed migration,
-- we'll mark this migration as already applied and create a new one

-- This file is intentionally empty - columns were added manually or in previous attempt
-- To be safe, we're creating migration 0021 instead
