# Prisma 가이드

## Prisma란?

Prisma는 Node.js와 TypeScript를 위한 차세대 ORM입니다.

### 주요 특징
- 타입 안전한 데이터베이스 쿼리
- 자동 완성 지원
- 직관적인 API
- 마이그레이션 관리
- Prisma Studio (DB GUI)

## 프로젝트 구조

```
prisma/
├── schema.prisma          # 데이터 모델 정의
└── migrations/            # 마이그레이션 파일들
    └── 20231117_init/
        └── migration.sql

src/
├── config/
│   └── prisma.js         # Prisma Client 인스턴스
└── repositories/
    └── user.repository.js # Prisma를 사용한 데이터 접근
```

## 스키마 정의

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  githubId  BigInt   @unique @map("github_id")
  username  String   @db.VarChar(255)
  name      String?  @db.VarChar(255)
  email     String?  @db.VarChar(255)
  avatarUrl String?  @map("avatar_url") @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([githubId])
  @@index([username])
  @@map("users")
}
```

### 필드 타입

| Prisma 타입 | PostgreSQL 타입 | 설명 |
|------------|----------------|------|
| Int | INTEGER | 정수 |
| BigInt | BIGINT | 큰 정수 |
| String | VARCHAR/TEXT | 문자열 |
| Boolean | BOOLEAN | 불린 |
| DateTime | TIMESTAMP | 날짜/시간 |
| Json | JSONB | JSON 데이터 |

### 속성

- `@id` - 기본 키
- `@unique` - 유니크 제약
- `@default()` - 기본값
- `@map()` - DB 컬럼명 매핑
- `@@map()` - DB 테이블명 매핑
- `@@index()` - 인덱스 생성
- `@updatedAt` - 자동 업데이트 시간

## Prisma Client 사용법

### 초기화

```javascript
// src/config/prisma.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

module.exports = prisma;
```

### CRUD 작업

#### 조회 (Read)

```javascript
const prisma = require('../config/prisma');

// 단일 조회
const user = await prisma.user.findUnique({
  where: { id: 1 }
});

// 조건 조회
const user = await prisma.user.findFirst({
  where: { email: 'user@example.com' }
});

// 전체 조회
const users = await prisma.user.findMany();

// 조건부 조회
const users = await prisma.user.findMany({
  where: {
    name: { contains: 'John' }
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0
});
```

#### 생성 (Create)

```javascript
const user = await prisma.user.create({
  data: {
    githubId: 12345678,
    username: 'johndoe',
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

#### 업데이트 (Update)

```javascript
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    name: 'Jane Doe',
    email: 'jane@example.com'
  }
});

// Upsert (있으면 업데이트, 없으면 생성)
const user = await prisma.user.upsert({
  where: { githubId: 12345678 },
  update: { name: 'Updated Name' },
  create: {
    githubId: 12345678,
    username: 'johndoe',
    name: 'John Doe'
  }
});
```

#### 삭제 (Delete)

```javascript
const user = await prisma.user.delete({
  where: { id: 1 }
});

// 다중 삭제
const result = await prisma.user.deleteMany({
  where: {
    createdAt: {
      lt: new Date('2023-01-01')
    }
  }
});
```

### 고급 쿼리

#### 관계 조회

```javascript
// 관계 포함
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: true,
    profile: true
  }
});

// 특정 필드만 선택
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    username: true,
    email: true
  }
});
```

#### 트랜잭션

```javascript
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { ... } });
  const profile = await tx.profile.create({ 
    data: { userId: user.id, ... } 
  });
  return { user, profile };
});
```

#### Raw SQL

```javascript
// Raw 쿼리
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE name LIKE ${`%${search}%`}
`;

// Raw 실행
await prisma.$executeRaw`
  UPDATE users SET updated_at = NOW() WHERE id = ${userId}
`;
```

## 마이그레이션

### 개발 환경

```bash
# 마이그레이션 생성 및 적용
npx prisma migrate dev --name add_user_table

# 스키마 변경 후 DB 동기화
npx prisma db push
```

### 프로덕션 환경

```bash
# 마이그레이션 적용
npx prisma migrate deploy

# 마이그레이션 상태 확인
npx prisma migrate status
```

## Prisma Studio

데이터베이스 GUI 도구:

```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555` 열림

## 유용한 명령어

```bash
# Prisma Client 생성/재생성
npx prisma generate

# 스키마 포맷팅
npx prisma format

# 스키마 검증
npx prisma validate

# DB에서 스키마 가져오기 (Introspection)
npx prisma db pull

# 스키마를 DB에 푸시 (마이그레이션 없이)
npx prisma db push

# 마이그레이션 리셋 (주의: 데이터 삭제됨)
npx prisma migrate reset
```

## 베스트 프랙티스

### 1. Prisma Client 싱글톤

```javascript
// src/config/prisma.js
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

module.exports = prisma;
```

### 2. 에러 처리

```javascript
try {
  const user = await prisma.user.create({ data: { ... } });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint 위반
    throw new Error('User already exists');
  }
  throw error;
}
```

### 3. 연결 관리

```javascript
// 앱 종료 시 연결 닫기
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

## 문제 해결

### Prisma Client 재생성

스키마 변경 후:

```bash
npx prisma generate
```

### 타입 에러

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
npm install
npx prisma generate
```

### 마이그레이션 충돌

```bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 리셋 (개발 환경만)
npx prisma migrate reset
```

## 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
