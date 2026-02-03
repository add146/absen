-- Fix Super Admin password for glowboxstudio@gmail.com
-- Password: 'Spayxlers146' (hashed with bcryptjs)
UPDATE users 
SET password_hash = '$2b$10$p3JQZI9euvsXXAXJqgig0eEh1nxo6rXY9nlUHvmAezTQVZ9q.w0py',
    updated_at = datetime('now')
WHERE email = 'glowboxstudio@gmail.com';
