# Search API 명세서

## 사용자 검색 (User Search)

### 사용자 검색

사용자를 username과 name으로 검색하고 추천 검색어를 제공합니다.

**Endpoint**

```
GET /api/search/users
```

**Query Parameters**

| 필드  | 타입   | 필수 | 기본값 | 설명                        |
| ----- | ------ | ---- | ------ | --------------------------- |
| q     | string | O    | -      | 검색어 (username 또는 name) |
| limit | number | X    | 10     | 반환할 결과 수 (최대 50)    |

**Response (200 OK)**

```json
{
  "users": [
    {
      "id": 1,
      "username": "johndoe",
      "name": "John Doe",
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
      "followerCount": 1250
    }
  ],
  "suggestions": ["john", "johndoe", "john smith"],
  "total": 15
}
```

| 필드                  | 타입   | 설명                        |
| --------------------- | ------ | --------------------------- |
| users                 | array  | 검색된 사용자 목록          |
| users[].id            | number | 사용자 ID                   |
| users[].username      | string | GitHub 사용자명             |
| users[].name          | string | 사용자 이름                 |
| users[].avatarUrl     | string | 프로필 이미지 URL           |
| users[].followerCount | number | 팔로워 수                   |
| suggestions           | array  | 추천 검색어 목록 (최대 5개) |
| total                 | number | 전체 검색 결과 수           |

**Error Responses**

400 Bad Request

```json
{
  "error": "Search query is required"
}
```

400 Bad Request

```json
{
  "error": "Search query must be at least 1 character"
}
```

**Example**

```bash
curl -X GET "http://localhost:3000/api/search/users?q=john&limit=5"
```

---

### 특정 사용자 조회

특정 사용자의 상세 정보를 조회합니다.

**Endpoint**

```
GET /api/search/users/{username}
```

**Path Parameters**

| 필드     | 타입   | 필수 | 설명                     |
| -------- | ------ | ---- | ------------------------ |
| username | string | O    | 조회할 사용자의 username |

**Response (200 OK)**

```json
{
  "user": {
    "id": 1,
    "githubId": 12345678,
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
    "bio": "Software Developer",
    "followerCount": 1250,
    "followingCount": 180,
    "repositoryCount": 25,
    "createdAt": "2023-01-15T10:30:00Z"
  }
}
```

| 필드                 | 타입   | 설명              |
| -------------------- | ------ | ----------------- |
| user.id              | number | 서버 DB 사용자 ID |
| user.githubId        | number | GitHub 사용자 ID  |
| user.username        | string | GitHub 사용자명   |
| user.name            | string | 사용자 이름       |
| user.email           | string | 사용자 이메일     |
| user.avatarUrl       | string | 프로필 이미지 URL |
| user.bio             | string | 사용자 소개       |
| user.followerCount   | number | 팔로워 수         |
| user.followingCount  | number | 팔로잉 수         |
| user.repositoryCount | number | 레포지토리 수     |
| user.createdAt       | string | 가입일 (ISO 8601) |

**Error Responses**

404 Not Found

```json
{
  "error": "User not found"
}
```

**Example**

```bash
curl -X GET http://localhost:3000/api/search/users/johndoe
```

---

## 검색 로직

### 검색 우선순위

1. **정확한 일치**: username이 정확히 일치하는 경우
2. **시작 일치**: username이 검색어로 시작하는 경우
3. **부분 일치**: username에 검색어가 포함된 경우
4. **이름 일치**: name 필드에서 검색어가 일치하는 경우

### 추천 검색어 생성

- 입력된 검색어를 기반으로 유사한 username과 name을 추천
- 팔로워 수를 고려하여 인기순으로 정렬
- 최대 5개의 추천어 제공

---

## Rate Limiting

- 검색 API: 분당 60회
- 사용자 조회 API: 분당 100회

초과 시 429 Too Many Requests 응답:

```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```
