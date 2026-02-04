-- Migration: Add custom points configuration to locations table
-- This allows per-location point overrides independent of global rules

ALTER TABLE locations ADD COLUMN use_custom_points INTEGER DEFAULT 0;
ALTER TABLE locations ADD COLUMN custom_points INTEGER DEFAULT 0;
