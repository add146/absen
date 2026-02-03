-- Add Face Verification Columns
-- Storing face registration status and photo URL

ALTER TABLE users ADD COLUMN face_photo_url TEXT;
ALTER TABLE users ADD COLUMN face_registered INTEGER DEFAULT 0;

ALTER TABLE attendances ADD COLUMN face_verified INTEGER DEFAULT 0;
ALTER TABLE attendances ADD COLUMN face_confidence REAL;
ALTER TABLE attendances ADD COLUMN face_photo_url TEXT;

-- Create index for quick lookup of attendees with/without face registration
CREATE INDEX IF NOT EXISTS idx_users_face_registered ON users(face_registered);
