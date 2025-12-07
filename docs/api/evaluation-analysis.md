# Evaluation Analysis API 명세

BitTrend의 핵심 기능인 개발 실력 평가 분석 시스템 API입니다. GitHub 리포지토리를 분석하여 개발자의 실력을 종합적으로 평가합니다.

## 1. 평가 분석 시작

### POST `/api/analysis/evaluation`

선택된 평가 프로젝트들에 대한 종합 분석을 시작합니다.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "evaluationProjectIds": ["eval-1", "eval-2"],
  "analysisType": "comprehensive",
  "options": {
    "includeCodeQuality": true,
    "includeProjectStructure": true,
    "includeContributionPattern": true,
    "includeSkillAssessment": true,
    "includeGitHubActivity": true,
    "generateRecommendations": true
  }
}
```

**Request Fields:**
- `evaluationProjectIds` (string[]): 분석할 평가 프로젝트 ID 목록
- `analysisType` (string): 분석 유형 (`quick`, `standard`, `comprehensive`)
- `options` (object): 분석 옵션
  - `includeCodeQuality` (boolean): 코드 품질 분석 포함 여부
  - `includeProjectStructure` (boolean): 프로젝트 구조 분석 포함 여부
  - `includeContributionPattern` (boolean): 기여 패턴 분석 포함 여부
  - `includeSkillAssessment` (boolean): 기술 평가 포함 여부
  - `includeGitHubActivity` (boolean): GitHub 활동 분석 포함 여부
  - `generateRecommendations` (boolean): 개선 권장사항 생성 여부

**Response (202 Accepted):**
```json
{
  "analysisId": "analysis-123e4567-e89b-12d3-a456-426614174000",
  "status": "started",
  "projectsToAnalyze": [
    {
      "evaluationProjectId": "eval-1",
      "githubRepoName": "bitrend-client",
      "status": "queued",
      "estimatedDuration": "8-12 minutes"
    },
    {
      "evaluationProjectId": "eval-2",
      "githubRepoName": "Statio",
      "status": "queued",
      "estimatedDuration": "6-10 minutes"
    }
  ],
  "overallEstimatedDuration": "15-25 minutes",
  "startedAt": "2024-11-18T12:00:00Z",
  "queuePosition": 1
}
```

---

## 2. 분석 상태 확인

### GET `/api/analysis/evaluation/{analysisId}/status`

진행 중인 평가 분석의 상태를 확인합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `analysisId` (string): 분석 ID

**Response (200 OK):**
```json
{
  "analysisId": "analysis-123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "progress": {
    "overall": 45,
    "currentPhase": "Code Quality Analysis",
    "phases": [
      {
        "name": "Repository Analysis",
        "status": "completed",
        "progress": 100,
        "duration": 180,
        "startedAt": "2024-11-18T12:00:00Z",
        "completedAt": "2024-11-18T12:03:00Z"
      },
      {
        "name": "Code Quality Analysis",
        "status": "running",
        "progress": 65,
        "startedAt": "2024-11-18T12:03:00Z",
        "currentTask": "Analyzing complexity metrics"
      },
      {
        "name": "Project Structure Analysis",
        "status": "pending"
      },
      {
        "name": "Contribution Pattern Analysis",
        "status": "pending"
      },
      {
        "name": "Skill Assessment",
        "status": "pending"
      },
      {
        "name": "Report Generation",
        "status": "pending"
      }
    ]
  },
  "projectStatus": [
    {
      "evaluationProjectId": "eval-1",
      "githubRepoName": "bitrend-client",
      "status": "running",
      "progress": 65,
      "currentPhase": "Code Quality Analysis"
    },
    {
      "evaluationProjectId": "eval-2",
      "githubRepoName": "Statio",
      "status": "queued",
      "progress": 0
    }
  ],
  "startedAt": "2024-11-18T12:00:00Z",
  "estimatedCompletion": "2024-11-18T12:22:00Z"
}
```

**분석 상태 값:**
- `started`: 시작됨
- `queued`: 대기 중
- `running`: 실행 중
- `completed`: 완료
- `failed`: 실패
- `cancelled`: 취소됨

---

## 3. 분석 결과 조회

### GET `/api/analysis/evaluation/{analysisId}/results`

완료된 평가 분석의 결과를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `analysisId` (string): 분석 ID

**Response (200 OK):**
```json
{
  "analysisId": "analysis-123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "completedAt": "2024-11-18T12:22:15Z",
  "duration": "22 minutes 15 seconds",
  "overallResults": {
    "totalScore": 85.6,
    "overallGrade": "A",
    "skillLevel": "Senior Developer",
    "ranking": {
      "position": 3,
      "outOf": 156,
      "percentile": 98.1
    },
    "skillAssessment": {
      "frontend": 90,
      "backend": 75,
      "devOps": 65,
      "testing": 70,
      "documentation": 60
    },
    "strongPoints": [
      "뛰어난 코드 품질과 가독성",
      "일관된 프로젝트 구조",
      "활발한 커밋 활동",
      "최신 기술 스택 활용"
    ],
    "improvementAreas": [
      "테스트 커버리지 확대",
      "문서화 개선",
      "코드 리뷰 참여 증대",
      "백엔드 기술 역량 강화"
    ]
  },
  "projectResults": [
    {
      "evaluationProjectId": "eval-1",
      "githubRepo": {
        "name": "bitrend-client",
        "fullName": "bitrend/bitrend-client",
        "language": "TypeScript",
        "description": "BitTrend의 프론트엔드 클라이언트 애플리케이션"
      },
      "score": 87.2,
      "grade": "A",
      "weight": 0.6,
      "analysis": {
        "codeQuality": {
          "score": 88,
          "metrics": {
            "maintainabilityIndex": 82.5,
            "cyclomaticComplexity": 8.2,
            "cognitiveComplexity": 6.8,
            "duplicatedCodeRatio": 3.2,
            "commentRatio": 13.9
          },
          "strengths": [
            "일관된 TypeScript 사용",
            "우수한 코드 가독성",
            "적절한 추상화 수준"
          ],
          "improvements": [
            "일부 함수의 복잡도 개선 필요",
            "코드 주석 보완"
          ]
        },
        "projectStructure": {
          "score": 92,
          "metrics": {
            "directoryStructure": 95,
            "moduleOrganization": 90,
            "namingConsistency": 88,
            "dependencyManagement": 92
          },
          "strengths": [
            "명확한 디렉토리 구조",
            "잘 분리된 컴포넌트",
            "일관된 네이밍 규칙"
          ],
          "improvements": [
            "일부 큰 파일 분할 고려"
          ]
        },
        "contributionPattern": {
          "score": 85,
          "metrics": {
            "commitFrequency": 8.5,
            "commitQuality": 88,
            "branchingStrategy": 90,
            "collaborationLevel": 75
          },
          "strengths": [
            "정기적인 커밋",
            "명확한 커밋 메시지",
            "체계적인 브랜치 관리"
          ],
          "improvements": [
            "PR 리뷰 참여 증대",
            "이슈 관리 개선"
          ]
        },
        "skillAssessment": {
          "score": 85,
          "detectedTechnologies": {
            "frontend": {
              "React": 95,
              "TypeScript": 90,
              "Vite": 85,
              "Emotion": 88
            },
            "tooling": {
              "ESLint": 85,
              "Git": 90,
              "npm": 85
            }
          },
          "proficiencyLevel": "Senior Frontend Developer",
          "certificationScore": 85
        }
      }
    },
    {
      "evaluationProjectId": "eval-2",
      "githubRepo": {
        "name": "Statio",
        "fullName": "stephan/Statio",
        "language": "TypeScript",
        "description": "React 상태 관리 라이브러리"
      },
      "score": 83.4,
      "grade": "A-",
      "weight": 0.4,
      "analysis": {
        "codeQuality": {
          "score": 85,
          "metrics": {
            "maintainabilityIndex": 80.2,
            "cyclomaticComplexity": 7.1,
            "cognitiveComplexity": 5.9,
            "duplicatedCodeRatio": 2.8,
            "commentRatio": 15.2
          }
        }
      }
    }
  ],
  "activityAnalysis": {
    "overallActivity": {
      "score": 78,
      "level": "High",
      "metrics": {
        "commitConsistency": 85,
        "contributionFrequency": 80,
        "communityEngagement": 65,
        "projectDiversity": 75
      }
    },
    "contributionPatterns": {
      "weeklyPattern": [
        {"day": "Monday", "commits": 25},
        {"day": "Tuesday", "commits": 30},
        {"day": "Wednesday", "commits": 28}
      ],
      "monthlyTrend": "increasing",
      "peakHours": ["9-12", "14-18"]
    }
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "testing",
      "title": "테스트 커버리지 개선",
      "description": "현재 테스트 커버리지가 낮습니다. 단위 테스트와 통합 테스트를 추가하여 코드 신뢰성을 높이세요.",
      "actionItems": [
        "Jest 또는 Vitest 설정",
        "주요 컴포넌트 단위 테스트 작성",
        "E2E 테스트 도구 도입"
      ],
      "estimatedImpact": "+5-8 points",
      "effort": "high",
      "timeframe": "2-3 weeks"
    },
    {
      "priority": "medium",
      "category": "documentation",
      "title": "프로젝트 문서화 강화",
      "description": "README 파일과 코드 주석을 보완하여 프로젝트 이해도를 높이세요.",
      "actionItems": [
        "README 파일 상세화",
        "API 문서 작성",
        "코드 주석 보완"
      ],
      "estimatedImpact": "+3-5 points",
      "effort": "medium",
      "timeframe": "1-2 weeks"
    }
  ],
  "benchmarkComparison": {
    "similarDevelopers": {
      "averageScore": 78.2,
      "yourRanking": "top 15%",
      "sampleSize": 234
    },
    "sameLanguage": {
      "averageScore": 79.8,
      "yourRanking": "top 12%",
      "sampleSize": 189
    },
    "industryStandard": {
      "seniorLevel": 82.0,
      "yourPosition": "above average"
    }
  },
  "certificationSuggestions": [
    {
      "technology": "React",
      "currentLevel": "Advanced",
      "suggestedCertification": "React Professional Certification",
      "readinessScore": 88
    },
    {
      "technology": "TypeScript",
      "currentLevel": "Intermediate-Advanced",
      "suggestedCertification": "TypeScript Expert Certification",
      "readinessScore": 85
    }
  ]
}
```

---

## 4. 분석 히스토리 조회

### GET `/api/analysis/evaluation/history`

사용자의 평가 분석 히스토리를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (number, optional): 조회할 히스토리 개수 (기본값: 20)
- `offset` (number, optional): 페이지네이션 오프셋 (기본값: 0)
- `evaluationProjectId` (string, optional): 특정 프로젝트의 히스토리만 조회

**Response (200 OK):**
```json
{
  "analyses": [
    {
      "analysisId": "analysis-123e4567-e89b-12d3-a456-426614174000",
      "completedAt": "2024-11-18T12:22:15Z",
      "duration": "22 minutes 15 seconds",
      "analysisType": "comprehensive",
      "overallResults": {
        "totalScore": 85.6,
        "grade": "A",
        "skillLevel": "Senior Developer"
      },
      "projectsAnalyzed": [
        {
          "evaluationProjectId": "eval-1",
          "githubRepoName": "bitrend-client",
          "score": 87.2
        },
        {
          "evaluationProjectId": "eval-2",
          "githubRepoName": "Statio",
          "score": 83.4
        }
      ],
      "improvements": [
        "코드 품질 +2.3 points",
        "프로젝트 구조 +1.1 points"
      ]
    },
    {
      "analysisId": "analysis-987f6543-e21c-34d5-b789-637425285111",
      "completedAt": "2024-10-15T09:30:00Z",
      "duration": "18 minutes 42 seconds",
      "analysisType": "standard",
      "overallResults": {
        "totalScore": 81.2,
        "grade": "A-",
        "skillLevel": "Senior Developer"
      },
      "projectsAnalyzed": [
        {
          "evaluationProjectId": "eval-1",
          "githubRepoName": "bitrend-client",
          "score": 82.8
        }
      ]
    }
  ],
  "total": 8,
  "hasMore": false,
  "trends": {
    "scoreImprovement": "+4.4 points",
    "gradeProgression": "B+ → A",
    "skillLevelProgress": "Intermediate → Senior",
    "period": "last 6 months"
  },
  "nextMilestone": {
    "targetGrade": "A+",
    "requiredScore": 90.0,
    "pointsNeeded": 4.4,
    "estimatedTimeframe": "2-3 months"
  }
}
```

---

## 5. 분석 취소

### DELETE `/api/analysis/evaluation/{analysisId}`

진행 중인 평가 분석을 취소합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `analysisId` (string): 분석 ID

**Response (200 OK):**
```json
{
  "message": "분석이 취소되었습니다.",
  "analysisId": "analysis-123e4567-e89b-12d3-a456-426614174000",
  "status": "cancelled",
  "cancelledAt": "2024-11-18T12:05:30Z",
  "partialResults": {
    "completedPhases": ["Repository Analysis"],
    "dataRetained": true,
    "canRestart": true
  }
}
```

---

## 6. 개별 프로젝트 분석 조회

### GET `/api/analysis/evaluation/projects/{evaluationProjectId}/latest`

특정 평가 프로젝트의 최신 분석 결과를 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `evaluationProjectId` (string): 평가 프로젝트 ID

**Response (200 OK):**
```json
{
  "evaluationProjectId": "eval-1",
  "analysisId": "analysis-123e4567-e89b-12d3-a456-426614174000",
  "githubRepo": {
    "name": "bitrend-client",
    "fullName": "bitrend/bitrend-client",
    "language": "TypeScript",
    "lastUpdated": "2024-11-18T10:30:00Z"
  },
  "lastAnalyzed": "2024-11-18T12:22:15Z",
  "score": 87.2,
  "grade": "A",
  "detailedMetrics": {
    "codeQuality": {
      "overallScore": 88,
      "maintainabilityIndex": 82.5,
      "cyclomaticComplexity": 8.2,
      "technicalDebt": "Low",
      "codeSmells": 5,
      "securityIssues": 0
    },
    "projectStructure": {
      "overallScore": 92,
      "architectureScore": 90,
      "organizationScore": 95,
      "conventionsScore": 88,
      "scalabilityScore": 92
    },
    "contributionPattern": {
      "overallScore": 85,
      "commitActivity": 88,
      "collaborationLevel": 75,
      "codeReviewParticipation": 70
    },
    "skillAssessment": {
      "overallScore": 85,
      "frameworkMastery": 92,
      "languageProficiency": 90,
      "toolingExpertise": 80,
      "bestPracticesAdherence": 85
    }
  },
  "fileAnalysis": {
    "totalFiles": 156,
    "analyzedFiles": 134,
    "topIssues": [
      {
        "type": "complexity",
        "severity": "medium",
        "count": 3,
        "description": "함수 복잡도가 높은 파일",
        "files": [
          "src/components/Dashboard/Dashboard.tsx",
          "src/utils/api.ts"
        ]
      }
    ]
  },
  "improvementSuggestions": [
    {
      "category": "performance",
      "priority": "medium",
      "title": "컴포넌트 최적화",
      "description": "React.memo 및 useMemo 활용",
      "impact": "medium"
    }
  ],
  "historicalTrend": {
    "scoreChange": "+4.4",
    "period": "last 3 analyses",
    "trendDirection": "improving"
  }
}
```

---

## 7. 분석 설정 관리

### GET `/api/analysis/evaluation/settings`

사용자의 평가 분석 설정을 조회합니다.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "defaultAnalysisType": "comprehensive",
  "autoAnalysis": {
    "enabled": true,
    "trigger": "weekly",
    "dayOfWeek": "sunday",
    "time": "02:00",
    "onNewCommits": false
  },
  "analysisOptions": {
    "includeCodeQuality": true,
    "includeProjectStructure": true,
    "includeContributionPattern": true,
    "includeSkillAssessment": true,
    "includeGitHubActivity": true,
    "generateRecommendations": true,
    "benchmarkComparison": true
  },
  "notifications": {
    "analysisComplete": true,
    "significantImprovement": true,
    "skillLevelChange": true,
    "newRecommendations": true
  },
  "privacy": {
    "shareResultsPublicly": false,
    "allowBenchmarkParticipation": true,
    "anonymizeInAggregates": true
  }
}
```

