-- Recovery: Create leaves table which was missing
CREATE TABLE IF NOT EXISTS leaves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    leave_type_id TEXT, -- Added in 0010, included here for full schema
    type TEXT NOT NULL, -- 'annual', 'sick', 'unpaid', 'other' (Legacy/Compat)
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    evidence_url TEXT,
    rejection_reason TEXT,
    total_days INTEGER DEFAULT 1, -- Added based on logic in leaves.ts
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
);

CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_leave_type ON leaves(leave_type_id);
