-- Migration number: 0017 	 2024-02-04T00:00:00.000Z

DROP TABLE IF EXISTS tenant_usage_metrics;
CREATE TABLE IF NOT EXISTS tenant_usage_metrics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    metric_date TEXT NOT NULL, -- YYYY-MM-DD
    active_users INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    daily_checkins INTEGER DEFAULT 0,
    storage_usage_bytes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_metrics_date ON tenant_usage_metrics(tenant_id, metric_date);