### PATCH `/api/analysis/evaluation/settings`

사용자의 평가 분석 설정을 수정합니다.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "autoAnalysis": {
    "enabled": true,
    "trigger": "biweekly"
  },
  "notifications": {
    "skillLevelChange": true,
    "newRecommendations": false
  }
}
```

**Response (200 OK):**
```json
{
  "message": "분석 설정이 업데이트되었습니다.",
  "updatedSettings": {
    "autoAnalysis": {
      "enabled": true,
      "trigger": "biweekly",
      "time": "02:00"
    },
    "notifications": {
      "analysisComplete": true,
      "significantImprovement": true,
      "skillLevelChange": true,
      "newRecommendations": false
    }
  }
}
```

---

## TypeScript 타입 정의

TypeScript 타입 정의는 `src/types/evaluation-analysis.ts`에서 관리됩니다.


---

## 에러 응답

```json
{
  "error": {
    "code": "INSUFFICIENT_PROJECTS",
    "message": "분석을 위해서는 최소 1개의 평가 프로젝트가 필요합니다."
  }
}
```

**에러 코드:**
- `INSUFFICIENT_PROJECTS` (400): 분석할 프로젝트가 없음
- `ANALYSIS_IN_PROGRESS` (409): 이미 분석이 진행 중
- `ANALYSIS_NOT_FOUND` (404): 분석을 찾을 수 없음
- `ANALYSIS_QUOTA_EXCEEDED` (429): 분석 할당량 초과
- `PROJECT_ACCESS_DENIED` (403): 프로젝트 접근 권한 없음
- `GITHUB_API_RATE_LIMIT` (429): GitHub API 요청 한도 초과
- `REPOSITORY_NOT_ACCESSIBLE` (403): 리포지토리 접근 불가
- `ANALYSIS_TIMEOUT` (408): 분석 시간 초과
- `UNAUTHORIZED` (401): 인증 실패