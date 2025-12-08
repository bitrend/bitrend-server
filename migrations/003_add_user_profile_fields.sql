-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN bio TEXT,
ADD COLUMN follower_count INTEGER DEFAULT 0,
ADD COLUMN following_count INTEGER DEFAULT 0,
ADD COLUMN repository_count INTEGER DEFAULT 0;

-- Add index for name field to improve search performance
CREATE INDEX idx_users_name ON users(name);