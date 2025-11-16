# 로컬 개발 환경 설정 가이드

## 사전 요구사항

- Docker 설치 필요
- PostgreSQL 클라이언트 (선택사항)

## 데이터베이스 설정

### Docker Compose 사용 (권장)

프로젝트 루트에서 다음 명령어를 실행하세요:

```bash
docker-compose up -d
```

컨테이너 중지:
```bash
docker-compose down
```

데이터까지 완전히 삭제:
```bash
docker-compose down -v
```

### Docker CLI 사용

볼륨 생성 및 컨테이너 실행:

```bash
# 1. 볼륨 생성
docker volume create db-data

# 2. PostgreSQL 컨테이너 실행
docker run -d \
  --name bitrend-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bitrend \
  -p 5432:5432 \
  -v db-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

컨테이너 관리:

```bash
# 컨테이너 중지
docker stop bitrend-postgres

# 컨테이너 시작
docker start bitrend-postgres

# 컨테이너 삭제
docker rm bitrend-postgres

# 볼륨 삭제 (데이터 완전 삭제)
docker volume rm db-data
```

## 데이터베이스 접속 정보

- **Host**: localhost
- **Port**: 5432
- **Database**: bitrend
- **Username**: postgres
- **Password**: postgres

### 연결 문자열 예시

```
postgresql://postgres:postgres@localhost:5432/bitrend
```

## 데이터베이스 접속 확인

### psql 사용

```bash
psql -h localhost -p 5432 -U postgres -d bitrend
```

### Docker exec 사용

```bash
docker exec -it bitrend-postgres psql -U postgres -d bitrend
```

## 로그 확인

### Docker Compose

```bash
docker-compose logs -f
```

### Docker CLI

```bash
docker logs -f bitrend-postgres
```

## 문제 해결

### 포트 충돌

이미 5432 포트를 사용 중인 경우:

1. Docker Compose: `docker-compose.yml`에서 포트 변경
   ```yaml
   ports:
     - "5433:5432"  # 호스트 포트를 5433으로 변경
   ```

2. Docker CLI: `-p` 옵션 수정
   ```bash
   -p 5433:5432
   ```

### 컨테이너가 시작되지 않는 경우

```bash
# 컨테이너 상태 확인
docker ps -a

# 로그 확인
docker logs bitrend-postgres
```

### 데이터 초기화

```bash
# Docker Compose
docker-compose down -v
docker-compose up -d

# Docker CLI
docker stop bitrend-postgres
docker rm bitrend-postgres
docker volume rm db-data
# 위의 설정 명령어 다시 실행
```
