# BitTrend 서비스 구현 PRD (Product Requirements Document)

## 개요

BitTrend는 GitHub 리포지토리 분석을 통해 개발자의 실력을 종합적으로 평가하는 서비스입니다. 개발자는 자신의 GitHub 프로젝트를 등록하여 코드 품질, 프로젝트 구조, 기여 패턴, 기술 스택 등을 분석받고 실력 향상을 위한 개인화된 피드백을 받을 수 있습니다.

---

## 현재 구현 현황

### ✅ 구현 완료
- **인증 시스템**: GitHub OAuth 기반 로그인/로그아웃
- **사용자 관리**: 기본 CRUD, 프로필 조회/수정
- **기본 인프라**: Express.js, Prisma ORM, PostgreSQL, JWT 토큰
- **API 문서**: Swagger UI 통합

### ❌ 미구현 (구현 필요)
- 프로젝트 관리 시스템
- GitHub 리포지토리 분석 엔진
- 개발 실력 평가 시스템
- 대시보드 및 통계 API
- 랭킹 시스템
- 활동 로깅 시스템

---

## 데이터베이스 설계

### 현재 스키마

#### Users 테이블 (기존)
```prisma
model User {
  id          Int      @id @default(autoincrement())
  githubId    BigInt   @unique
  username    String
  name        String?
  email       String?
  avatarUrl   String?
  role        String?
  accessToken String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 추가 필요 테이블

#### 1. GitHubRepositories 테이블
```prisma
model GitHubRepository {
  id            String   @id
  name          String
  fullName      String
  description   String?
  isPublic      Boolean
  language      String?
  license       String?
  githubUrl     String
  stars         Int      @default(0)
  forks         Int      @default(0)
  size          Int      @default(0)
  commits       Int      @default(0)
  contributors  Int      @default(1)
  topics        String[] @default([])
  languages     Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastFetchedAt DateTime @default(now())

  evaluationProjects EvaluationProject[]

  @@index([fullName])
  @@index([language])
  @@map("github_repositories")
}
```

#### 2. EvaluationProjects 테이블
```prisma
model EvaluationProject {
  id              String           @id @default(cuid())
  userId          Int
  githubRepoId    String
  priority        Int              @default(1)
  evaluationStatus EvaluationStatus @default(PENDING)
  evaluationScore  Float?
  evaluationGrade  String?
  addedAt         DateTime         @default(now())
  lastEvaluatedAt DateTime?

  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  githubRepo GitHubRepository  @relation(fields: [githubRepoId], references: [id], onDelete: Cascade)
  analyses   Analysis[]

  @@unique([userId, githubRepoId])
  @@index([userId])
  @@index([evaluationStatus])
  @@map("evaluation_projects")
}

enum EvaluationStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

#### 3. Analysis 테이블
```prisma
model Analysis {
  id                    String        @id @default(cuid())
  evaluationProjectId   String
  analysisType          AnalysisType  @default(COMPREHENSIVE)
  status                AnalysisStatus @default(PENDING)
  overallScore          Float?
  overallGrade          String?
  skillLevel            String?
  codeQualityScore      Float?
  projectStructureScore Float?
  contributionScore     Float?
  skillAssessmentScore  Float?
  startedAt             DateTime      @default(now())
  completedAt           DateTime?
  duration              Int? // seconds
  errorMessage          String?

  evaluationProject EvaluationProject @relation(fields: [evaluationProjectId], references: [id], onDelete: Cascade)
  metrics          AnalysisMetric[]
  recommendations  Recommendation[]

  @@index([evaluationProjectId])
  @@index([status])
  @@index([completedAt])
  @@map("analyses")
}

enum AnalysisType {
  QUICK
  STANDARD
  COMPREHENSIVE
}

enum AnalysisStatus {
  PENDING
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

#### 4. AnalysisMetrics 테이블
```prisma
model AnalysisMetric {
  id         String @id @default(cuid())
  analysisId String
  category   String // 'codeQuality', 'projectStructure', etc.
  metricName String
  value      Float
  details    Json?

  analysis Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId, category])
  @@map("analysis_metrics")
}
```

#### 5. Recommendations 테이블
```prisma
model Recommendation {
  id             String @id @default(cuid())
  analysisId     String
  priority       String // 'high', 'medium', 'low'
  category       String
  title          String
  description    String
  estimatedImpact String?
  effort         String?
  timeframe      String?
  actionItems    String[]

  analysis Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId])
  @@map("recommendations")
}
```

#### 6. UserActivities 테이블
```prisma
model UserActivity {
  id           String       @id @default(cuid())
  userId       Int
  type         ActivityType
  action       String
  projectName  String?
  metadata     Json?
  timestamp    DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([timestamp])
  @@map("user_activities")
}

