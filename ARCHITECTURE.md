# 프로젝트 아키텍처

## 폴더 구조

```
src/
├── index.js                 # 앱 진입점 (서버 시작)
├── app.js                   # Express 앱 설정
├── config/
│   └── database.js          # 데이터베이스 연결 설정
├── controllers/             # HTTP 요청/응답 처리
│   └── user.controller.js
├── services/                # 비즈니스 로직
│   └── user.service.js
├── repositories/            # 데이터베이스 쿼리
│   └── user.repository.js
├── routes/                  # 라우트 정의
│   └── user.routes.js
├── middlewares/             # 커스텀 미들웨어
│   └── errorHandler.js
├── utils/                   # 유틸리티 함수
└── validators/              # 요청 검증
```

## 레이어 아키텍처

### Controller Layer
- **역할**: HTTP 요청 수신 및 응답 반환
- **책임**:
  - 요청 파라미터 추출
  - 서비스 레이어 호출
  - HTTP 상태 코드 및 응답 형식 결정
- **예시**: `user.controller.js`

```javascript
const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};
```

### Service Layer
- **역할**: 비즈니스 로직 처리
- **책임**:
  - 데이터 검증 및 변환
  - 여러 repository 조합
  - 트랜잭션 관리
  - 비즈니스 규칙 적용
- **예시**: `user.service.js`

```javascript
const createUser = async (userData) => {
  // 비즈니스 로직 (유효성 검증, 데이터 변환 등)
  return await userRepository.create(userData);
};
```

### Repository Layer
- **역할**: 데이터베이스 접근
- **책임**:
  - SQL 쿼리 실행
  - 데이터베이스 CRUD 작업
  - 쿼리 결과 반환
- **예시**: `user.repository.js`

```javascript
const findById = async (id) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};
```

## 데이터 흐름

```
Request → Route → Controller → Service → Repository → Database
                      ↓            ↓          ↓
Response ← Controller ← Service ← Repository ← Database
```

1. **클라이언트 요청** → Route에서 적절한 Controller로 전달
2. **Controller** → 요청 파싱 후 Service 호출
3. **Service** → 비즈니스 로직 처리 후 Repository 호출
4. **Repository** → 데이터베이스 쿼리 실행
5. **응답** → 역순으로 데이터 반환

## 에러 처리

모든 에러는 `errorHandler` 미들웨어에서 중앙 집중식으로 처리됩니다.

```javascript
// Controller에서 에러 전달
try {
  // 로직
} catch (error) {
  next(error); // errorHandler로 전달
}
```

## 새로운 기능 추가하기

### 1. Repository 생성
```javascript
// src/repositories/post.repository.js
const db = require('../config/database');

const findAll = async () => {
  const result = await db.query('SELECT * FROM posts');
  return result.rows;
};

module.exports = { findAll };
```

### 2. Service 생성
```javascript
// src/services/post.service.js
const postRepository = require('../repositories/post.repository');

const getAllPosts = async () => {
  return await postRepository.findAll();
};

module.exports = { getAllPosts };
```

### 3. Controller 생성
```javascript
// src/controllers/post.controller.js
const postService = require('../services/post.service');

const getPosts = async (req, res, next) => {
  try {
    const posts = await postService.getAllPosts();
    res.json(posts);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPosts };
```

### 4. Route 생성
```javascript
// src/routes/post.routes.js
const express = require('express');
const postController = require('../controllers/post.controller');

const router = express.Router();
router.get('/', postController.getPosts);

module.exports = router;
```

### 5. App에 Route 등록
```javascript
// src/app.js
app.use('/api/posts', require('./routes/post.routes'));
```

## 베스트 프랙티스

### Controller
- HTTP 관련 로직만 처리
- 비즈니스 로직은 Service로 위임
- 에러는 `next(error)`로 전달

### Service
- 비즈니스 로직 집중
- 여러 Repository 조합 가능
- 트랜잭션 관리
- 재사용 가능한 로직 작성

### Repository
- 순수 데이터베이스 쿼리만
- SQL 인젝션 방지 (파라미터화된 쿼리)
- 쿼리 결과만 반환

## 테스트 전략

```
Repository → 통합 테스트 (실제 DB 또는 테스트 DB)
Service    → 단위 테스트 (Repository 모킹)
Controller → 단위 테스트 (Service 모킹)
Routes     → E2E 테스트
```

## 환경 변수

필수 환경 변수는 `.env` 파일에 정의:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
PORT=3000
NODE_ENV=development
```
