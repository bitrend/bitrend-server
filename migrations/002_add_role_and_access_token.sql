-- Add role and access_token fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(100),
ADD COLUMN IF NOT EXISTS access_token TEXT;
