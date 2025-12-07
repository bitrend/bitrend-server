# Projects API 명세

BitTrend는 GitHub 리포지토리를 분석하여 개발자의 실력을 평가하는 서비스입니다. 사용자는 본인의 GitHub 리포지토리 중 최대 3개를 선택하여 평가를 요청할 수 있습니다.

## 1. 평가 대상 프로젝트 목록 조회

### GET `/api/evaluation/projects`

사용자가 평가를 위해 선택한 프로젝트 목록을 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `userId` (number, optional): 특정 사용자의 평가 프로젝트 조회 (본인 또는 공개 프로필만)

**Response (200 OK):**
```json
{
  "evaluationProjects": [
    {
      "id": "eval-1",
      "githubRepo": {
        "id": "repo-123",
        "name": "bitrend-client",
        "fullName": "bitrend/bitrend-client",
        "description": "BitTrend의 프론트엔드 클라이언트 애플리케이션",
        "isPublic": true,
        "language": "TypeScript",
        "license": "MIT",
        "updatedAt": "2024-11-18T10:30:00Z",
        "githubUrl": "https://github.com/bitrend/bitrend-client",
        "stats": {
          "commits": 156,
          "contributors": 3,
          "stars": 24,
          "forks": 5,
          "size": 2048
        }
      },
      "evaluationStatus": "completed",
      "evaluationScore": 85.6,
      "evaluationGrade": "A",
      "addedAt": "2024-11-15T09:00:00Z",
      "lastEvaluatedAt": "2024-11-18T12:30:00Z",
      "priority": 1
    },
    {
      "id": "eval-2",
      "githubRepo": {
        "id": "repo-456",
        "name": "Statio",
        "fullName": "stephan/Statio",
        "description": "React 상태 관리 라이브러리",
        "isPublic": true,
        "language": "TypeScript",
        "license": "MIT",
        "updatedAt": "2024-11-17T14:20:00Z",
        "githubUrl": "https://github.com/stephan/Statio",
        "stats": {
          "commits": 89,
          "contributors": 1,
          "stars": 12,
          "forks": 2,
          "size": 1024
        }
      },
      "evaluationStatus": "pending",
      "addedAt": "2024-11-17T15:00:00Z",
      "priority": 2
    }
  ],
  "maxProjects": 3,
  "currentCount": 2,
  "availableSlots": 1,
  "overallScore": 85.6,
  "lastEvaluatedAt": "2024-11-18T12:30:00Z"
}
```

**Response Fields:**
- `evaluationProjects`: 평가 대상 프로젝트 목록
- `maxProjects`: 최대 선택 가능한 프로젝트 수 (3개)
- `currentCount`: 현재 선택된 프로젝트 수
- `availableSlots`: 추가로 선택 가능한 프로젝트 수
- `overallScore`: 전체 평가 점수 (완료된 프로젝트들의 평균)
- `lastEvaluatedAt`: 마지막 평가 시간

---

## 2. 사용자 GitHub 리포지토리 목록 조회

### GET `/api/github/repositories`

평가에 추가할 수 있는 사용자의 GitHub 리포지토리 목록을 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, optional): 페이지 번호 (기본값: 1)
- `per_page` (number, optional): 페이지당 항목 수 (기본값: 30, 최대: 100)
- `sort` (string, optional): 정렬 기준 (`created`, `updated`, `pushed`, `full_name`) (기본값: `updated`)
- `direction` (string, optional): 정렬 방향 (`asc`, `desc`) (기본값: `desc`)
- `type` (string, optional): 리포지토리 유형 (`owner`, `member`) (기본값: `owner`)

