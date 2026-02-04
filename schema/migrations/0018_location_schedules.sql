-- Migration 0018: Location Schedules, Multi-Location Checkout & Field Worker Mode
-- Add work schedule columns to locations table
ALTER TABLE locations ADD COLUMN work_days TEXT DEFAULT '[1,2,3,4,5]';
ALTER TABLE locations ADD COLUMN start_time TEXT DEFAULT '09:00';
ALTER TABLE locations ADD COLUMN end_time TEXT DEFAULT '17:00';

-- Add checkout location tracking to attendances
ALTER TABLE attendances ADD COLUMN checkout_location_id TEXT;
ALTER TABLE attendances ADD COLUMN checkout_location_name TEXT;

-- Add field worker flag to users
ALTER TABLE users ADD COLUMN is_field_worker INTEGER DEFAULT 0;

-- Create visit_logs table for field workers
CREATE TABLE IF NOT EXISTS visit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    visit_time DATETIME NOT NULL,
    latitude REAL,
    longitude REAL,
    location_name TEXT,
    notes TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_user_id ON visit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visit_time ON visit_logs(visit_time);
