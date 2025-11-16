# API 명세서

## 인증 (Authentication)

### GitHub OAuth 콜백

GitHub OAuth 인증 후 authorization code를 access token으로 교환합니다.

**Endpoint**
```
POST /api/auth/github/callback
```

**Request Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "authorizationCode": "string"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| authorizationCode | string | O | GitHub에서 받은 authorization code |

**Response (200 OK)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "githubId": 12345678,
    "username": "username",
    "name": "User Name",
    "email": "user@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| token | string | 서버 JWT 토큰 (7일 유효) |
| user.id | number | 서버 DB 사용자 ID |
| user.githubId | number | GitHub 사용자 ID |
| user.username | string | GitHub 사용자명 |
| user.name | string | 사용자 이름 |
| user.email | string | 사용자 이메일 |
| user.avatarUrl | string | 프로필 이미지 URL |

**Error Responses**

400 Bad Request
```json
{
  "error": "Authorization code is required"
}
```

500 Internal Server Error
```json
{
  "error": "Failed to get access token from GitHub"
}
```

**Example**

```bash
curl -X POST http://localhost:3000/api/auth/github/callback \
  -H "Content-Type: application/json" \
  -d '{
    "authorizationCode": "abc123def456"
  }'
```

---

## 이미지 (Images)

### 이미지 목록 조회

인증된 사용자의 이미지 목록을 조회합니다.

**Endpoint**
```
GET /api/images
```

**Request Headers**
```
Authorization: Bearer {access_token}
```

| 헤더 | 타입 | 필수 | 설명 |
|------|------|------|------|
| Authorization | string | O | Bearer 토큰 또는 access token |

**Response (200 OK)**
```json
{
  "images": [
    {
      "id": 1,
      "url": "/images/sample1.jpg",
      "name": "sample1.jpg"
    },
    {
      "id": 2,
      "url": "/images/sample2.jpg",
      "name": "sample2.jpg"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| images | array | 이미지 목록 |
| images[].id | number | 이미지 ID |
| images[].url | string | 이미지 URL |
| images[].name | string | 이미지 파일명 |

**Error Responses**

403 Forbidden (토큰 없음)
```json
{
  "message": "no permission to access resources"
}
```

401 Unauthorized (토큰 만료/유효하지 않음)
```json
{
  "message": "invalid or expired token"
}
```

**Example**

```bash
# Bearer 토큰 형식
curl -X GET http://localhost:3000/api/images \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 토큰만 전달
curl -X GET http://localhost:3000/api/images \
  -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Health Check

### 서버 상태 확인

서버가 정상적으로 동작하는지 확인합니다.

**Endpoint**
```
GET /health
```

**Response (200 OK)**
```json
{
  "status": "ok"
}
```

**Example**

```bash
curl http://localhost:3000/health
```

---

## 인증 플로우

1. 클라이언트가 GitHub OAuth 페이지로 사용자를 리다이렉트
2. 사용자가 GitHub에서 인증 승인
3. GitHub이 클라이언트에게 authorization code 전달
4. 클라이언트가 `POST /api/auth/github/callback`에 authorization code 전송
5. 서버가 GitHub에서 사용자 정보 조회
6. 서버가 DB에 사용자 저장/업데이트 (회원가입/로그인)
7. 서버가 JWT 토큰 발급 및 사용자 정보 반환
8. 클라이언트가 이후 요청에 JWT 토큰을 Authorization 헤더에 포함

```
Client → GitHub OAuth → Client receives code
  ↓
POST /api/auth/github/callback (with code)
  ↓
Server → GitHub API (get user info)
  ↓
Server → Database (find or create user)
  ↓
Server generates JWT token
  ↓
Server returns JWT + user info
  ↓
Client uses JWT in Authorization header
```

---

## 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "error": "Error message"
}
```

개발 환경(`NODE_ENV=development`)에서는 스택 트레이스가 포함됩니다:

```json
{
  "error": "Error message",
  "stack": "Error: ...\n    at ..."
}
```

---

## 환경 변수

API 사용을 위해 필요한 환경 변수:

```bash
# 서버 설정
PORT=3000
NODE_ENV=development

# 데이터베이스
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitrend

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT
JWT_SECRET=your_jwt_secret_key_here
```
