-- Migration: Storage Optimization - Rate Limiting & File Metadata
-- Created: 2026-02-05

-- Table for D1-based rate limiting (replaces KV)
CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    window_start INTEGER NOT NULL, -- Unix timestamp in seconds
    request_count INTEGER DEFAULT 1,
    PRIMARY KEY (ip, endpoint, window_start)
);

-- Index for efficient cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);

-- Table for tracking uploaded files (lifecycle management)
CREATE TABLE IF NOT EXISTS file_metadata (
    file_key TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'avatar', 'product', 'check_in', 'visit'
    file_size INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME,
    is_optimized INTEGER DEFAULT 0, -- 1 if compressed/optimized version exists
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_file_metadata_tenant ON file_metadata(tenant_id);

-- Index for cleanup queries (find old files)
CREATE INDEX IF NOT EXISTS idx_file_metadata_uploaded ON file_metadata(uploaded_at);

-- Index for file type filtering
CREATE INDEX IF NOT EXISTS idx_file_metadata_type ON file_metadata(file_type);
