CREATE TABLE IF NOT EXISTS leaves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'annual', 'sick', 'unpaid', 'other'
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    evidence_url TEXT,
    rejection_reason TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_leaves_user_id ON leaves(user_id);
CREATE INDEX idx_leaves_status ON leaves(status);
