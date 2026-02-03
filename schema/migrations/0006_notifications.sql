-- Migration: Notifications System with WAHA Integration
-- Add notifications table for WhatsApp messages via WAHA

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    type TEXT NOT NULL, -- 'leave_approved', 'leave_rejected', 'points_earned', 'check_in_reminder', 'order_processed'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT, -- JSON data for template variables
    waha_message_id TEXT, -- WAHA message ID for tracking
    delivery_status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
    is_read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    sent_at INTEGER,
    delivered_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Add notification preferences to users table (if columns don't exist)
-- SQLite doesn't support conditional ALTER TABLE, so we'll handle this in application level
