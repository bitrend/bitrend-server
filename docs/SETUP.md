# 초기 설정 가이드

## 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 데이터베이스
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitrend

# 서버
PORT=3000
NODE_ENV=development

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT
JWT_SECRET=your_jwt_secret_key_here
```

### JWT_SECRET 생성

안전한 랜덤 문자열을 생성하세요:

```bash
# Node.js로 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 OpenSSL로 생성
openssl rand -hex 32
```

## 2. 데이터베이스 설정

### Docker로 PostgreSQL 실행

```bash
docker-compose up -d
```

### Prisma로 테이블 생성

프로젝트는 Prisma ORM을 사용합니다.

#### 방법 1: Prisma Generate (권장)

```bash
# Prisma Client 생성
npx prisma generate

# Docker에서 직접 테이블 생성
docker exec bitrend-postgres psql -U postgres -d bitrend -c "
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  github_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
"
```

#### 방법 2: Prisma Migrate (환경에 따라 작동 안 할 수 있음)

```bash
npx prisma migrate dev --name init
```

### 테이블 확인

```bash
docker exec bitrend-postgres psql -U postgres -d bitrend -c "\d users"
```

## 3. GitHub OAuth 앱 설정

1. GitHub 설정 페이지로 이동: https://github.com/settings/developers
2. "New OAuth App" 클릭
3. 정보 입력:
   - **Application name**: Bitrend (또는 원하는 이름)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/callback` (프론트엔드 URL)
4. "Register application" 클릭
5. Client ID와 Client Secret을 `.env` 파일에 추가

## 4. 의존성 설치

```bash
npm install
```

## 5. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## 6. 동작 확인

### Health Check

```bash
curl http://localhost:3000/health
```

응답:
```json
{
  "status": "ok"
}
```

### 데이터베이스 연결 확인

서버 로그에서 다음 메시지 확인:
```
[db] Connected to database
Server listening on http://localhost:3000
```

## 7. 테스트

### GitHub OAuth 플로우 테스트

1. 프론트엔드에서 GitHub OAuth 시작
2. GitHub 인증 후 authorization code 받기
3. 서버에 콜백 요청:

```bash
curl -X POST http://localhost:3000/api/auth/github/callback \
  -H "Content-Type: application/json" \
  -d '{"authorizationCode": "받은_코드"}'
```

4. JWT 토큰 받기
5. 토큰으로 API 호출:

```bash
curl http://localhost:3000/api/images \
  -H "Authorization: Bearer 받은_JWT_토큰"
```

## 문제 해결

### 데이터베이스 연결 실패

```bash
# PostgreSQL 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs bitrend-postgres

# 재시작
docker-compose restart
```

### JWT 토큰 에러

- `.env` 파일에 `JWT_SECRET`이 설정되어 있는지 확인
- 서버 재시작

### GitHub OAuth 에러

- GitHub OAuth 앱 설정 확인
- Client ID와 Secret이 올바른지 확인
- Callback URL이 일치하는지 확인