enum ActivityType {
  UPDATE
  COMPLETE
  CREATE
  JOIN
  EDIT
  DELETE
}
```

#### 7. UserStats 테이블
```prisma
model UserStats {
  id                   String   @id @default(cuid())
  userId               Int      @unique
  totalProjects        Int      @default(0)
  completedProjects    Int      @default(0)
  inProgressProjects   Int      @default(0)
  totalContributions   Int      @default(0)
  lastUpdated          DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_stats")
}
```

#### 8. UserRankings 테이블
```prisma
model UserRanking {
  id          String   @id @default(cuid())
  userId      Int
  rank        Int
  score       Float
  percentile  Float
  category    String   @default("overall")
  period      String   @default("30d")
  calculatedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category, period])
  @@index([rank, category, period])
  @@map("user_rankings")
}
```

#### User 모델 업데이트
```prisma
model User {
  id          Int      @id @default(autoincrement())
  githubId    BigInt   @unique @map("github_id")
  username    String   @db.VarChar(255)
  name        String?  @db.VarChar(255)
  email       String?  @db.VarChar(255)
  avatarUrl   String?  @map("avatar_url") @db.Text
  role        String?  @db.VarChar(100)
  accessToken String?  @map("access_token") @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  evaluationProjects EvaluationProject[]
  activities        UserActivity[]
  stats             UserStats?
  rankings          UserRanking[]

  @@index([githubId])
  @@index([username])
  @@map("users")
}
```

---

## API 구현 요구사항

### 1. GitHub 프로젝트 관리 API

#### `/api/github/repositories` (GET)
- GitHub API 연동하여 사용자 리포지토리 목록 조회
- 페이지네이션, 정렬, 필터링 지원
- 이미 선택된 프로젝트 표시

#### `/api/evaluation/projects` (GET/POST/DELETE)
- 평가 대상 프로젝트 CRUD
- 최대 3개 제한 검증
- 우선순위 관리

#### `/api/evaluation/projects/reorder` (PUT)
- 프로젝트 우선순위 변경

### 2. 평가 분석 시스템 API

#### `/api/analysis/evaluation` (POST)
- 프로젝트 분석 시작
- 백그라운드 작업으로 처리
- 분석 옵션 설정 가능

#### `/api/analysis/evaluation/{analysisId}/status` (GET)
- 실시간 분석 진행 상태 확인
- 진행률, 현재 단계 정보 제공

#### `/api/analysis/evaluation/{analysisId}/results` (GET)
- 완료된 분석 결과 조회
- 상세 메트릭, 추천사항 포함

#### `/api/analysis/evaluation/history` (GET)
- 분석 히스토리 조회
- 진행 추이, 개선 사항 표시

### 3. 대시보드 & 통계 API

#### `/api/dashboard` (GET)
- 대시보드 전체 데이터 일괄 조회
- 사용자 정보, 평가 결과, 스킬 분석, 랭킹 포함

#### `/api/analytics/skill-analysis` (GET)
- 개발 실력 상세 분석
- 분야별 점수, 성장 추이, 추천사항

#### `/api/analytics/ranking` (GET)
- 사용자 랭킹 시스템
- 전체/카테고리별 순위

#### `/api/analytics/activities` (GET)
- GitHub 활동 통계
- 기여 캘린더, 언어별 통계

### 4. 사용자 프로필 API (기존 확장)

#### `/api/users/{userId}/stats` (GET)
- 사용자 통계 조회

#### `/api/users/{userId}/activities` (GET)
- 사용자 활동 내역 조회

---

## 서비스 아키텍처 구현

### 1. GitHub API 연동 서비스
```javascript
// src/services/github.service.js 확장
class GitHubService {
  async getUserRepositories(accessToken, options = {}) {
    // GitHub API로 사용자 리포지토리 조회
  }

  async getRepositoryDetails(fullName, accessToken) {
    // 리포지토리 상세 정보 조회
  }

  async analyzeRepository(fullName, accessToken) {
    // 리포지토리 코드 분석 (파일 구조, 언어 통계 등)
  }

  async getCommitHistory(fullName, accessToken, options = {}) {
    // 커밋 히스토리 분석
  }
}
```

### 2. 분석 엔진 서비스
```javascript
// src/services/analysis.service.js (신규)
class AnalysisService {
  async startAnalysis(evaluationProjectIds, options = {}) {
    // 분석 작업 큐에 추가
  }

  async analyzeCodeQuality(repoData) {
    // 코드 품질 메트릭 계산
  }

  async analyzeProjectStructure(repoData) {
    // 프로젝트 구조 분석
  }