**Response (200 OK):**
```json
{
  "repositories": [
    {
      "id": "repo-789",
      "name": "awesome-project",
      "fullName": "stephan/awesome-project",
      "description": "정말 멋진 프로젝트입니다",
      "isPublic": true,
      "language": "Python",
      "license": "MIT",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-11-18T15:30:00Z",
      "githubUrl": "https://github.com/stephan/awesome-project",
      "stats": {
        "commits": 234,
        "contributors": 2,
        "stars": 45,
        "forks": 8,
        "size": 4096
      },
      "languages": {
        "Python": 78.5,
        "JavaScript": 15.2,
        "CSS": 6.3
      },
      "topics": ["machine-learning", "python", "data-science"],
      "isAlreadySelected": false,
      "canBeSelected": true,
      "selectionBlockReason": null
    },
    {
      "id": "repo-101",
      "name": "private-repo",
      "fullName": "stephan/private-repo",
      "description": "비공개 리포지토리",
      "isPublic": false,
      "language": "JavaScript",
      "updatedAt": "2024-11-17T10:00:00Z",
      "githubUrl": "https://github.com/stephan/private-repo",
      "stats": {
        "commits": 45,
        "contributors": 1,
        "stars": 0,
        "forks": 0,
        "size": 512
      },
      "isAlreadySelected": false,
      "canBeSelected": false,
      "selectionBlockReason": "private_repo"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 30,
    "total": 25,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## 3. 평가 프로젝트 추가

### POST `/api/evaluation/projects`

GitHub 리포지토리를 평가 대상으로 추가합니다.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "githubRepoId": "repo-789",
  "githubUrl": "https://github.com/stephan/awesome-project",
  "priority": 3
}
```

**Request Fields:**
- `githubRepoId` (string): GitHub 리포지토리 ID
- `githubUrl` (string): GitHub 리포지토리 URL
- `priority` (number): 평가 우선순위 (1-3, 낮을수록 높은 우선순위)

**Response (201 Created):**
```json
{
  "id": "eval-3",
  "githubRepo": {
    "id": "repo-789",
    "name": "awesome-project",
    "fullName": "stephan/awesome-project",
    "description": "정말 멋진 프로젝트입니다",
    "isPublic": true,
    "language": "Python",
    "githubUrl": "https://github.com/stephan/awesome-project"
  },
  "evaluationStatus": "pending",
  "addedAt": "2024-11-18T16:00:00Z",
  "priority": 3,
  "message": "평가 대상 프로젝트로 추가되었습니다."
}
```

---

## 4. 평가 프로젝트 순서 변경

### PUT `/api/evaluation/projects/reorder`

평가 프로젝트의 우선순위를 변경합니다.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectOrders": [
    {
      "evaluationProjectId": "eval-2",
      "priority": 1
    },
    {
      "evaluationProjectId": "eval-1",
      "priority": 2
    },
    {
      "evaluationProjectId": "eval-3",
      "priority": 3
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "프로젝트 순서가 변경되었습니다.",
  "updatedProjects": [
    {
      "id": "eval-2",
      "priority": 1
    },
    {
      "id": "eval-1",
      "priority": 2
    },
    {
      "id": "eval-3",
      "priority": 3
    }
  ]
}
```

---

## 5. 평가 프로젝트 제거

### DELETE `/api/evaluation/projects/{evaluationProjectId}`

평가 대상에서 프로젝트를 제거합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `evaluationProjectId` (string): 평가 프로젝트 ID

**Response (200 OK):**
```json
{
  "message": "평가 대상에서 제거되었습니다.",
  "removedProject": {
    "id": "eval-3",
    "githubRepoName": "awesome-project"
  },
  "remainingSlots": 2
}
```

---

## 6. 평가 요청

### POST `/api/evaluation/start`

선택된 프로젝트들에 대한 평가를 시작합니다.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "evaluationProjectIds": ["eval-1", "eval-2"],
  "evaluationType": "comprehensive",
  "options": {
    "includeCodeQuality": true,
    "includeProjectStructure": true,
    "includeContributionPattern": true,
    "includeSkillAssessment": true
  }
}
```

**Request Fields:**
- `evaluationProjectIds` (string[], optional): 평가할 프로젝트 ID 목록 (없으면 전체)
- `evaluationType` (string): 평가 유형 (`quick`, `standard`, `comprehensive`)
- `options` (object): 평가 옵션

**Response (202 Accepted):**
```json
{
  "evaluationId": "eval-session-456",
  "status": "started",
  "projectsToEvaluate": [
    {
      "id": "eval-1",
      "githubRepoName": "bitrend-client",
      "status": "queued"
    },
    {
      "id": "eval-2",
      "githubRepoName": "Statio",
      "status": "queued"
    }
  ],
  "estimatedDuration": "10-15 minutes",
  "startedAt": "2024-11-18T16:30:00Z"
}
```

