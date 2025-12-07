# Analytics & Dashboard API 명세

BitTrend 대시보드는 사용자의 개발 실력 평가 결과와 GitHub 활동 분석을 시각화합니다.

## 1. 대시보드 전체 데이터 조회

### GET `/api/dashboard`

사용자의 대시보드에 필요한 모든 데이터를 한 번에 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (string, optional): 데이터 기간 (`7d`, `30d`, `90d`, `1y`) (기본값: `30d`)

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "stephan",
    "name": "Stephan",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
    "skillLevel": "Senior",
    "totalScore": 85.6,
    "overallGrade": "A"
  },
  "evaluationProjects": {
    "selected": [
      {
        "id": "eval-1",
        "name": "bitrend-client",
        "description": "BitTrend의 프론트엔드 클라이언트 애플리케이션",
        "isPublic": true,
        "evaluationStatus": "completed",
        "evaluationScore": 85.6,
        "evaluationGrade": "A",
        "lastEvaluatedAt": "2024-11-18T12:30:00Z",
        "priority": 1
      },
      {
        "id": "eval-2",
        "name": "Statio",
        "description": "React 상태 관리 라이브러리",
        "isPublic": true,
        "evaluationStatus": "pending",
        "priority": 2
      }
    ],
    "summary": {
      "totalSelected": 2,
      "maxAllowed": 3,
      "completedEvaluations": 1,
      "pendingEvaluations": 1,
      "overallScore": 85.6,
      "availableSlots": 1
    }
  },
  "skillAnalysis": {
    "total": {
      "score": "85.6",
      "grade": "A",
      "skillLevel": "Senior",
      "growth": {
        "percentage": 5.2,
        "absolute": "+4.2 points",
        "period": "since last evaluation"
      }
    },
    "distribution": {
      "codeQuality": {
        "percentage": 35,
        "score": 88,
        "label": "Code Quality",
        "improvement": "+2.1"
      },
      "projectStructure": {
        "percentage": 30,
        "score": 90,
        "label": "Project Structure",
        "improvement": "+1.5"
      },
      "contributionPattern": {
        "percentage": 25,
        "score": 80,
        "label": "Contribution Pattern",
        "improvement": "+3.2"
      },
      "skillAssessment": {
        "percentage": 10,
        "score": 82,
        "label": "Skill Assessment",
        "improvement": "+0.8"
      }
    },
    "variation": {
      "chartData": [
        {
          "date": "2024-11-11",
          "value": 78.2,
          "formatted": "Nov 11"
        },
        {
          "date": "2024-11-15",
          "value": 81.4,
          "formatted": "Nov 15"
        },
        {
          "date": "2024-11-18",
          "value": 85.6,
          "formatted": "Nov 18"
        }
      ],
      "growth": {
        "percentage": 9.5,
        "period": "last 30 days"
      }
    }
  },
  "ranking": {
    "userPosition": 3,
    "totalUsers": 156,
    "percentile": 98.1,
    "topUsers": [
      {
        "rank": 1,
        "userId": 5,
        "username": "developer1",
        "avatarUrl": "https://avatars.githubusercontent.com/u/111111",
        "score": 92.4,
        "skillLevel": "Expert",
        "change": 2
      },
      {
        "rank": 2,
        "userId": 8,
        "username": "developer2",
        "avatarUrl": "https://avatars.githubusercontent.com/u/222222",
        "score": 89.1,
        "skillLevel": "Senior",
        "change": -1
      },
      {
        "rank": 3,
        "userId": 1,
        "username": "stephan",
        "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
        "score": 85.6,
        "skillLevel": "Senior",
        "change": 1,
        "isCurrentUser": true
      }
    ]
  },
  "recentActivity": {
    "lastEvaluationAt": "2024-11-18T12:30:00Z",
    "evaluationsThisMonth": 2,
    "scoreImprovement": "+4.2",
    "nextRecommendedAction": "평가할 새 프로젝트 추가"
  }
}
```

---

## 2. 개발 실력 분석 통계 조회

### GET `/api/analytics/skill-analysis`

개발 실력 평가 관련 상세 통계를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (string, optional): 데이터 기간 (`7d`, `30d`, `90d`, `1y`) (기본값: `30d`)
- `evaluationProjectId` (string, optional): 특정 평가 프로젝트의 분석 결과

**Response (200 OK):**
```json
{
  "summary": {
    "totalScore": 85.6,
    "grade": "A",
    "skillLevel": "Senior",
    "evaluatedProjects": 2,
    "growth": {
      "percentage": 5.2,
      "absolute": "+4.2 points",
      "period": "since last evaluation"
    }
  },
  "skillBreakdown": {
    "frontend": {
      "score": 90,
      "level": "Expert",
      "strengths": ["React", "TypeScript", "CSS"],
      "improvements": ["Testing", "Accessibility"]
    },
    "backend": {
      "score": 75,
      "level": "Intermediate",
      "strengths": ["API Design", "Database"],
      "improvements": ["Security", "Performance"]
    },
    "devOps": {
      "score": 65,
      "level": "Intermediate",
      "strengths": ["CI/CD"],
      "improvements": ["Docker", "Monitoring"]
    },
    "testing": {
      "score": 70,
      "level": "Intermediate",
      "strengths": ["Unit Testing"],
      "improvements": ["E2E Testing", "Coverage"]
    },
    "documentation": {
      "score": 60,
      "level": "Beginner",
      "strengths": [],
      "improvements": ["README", "Code Comments", "API Docs"]
    }
  },
  "categoryAnalysis": {
    "codeQuality": {
      "score": 88,
      "percentage": 35,
      "metrics": {
        "maintainability": 85,
        "complexity": 78,
        "readability": 92,
        "consistency": 90
      },
      "projectContributions": [
        {
          "evaluationProjectId": "eval-1",
          "projectName": "bitrend-client",
          "score": 88,
          "weight": 0.6
        },
        {
          "evaluationProjectId": "eval-2",
          "projectName": "Statio",
          "score": 85,
          "weight": 0.4
        }
      ]
    },
    "projectStructure": {
      "score": 90,
      "percentage": 30,
      "metrics": {
        "organization": 95,
        "conventions": 88,
        "modularity": 87,
        "scalability": 90
      }
    },
    "contributionPattern": {
      "score": 80,
      "percentage": 25,
      "metrics": {
        "consistency": 85,
        "frequency": 75,
        "quality": 82,
        "collaboration": 78
      }
    },
    "skillAssessment": {
      "score": 82,
      "percentage": 10,
      "metrics": {
        "languageProficiency": 85,
        "frameworkUsage": 88,
        "bestPractices": 80,
        "innovation": 75
      }
    }
  },
  "timeSeriesData": [
    {
      "date": "2024-11-11",
      "totalScore": 78.2,
      "codeQuality": 82,
      "projectStructure": 85,
      "contributionPattern": 72,
      "skillAssessment": 75,
      "formatted": "Nov 11"
    },
    {
      "date": "2024-11-15",
      "totalScore": 81.4,
      "codeQuality": 85,
      "projectStructure": 87,
      "contributionPattern": 76,
      "skillAssessment": 78,
      "formatted": "Nov 15"
    },
    {
      "date": "2024-11-18",
      "totalScore": 85.6,
      "codeQuality": 88,
      "projectStructure": 90,
      "contributionPattern": 80,
      "skillAssessment": 82,
      "formatted": "Nov 18"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "category": "documentation",
      "title": "문서화 개선",
      "description": "README 파일과 코드 주석을 개선하여 프로젝트 이해도를 높이세요.",
      "estimatedImpact": "+5-8 points",
      "effort": "medium"
    },
    {
      "priority": "medium",
      "category": "testing",
      "title": "테스트 커버리지 확대",
      "description": "단위 테스트와 통합 테스트를 추가하여 코드 신뢰성을 높이세요.",
      "estimatedImpact": "+3-5 points",
      "effort": "high"
    }
  ]
}
```

---

## 3. 사용자 랭킹 조회

### GET `/api/analytics/ranking`

전체 사용자 랭킹을 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (number, optional): 조회할 사용자 수 (기본값: 10, 최대: 100)
- `period` (string, optional): 랭킹 기준 기간 (`7d`, `30d`, `90d`, `1y`) (기본값: `30d`)
- `category` (string, optional): 랭킹 카테고리 (`overall`, `frontend`, `backend`, `mobile`) (기본값: `overall`)

**Response (200 OK):**
```json
{
  "currentUser": {
    "rank": 3,
    "userId": 1,
    "username": "stephan",
    "name": "Stephan",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
    "score": 85.6,
    "skillLevel": "Senior",
    "change": 1,
    "percentile": 98.1,
    "evaluatedProjects": 2
  },
  "topUsers": [
    {
      "rank": 1,
      "userId": 5,
      "username": "developer1",
      "name": "Developer One",
      "avatarUrl": "https://avatars.githubusercontent.com/u/111111",
      "score": 92.4,
      "skillLevel": "Expert",
      "change": 2,
      "evaluatedProjects": 3,
      "topSkills": ["React", "Node.js", "TypeScript"]
    },
    {
      "rank": 2,
      "userId": 8,
      "username": "developer2",
      "name": "Developer Two",
      "avatarUrl": "https://avatars.githubusercontent.com/u/222222",
      "score": 89.1,
      "skillLevel": "Senior",
      "change": -1,
      "evaluatedProjects": 3,
      "topSkills": ["Python", "Django", "PostgreSQL"]
    },
    {
      "rank": 3,
      "userId": 1,
      "username": "stephan",
      "name": "Stephan",
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
      "score": 85.6,
      "skillLevel": "Senior",
      "change": 1,
      "evaluatedProjects": 2,
      "topSkills": ["TypeScript", "React", "Vite"],
      "isCurrentUser": true
    }
  ],
  "rankingStats": {
    "totalUsers": 156,
    "category": "overall",
    "period": "30d",
    "scoreDistribution": {
      "expert": 12,
      "senior": 34,
      "intermediate": 78,
      "beginner": 32
    },
    "averageScore": 72.3,
    "medianScore": 68.9
  }
}
```

---

## 4. 프로젝트별 상세 평가 분석

### GET `/api/analytics/evaluations/{evaluationProjectId}`

특정 평가 프로젝트의 상세 분석 결과를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `evaluationProjectId` (string): 평가 프로젝트 ID

**Response (200 OK):**
```json
{
  "evaluationProject": {
    "id": "eval-1",
    "githubRepo": {
      "name": "bitrend-client",
      "fullName": "bitrend/bitrend-client",
      "description": "BitTrend의 프론트엔드 클라이언트 애플리케이션",
      "language": "TypeScript",
      "githubUrl": "https://github.com/bitrend/bitrend-client"
    },
    "evaluationScore": 85.6,
    "evaluationGrade": "A",
    "lastEvaluatedAt": "2024-11-18T12:30:00Z"
  },
  "detailedAnalysis": {
    "codeQuality": {
      "score": 88,
      "grade": "A",
      "metrics": {
        "maintainabilityIndex": 82.5,
        "cyclomaticComplexity": 8.2,
        "cognitiveComplexity": 6.8,
        "linesOfCode": 8942,
        "commentRatio": 13.9,
        "duplicatedCodeRatio": 3.2
      },
      "strengths": [
        "일관된 TypeScript 사용",
        "우수한 코드 가독성",
        "적절한 추상화 수준"
      ],
      "improvements": [
        "일부 함수의 복잡도 개선",
        "코드 주석 보완"
      ]
    },
    "projectStructure": {
      "score": 90,
      "grade": "A",
      "metrics": {
        "moduleCount": 67,
        "circularDependencies": 0,
        "dependencyDepth": 3,
        "componentCoupling": 0.25,
        "directoryDepth": 4,
        "namingConsistency": 95
      },
      "strengths": [
        "잘 구조화된 디렉토리",
        "명확한 컴포넌트 분리",
        "일관된 네이밍 규칙"
      ],
      "improvements": [
        "일부 큰 컴포넌트 분할"
      ]
    },
    "contributionPattern": {
      "score": 80,
      "grade": "B+",
      "metrics": {
        "commitFrequency": 8.2,
        "commitQuality": 85,
        "branchingStrategy": 90,
        "pullRequestQuality": 78,
        "issueManagement": 70
      },
      "strengths": [
        "일관된 커밋 메시지",
        "적절한 브랜치 전략",
        "정기적인 커밋 패턴"
      ],
      "improvements": [
        "PR 설명 개선",
        "이슈 관리 체계화"
      ]
    },
    "skillAssessment": {
      "score": 82,
      "grade": "A-",
      "detectedSkills": {
        "frontend": {
          "React": 95,
          "TypeScript": 90,
          "Vite": 85,
          "CSS": 80,
          "Emotion": 88
        },
        "tooling": {
          "ESLint": 85,
          "Git": 90,
          "npm": 85
        },
        "patterns": {
          "ComponentPattern": 90,
          "HooksPattern": 85,
          "StateManagement": 88
        }
      },
      "skillLevel": "Senior Frontend Developer",
      "recommendations": [
        "테스팅 프레임워크 학습",
        "접근성 개선 기법 적용"
      ]
    }
  },
  "historicalTrends": [
    {
      "evaluationDate": "2024-10-15T10:00:00Z",
      "score": 78.2,
      "grade": "B+",
      "improvements": ["코드 구조 개선", "타입 안정성 강화"]
    },
    {
      "evaluationDate": "2024-11-18T12:30:00Z",
      "score": 85.6,
      "grade": "A",
      "improvements": ["성능 최적화", "컴포넌트 설계 개선"]
    }
  ],
  "benchmarks": {
    "similarProjects": {
      "averageScore": 76.3,
      "percentileRank": 85
    },
    "sameLanguage": {
      "averageScore": 79.1,
      "percentileRank": 78
    },
    "yourOtherProjects": {
      "averageScore": 82.1,
      "bestProject": "Statio (88.2)"
    }
  }
}
```

---

## 5. 활동 통계 조회

### GET `/api/analytics/activities`

사용자의 GitHub 활동 통계를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (string, optional): 통계 기간 (`7d`, `30d`, `90d`, `1y`) (기본값: `30d`)
- `userId` (number, optional): 특정 사용자 통계 조회

**Response (200 OK):**
```json
{
  "summary": {
    "totalCommits": 156,
    "totalPullRequests": 23,
    "totalIssues": 12,
    "activeDays": 18,
    "avgCommitsPerDay": 8.7,
    "codeReviewsGiven": 45,
    "codeReviewsReceived": 23,
    "period": "30d"
  },
  "contributionCalendar": [
    {
      "date": "2024-11-11",
      "commits": 5,
      "pullRequests": 1,
      "issues": 0,
      "reviews": 2,
      "level": "medium"
    },
    {
      "date": "2024-11-12",
      "commits": 8,
      "pullRequests": 0,
      "issues": 2,
      "reviews": 1,
      "level": "high"
    }
  ],
  "languageStats": [
    {
      "language": "TypeScript",
      "linesWritten": 2847,
      "percentage": 68.5,
      "commits": 89,
      "repositories": 3
    },
    {
      "language": "JavaScript",
      "linesWritten": 892,
      "percentage": 21.4,
      "commits": 34,
      "repositories": 2
    },
    {
      "language": "CSS",
      "linesWritten": 421,
      "percentage": 10.1,
      "commits": 33,
      "repositories": 2
    }
  ],
  "repositoryContributions": [
    {
      "repoName": "bitrend/bitrend-client",
      "commits": 89,
      "pullRequests": 12,
      "percentage": 57.1,
      "role": "owner",
      "isEvaluated": true
    },
    {
      "repoName": "stephan/Statio",
      "commits": 43,
      "pullRequests": 8,
      "percentage": 27.6,
      "role": "owner",
      "isEvaluated": true
    },
    {
      "repoName": "other/project",
      "commits": 24,
      "pullRequests": 3,
      "percentage": 15.3,
      "role": "contributor",
      "isEvaluated": false
    }
  ],
  "collaborationMetrics": {
    "teamProjects": 5,
    "mentorshipActivities": 8,
    "openSourceContributions": 12,
    "communityEngagement": 75
  }
}
```

---

## TypeScript 타입 정의

TypeScript 타입 정의는 `src/types/analytics.ts`에서 관리됩니다.


---

## 에러 응답

```json
{
  "error": {
    "code": "SKILL_ANALYSIS_NOT_FOUND",
    "message": "스킬 분석 데이터를 찾을 수 없습니다."
  }
}
```

**에러 코드:**
- `SKILL_ANALYSIS_NOT_FOUND` (404): 스킬 분석 데이터가 없음
- `EVALUATION_NOT_COMPLETED` (400): 완료된 평가가 없음
- `INSUFFICIENT_DATA` (400): 분석에 충분한 데이터가 없음
- `RANKING_DATA_UNAVAILABLE` (503): 랭킹 데이터를 일시적으로 사용할 수 없음
- `INVALID_PERIOD` (400): 유효하지 않은 기간 파라미터
- `UNAUTHORIZED` (401): 인증 실패
- `FORBIDDEN` (403): 접근 권한 없음