-- Add leave_type_id to leaves table
-- This is needed because 0004_leave_enhancements.sql did not add it due to SQLite limitations
ALTER TABLE leaves ADD COLUMN leave_type_id TEXT REFERENCES leave_types(id);

-- Optional: Create index
CREATE INDEX IF NOT EXISTS idx_leaves_leave_type ON leaves(leave_type_id);
