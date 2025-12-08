# Follow API

팔로우 관련 API 엔드포인트입니다.

## 엔드포인트

### 1. 사용자 팔로우

사용자를 팔로우합니다.

**Endpoint:** `POST /api/users/:userId/follow`

**인증:** 필수 (Bearer Token)

**Parameters:**

- `userId` (path, required): 팔로우할 사용자 ID

**Response:**

```json
{
  "followerId": 1,
  "followingId": 2,
  "createdAt": "2025-12-08T10:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: 자기 자신을 팔로우하거나 이미 팔로우 중인 경우
- `401 Unauthorized`: 인증되지 않은 요청

---

### 2. 사용자 언팔로우

사용자를 언팔로우합니다.

**Endpoint:** `DELETE /api/users/:userId/follow`

**인증:** 필수 (Bearer Token)

**Parameters:**

- `userId` (path, required): 언팔로우할 사용자 ID

**Response:**

```json
{
  "message": "Unfollowed successfully"
}
```

**Error Responses:**

- `400 Bad Request`: 팔로우하지 않은 사용자를 언팔로우하려는 경우
- `401 Unauthorized`: 인증되지 않은 요청

---

### 3. 팔로우 상태 확인

특정 사용자를 팔로우하고 있는지 확인합니다.

**Endpoint:** `GET /api/users/:userId/follow/status`

**인증:** 필수 (Bearer Token)

**Parameters:**

- `userId` (path, required): 확인할 사용자 ID

**Response:**

```json
{
  "isFollowing": true
}
```

---

### 4. 팔로워 목록 조회

특정 사용자의 팔로워 목록을 조회합니다.

**Endpoint:** `GET /api/users/:userId/followers`

**인증:** 필수 (Bearer Token)

**Parameters:**

- `userId` (path, required): 사용자 ID
- `limit` (query, optional): 페이지당 항목 수 (기본값: 20)
- `offset` (query, optional): 시작 위치 (기본값: 0)

**Response:**

```json
{
  "followers": [
    {
      "id": 1,
      "username": "user1",
      "name": "User One",
      "avatarUrl": "https://avatars.githubusercontent.com/u/123456",
      "followerCount": 100,
      "followingCount": 50,
      "repositoryCount": 20
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**

- `404 Not Found`: 사용자를 찾을 수 없는 경우

---

### 5. 팔로잉 목록 조회

특정 사용자가 팔로우하는 사용자 목록을 조회합니다.

**Endpoint:** `GET /api/users/:userId/following`

**인증:** 필수 (Bearer Token)

**Parameters:**

- `userId` (path, required): 사용자 ID
- `limit` (query, optional): 페이지당 항목 수 (기본값: 20)
- `offset` (query, optional): 시작 위치 (기본값: 0)

**Response:**

```json
{
  "following": [
    {
      "id": 2,
      "username": "user2",
      "name": "User Two",
      "avatarUrl": "https://avatars.githubusercontent.com/u/234567",
      "followerCount": 200,
      "followingCount": 100,
      "repositoryCount": 30
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**

- `404 Not Found`: 사용자를 찾을 수 없는 경우

---

## 사용 예시

### 사용자 팔로우

```bash
curl -X POST http://localhost:3000/api/users/2/follow \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 팔로워 목록 조회

```bash
curl -X GET "http://localhost:3000/api/users/2/followers?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
