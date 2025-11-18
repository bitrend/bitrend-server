# User API 명세

## 1. 사용자 프로필 조회

### GET `/api/users/{userId}`

사용자의 기본 프로필 정보를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `userId` (number): 사용자 ID

**Response (200 OK):**
```json
{
  "id": 1,
  "githubId": 12345678,
  "username": "stephan",
  "name": "Stephan",
  "email": "stephan@bitrend.com",
  "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
  "role": "Developer",
  "joinDate": "2024-01-15"
}
```

**Response Fields:**
- `id` (number): 사용자 고유 ID
- `githubId` (number): GitHub 사용자 ID
- `username` (string): GitHub 사용자명
- `name` (string): 사용자 이름
- `email` (string): 이메일 주소
- `avatarUrl` (string): 프로필 이미지 URL
- `role` (string): 사용자 역할 (Developer, Manager, Admin 등)
- `joinDate` (string): 가입일 (YYYY-MM-DD 형식)

---

## 2. 사용자 통계 조회

### GET `/api/users/{userId}/stats`

사용자의 프로젝트 및 활동 통계를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `userId` (number): 사용자 ID

**Response (200 OK):**
```json
{
  "totalProjects": 12,
  "completedProjects": 8,
  "inProgressProjects": 4,
  "totalContributions": 156
}
```

**Response Fields:**
- `totalProjects` (number): 전체 프로젝트 수
- `completedProjects` (number): 완료된 프로젝트 수
- `inProgressProjects` (number): 진행 중인 프로젝트 수
- `totalContributions` (number): 총 기여 수 (커밋, PR 등)

---

## 3. 사용자 최근 활동 조회

### GET `/api/users/{userId}/activities`

사용자의 최근 활동 내역을 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `userId` (number): 사용자 ID

**Query Parameters:**
- `limit` (number, optional): 조회할 활동 개수 (기본값: 10)
- `offset` (number, optional): 페이지네이션 오프셋 (기본값: 0)

**Response (200 OK):**
```json
{
  "activities": [
    {
      "id": 1,
      "type": "update",
      "action": "Updated bitrend-client",
      "projectName": "bitrend-client",
      "timestamp": "2024-11-18T10:30:00Z",
      "relativeTime": "2 hours ago"
    },
    {
      "id": 2,
      "type": "complete",
      "action": "Completed Statio project",
      "projectName": "Statio",
      "timestamp": "2024-11-17T14:20:00Z",
      "relativeTime": "1 day ago"
    },
    {
      "id": 3,
      "type": "create",
      "action": "Created new project LAYERED",
      "projectName": "LAYERED",
      "timestamp": "2024-11-15T09:15:00Z",
      "relativeTime": "3 days ago"
    },
    {
      "id": 4,
      "type": "join",
      "action": "Joined Bitrend team",
      "projectName": null,
      "timestamp": "2024-11-11T08:00:00Z",
      "relativeTime": "1 week ago"
    }
  ],
  "total": 156,
  "hasMore": true
}
```

**Response Fields:**
- `activities` (array): 활동 목록
  - `id` (number): 활동 고유 ID
  - `type` (string): 활동 타입 (update, complete, create, join, edit 등)
  - `action` (string): 활동 설명
  - `projectName` (string | null): 관련 프로젝트명
  - `timestamp` (string): 활동 시간 (ISO 8601 형식)
  - `relativeTime` (string): 상대적 시간 표시
- `total` (number): 전체 활동 개수
- `hasMore` (boolean): 추가 활동 존재 여부

---

## 4. 사용자 프로필 수정

### PATCH `/api/users/{userId}`

사용자의 프로필 정보를 수정합니다.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**
- `userId` (number): 사용자 ID

**Request Body:**
```json
{
  "name": "Stephan Kim",
  "email": "stephan.kim@bitrend.com",
  "role": "Senior Developer"
}
```

**Request Fields (모두 optional):**
- `name` (string): 사용자 이름
- `email` (string): 이메일 주소
- `role` (string): 사용자 역할

**Response (200 OK):**
```json
{
  "id": 1,
  "githubId": 12345678,
  "username": "stephan",
  "name": "Stephan Kim",
  "email": "stephan.kim@bitrend.com",
  "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
  "role": "Senior Developer",
  "joinDate": "2024-01-15"
}
```

---

## TypeScript 타입 정의

```typescript
// 사용자 프로필
export interface UserProfile {
  id: number;
  githubId: number;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  joinDate: string;
}

// 사용자 통계
export interface UserStats {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  totalContributions: number;
}

// 활동 타입
export type ActivityType = 'update' | 'complete' | 'create' | 'join' | 'edit' | 'delete';

// 사용자 활동
export interface UserActivity {
  id: number;
  type: ActivityType;
  action: string;
  projectName: string | null;
  timestamp: string;
  relativeTime: string;
}

// 활동 목록 응답
export interface UserActivitiesResponse {
  activities: UserActivity[];
  total: number;
  hasMore: boolean;
}

// 프로필 수정 요청
export interface UpdateUserProfileRequest {
  name?: string;
  email?: string;
  role?: string;
}
```

---

## 에러 응답

모든 API는 다음과 같은 형식의 에러 응답을 반환할 수 있습니다:

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "사용자를 찾을 수 없습니다."
  }
}
```

**에러 코드:**
- `USER_NOT_FOUND` (404): 사용자를 찾을 수 없음
- `UNAUTHORIZED` (401): 인증 실패
- `FORBIDDEN` (403): 권한 없음
- `VALIDATION_ERROR` (400): 요청 데이터 검증 실패
- `INTERNAL_SERVER_ERROR` (500): 서버 내부 오류
