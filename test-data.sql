-- 테스트 사용자 데이터 추가
INSERT INTO users (github_id, username, name, email, avatar_url, bio, follower_count, following_count, repository_count, created_at, updated_at)
VALUES 
  (12345678, 'johndoe', 'John Doe', 'john@example.com', 'https://avatars.githubusercontent.com/u/12345678', 'Software Developer', 1250, 180, 25, NOW(), NOW()),
  (87654321, 'janedoe', 'Jane Doe', 'jane@example.com', 'https://avatars.githubusercontent.com/u/87654321', 'Frontend Developer', 890, 120, 15, NOW(), NOW()),
  (11111111, 'johnsmith', 'John Smith', 'johnsmith@example.com', 'https://avatars.githubusercontent.com/u/11111111', 'Backend Developer', 2100, 300, 40, NOW(), NOW()),
  (22222222, 'testuser', 'Test User', 'test@example.com', 'https://avatars.githubusercontent.com/u/22222222', 'QA Engineer', 450, 80, 10, NOW(), NOW())
ON CONFLICT (github_id) DO NOTHING;