  async analyzeContributionPattern(repoData, commitHistory) {
    // 기여 패턴 분석
  }

  async assessSkills(repoData, technologies) {
    // 기술 스택 기반 스킬 평가
  }

  async generateRecommendations(analysisResult) {
    // 개선 권장사항 생성
  }
}
```

### 3. 백그라운드 작업 처리
- **작업 큐**: Bull Queue (Redis 기반) 또는 AWS SQS
- **스케줄링**: node-cron으로 주기적 분석
- **진행 상태 관리**: Redis 또는 데이터베이스로 실시간 상태 추적

### 4. 랭킹 시스템
```javascript
// src/services/ranking.service.js (신규)
class RankingService {
  async calculateRankings(category = 'overall', period = '30d') {
    // 점수 기반 랭킹 계산
  }

  async updateUserRanking(userId) {
    // 사용자 개별 랭킹 업데이트
  }

  async getUserRanking(userId, category, period) {
    // 사용자 랭킹 조회
  }
}
```

### 5. 활동 로깅 시스템
```javascript
// src/services/activity.service.js (신규)
class ActivityService {
  async logActivity(userId, type, action, metadata = {}) {
    // 사용자 활동 로깅
  }

  async getUserActivities(userId, options = {}) {
    // 사용자 활동 내역 조회
  }

  async updateUserStats(userId) {
    // 사용자 통계 업데이트
  }
}
```

---

## 구현 우선순위

### Phase 1: 핵심 기능
1. **데이터베이스 스키마 구현**
   - 새 테이블 생성 및 마이그레이션
   - Repository 계층 구현

2. **GitHub 프로젝트 관리**
   - 리포지토리 목록 조회 API
   - 평가 프로젝트 CRUD API

3. **기본 분석 시스템**
   - 간단한 코드 메트릭 분석
   - 분석 상태 관리

### Phase 2: 분석 엔진
1. **고급 분석 기능**
   - 코드 품질 메트릭
   - 프로젝트 구조 분석
   - 기여 패턴 분석

2. **백그라운드 처리**
   - 작업 큐 시스템
   - 진행 상태 추적

3. **평가 알고리즘**
   - 점수 계산 로직
   - 등급 시스템

### Phase 3: 대시보드 & 통계
1. **대시보드 API**
   - 통합 데이터 조회
   - 성능 최적화

2. **통계 시스템**
   - 사용자별 통계
   - 랭킹 시스템

3. **활동 추적**
   - 로깅 시스템
   - 활동 내역 API

### Phase 4: 고도화
1. **추천 시스템**
   - 개인화된 권장사항
   - 학습 경로 제안

2. **성능 최적화**
   - 캐싱 전략
   - 쿼리 최적화

3. **모니터링**
   - 로그 시스템
   - 에러 추적

---

## 기술적 고려사항

### 1. 성능
- **캐싱**: Redis로 GitHub API 응답, 분석 결과 캐시
- **데이터베이스 최적화**: 적절한 인덱스, 쿼리 최적화
- **비동기 처리**: 분석 작업 백그라운드 처리

### 2. 확장성
- **모듈화**: 분석 엔진을 독립적 마이크로서비스로 분리 가능
- **큐 시스템**: 분석 작업량 증가에 대응

### 3. 보안
- **GitHub API 토큰 관리**: 암호화 저장
- **접근 권한 제어**: 사용자별 프로젝트 접근 제한
- **Rate Limiting**: API 남용 방지

### 4. 모니터링
- **로깅**: Winston 또는 similar
- **메트릭**: Prometheus + Grafana
- **에러 추적**: Sentry

---

## 예상 완료 일정

- **Phase 1**: 2주 (기본 프로젝트 관리)
- **Phase 2**: 3주 (분석 엔진 구현)
- **Phase 3**: 2주 (대시보드 & 통계)
- **Phase 4**: 1주 (최적화 & 마무리)

**총 예상 개발 기간**: 8주

---

## 리스크 및 대응방안

### 1. GitHub API 제한
- **리스크**: Rate Limiting, 접근 권한 제한
- **대응**: 효율적인 캐싱, 배치 처리, 사용량 모니터링

### 2. 분석 복잡도
- **리스크**: 분석 시간 지연, 정확도 문제
- **대응**: 단계적 구현, A/B 테스트, 사용자 피드백 수집

### 3. 데이터 일관성
- **리스크**: GitHub 데이터 변경, 동기화 문제
- **대응**: 정기적 동기화, 버전 관리, 롤백 전략

이 PRD를 기반으로 단계적으로 구현을 진행하여 BitTrend 서비스를 완성할 수 있습니다.