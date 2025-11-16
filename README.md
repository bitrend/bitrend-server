# bitrend-server

간단한 Express 기반 API 서버예요. 트렌드 데이터를 제공하는 REST 엔드포인트를 출발점으로 삼고 있으며, PostgreSQL과 Docker Compose를 이용해 빠르게 개발 환경을 구성할 수 있습니다.

## 요구 사항
- Node.js 18+
- npm (또는 호환되는 패키지 매니저)
- Docker & Docker Compose (선택 사항, 컨테이너 기반 개발 시)

## 설치 및 실행
```bash
npm install
cp .env.example .env   # DATABASE_URL 등 환경 변수 설정
npm run dev            # 코드 변경 시 자동 재시작
# 또는
npm start              # 단발 실행
```

서버가 준비되면 기본 포트는 `http://localhost:3000`입니다. `DATABASE_URL`이 비어 있으면 `/api/trends`는 임시 샘플 데이터를 반환합니다.

## Docker Compose 개발 환경
PostgreSQL과 백엔드를 한 번에 띄우고 싶다면 Docker Compose를 사용하세요.

```bash
docker compose up --build
```

- `backend` 서비스는 `node:18-alpine` 이미지를 기반으로 `npm install` 후 `npm run dev`를 실행합니다.
- 현재 워크스페이스를 `/usr/src/app`에 바인드 마운트하여 호스트 편집기로 저장한 코드가 즉시 반영됩니다.
- 변경 감지를 안정적으로 하기 위해 `nodemon`과 `CHOKIDAR_USEPOLLING=true` 설정을 함께 사용합니다.
- `backend_node_modules` 볼륨이 컨테이너 전용 `node_modules`를 보존하므로, 호스트의 `node_modules`와 충돌하지 않습니다.
- `db` 서비스는 `postgres:16-alpine` 이미지를 사용하며, `postgres/postgres` 사용자와 `bitrend` 데이터베이스를 자동 생성합니다. 데이터는 `db-data` 볼륨에 저장됩니다.

컨테이너 내부 명령 실행 예시:
```bash
docker compose exec backend npm install some-package
docker compose exec db psql -U postgres -d bitrend
```

컨테이너를 종료하려면 `docker compose down` 또는 백그라운드 실행 시 `docker compose up -d` / `docker compose stop`을 사용하세요.

## PostgreSQL 연동
1. 로컬 또는 클라우드에 PostgreSQL을 준비합니다 (Docker Compose를 사용한다면 자동으로 준비됩니다).
2. `.env` 파일의 `DATABASE_URL`을 실제 접속 정보로 수정합니다. 예: `postgres://postgres:postgres@localhost:5432/bitrend`
3. `trends` 테이블과 기본 데이터를 아래 예시처럼 생성할 수 있습니다.
   ```sql
   CREATE TABLE trends (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     popularity INTEGER NOT NULL DEFAULT 0
   );

   INSERT INTO trends (name, popularity)
   VALUES ('Express', 95), ('TypeScript', 92);
   ```
4. `/api/trends` 엔드포인트를 호출하면 위 테이블의 데이터를 반환합니다.

## 제공 엔드포인트
- `GET /health` → `{ "status": "ok" }`로 서비스 상태를 확인합니다.
- `GET /api/trends` → PostgreSQL의 `trends` 테이블을 조회하고, DB 연결이 없으면 샘플 데이터를 반환합니다.

## 폴더 구조
```
bitrend-server/
├─ src/
│  ├─ db.js       # PostgreSQL 커넥션 풀
│  └─ index.js    # Express 진입점
├─ .env.example
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
├─ .dockerignore
└─ .gitignore
```

## 커스터마이징 아이디어
- `.env` 설정을 늘리고 `dotenv` 패키지로 서버 기동 시 환경 변수를 로드하도록 개선하세요.
- 라우트, 서비스, 데이터 접근 레이어를 디렉터리로 분리해 확장성 있는 구조를 설계하세요.
- Jest 등 테스트 프레임워크를 도입해 핵심 API 동작을 검증하고 CI/CD 파이프라인과 연동하세요.