---

## 7. 평가 상태 확인

### GET `/api/evaluation/{evaluationId}/status`

평가 진행 상태를 확인합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `evaluationId` (string): 평가 세션 ID

**Response (200 OK):**
```json
{
  "evaluationId": "eval-session-456",
  "status": "running",
  "progress": {
    "overall": 35,
    "projects": [
      {
        "evaluationProjectId": "eval-1",
        "githubRepoName": "bitrend-client",
        "status": "completed",
        "progress": 100,
        "score": 85.6,
        "grade": "A"
      },
      {
        "evaluationProjectId": "eval-2",
        "githubRepoName": "Statio",
        "status": "running",
        "progress": 70,
        "currentStep": "Analyzing contribution patterns"
      }
    ]
  },
  "startedAt": "2024-11-18T16:30:00Z",
  "estimatedCompletion": "2024-11-18T16:45:00Z"
}
```

---

## 8. 평가 결과 조회

### GET `/api/evaluation/{evaluationId}/results`

완료된 평가의 상세 결과를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `evaluationId` (string): 평가 세션 ID

**Response (200 OK):**
```json
{
  "evaluationId": "eval-session-456",
  "status": "completed",
  "completedAt": "2024-11-18T16:42:00Z",
  "duration": "12 minutes",
  "overallResults": {
    "totalScore": 82.3,
    "overallGrade": "A",
    "skillLevel": "Senior",
    "strongPoints": [
      "코드 품질이 뛰어남",
      "일관된 커밋 패턴",
      "좋은 프로젝트 구조"
    ],
    "improvementAreas": [
      "테스트 커버리지 개선 필요",
      "문서화 강화"
    ],
    "skillAssessment": {
      "frontend": 90,
      "backend": 75,
      "devOps": 60,
      "testing": 65,
      "documentation": 55
    }
  },
  "projectResults": [
    {
      "evaluationProjectId": "eval-1",
      "githubRepo": {
        "name": "bitrend-client",
        "fullName": "bitrend/bitrend-client"
      },
      "score": 85.6,
      "grade": "A",
      "analysis": {
        "codeQuality": {
          "score": 88,
          "metrics": {
            "maintainability": 85,
            "complexity": 78,
            "readability": 92
          }
        },
        "projectStructure": {
          "score": 90,
          "metrics": {
            "organization": 95,
            "conventions": 88,
            "modularity": 87
          }
        },
        "contributionPattern": {
          "score": 80,
          "metrics": {
            "consistency": 85,
            "frequency": 75,
            "quality": 82
          }
        }
      },
      "highlights": [
        "우수한 TypeScript 활용",
        "일관된 코딩 스타일",
        "적절한 컴포넌트 분리"
      ],
      "recommendations": [
        "단위 테스트 추가",
        "README 문서 보완"
      ]
    }
  ]
}
```

---

## TypeScript 타입 정의

TypeScript 타입 정의는 `src/types/projects.ts`에서 관리됩니다.


---

## 에러 응답

```json
{
  "error": {
    "code": "MAX_PROJECTS_EXCEEDED",
    "message": "최대 3개의 프로젝트만 선택할 수 있습니다."
  }
}
```

**에러 코드:**
- `MAX_PROJECTS_EXCEEDED` (400): 최대 프로젝트 개수 초과
- `REPOSITORY_ALREADY_SELECTED` (409): 이미 선택된 리포지토리
- `REPOSITORY_NOT_ACCESSIBLE` (403): 접근 권한이 없는 리포지토리
- `PRIVATE_REPOSITORY_NOT_ALLOWED` (400): 비공개 리포지토리는 선택 불가
- `GITHUB_API_ERROR` (502): GitHub API 연동 오류
- `EVALUATION_IN_PROGRESS` (409): 이미 평가가 진행 중
- `EVALUATION_NOT_FOUND` (404): 평가 세션을 찾을 수 없음
- `PROJECT_NOT_FOUND` (404): 평가 프로젝트를 찾을 수 없음
- `UNAUTHORIZED` (401): 인증 실패