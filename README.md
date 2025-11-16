# Bitrend Server

Express 기반 백엔드 서버

## 시작하기

### 설치

```bash
npm install
```

### 환경 설정

`.env` 파일 생성:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitrend
PORT=3000
NODE_ENV=development
```

### 데이터베이스 설정

Docker Compose 사용:

```bash
docker-compose up -d
```

자세한 내용은 [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) 참고

### 개발 서버 실행

```bash
npm run dev
```

### 프로덕션 실행

```bash
npm start
```

## 문서

- [초기 설정 가이드](./docs/SETUP.md) ⭐ 시작하기
- [API 명세서](./docs/API.md)
- [Prisma 가이드](./docs/PRISMA.md)
- [로컬 개발 환경 설정](./docs/LOCAL_DEVELOPMENT.md)
- [프로젝트 아키텍처](./docs/ARCHITECTURE.md)

## 프로젝트 구조

```
src/
├── index.js              # 서버 진입점
├── app.js                # Express 앱 설정
├── config/               # 설정 파일
├── controllers/          # HTTP 요청/응답 처리
├── services/             # 비즈니스 로직
├── repositories/         # 데이터베이스 쿼리
├── routes/               # 라우트 정의
└── middlewares/          # 커스텀 미들웨어
```

## API 엔드포인트

### Health Check
```
GET /health
```

### Users (예시)
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
```

## 기술 스택

- Node.js
- Express 5
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Docker
