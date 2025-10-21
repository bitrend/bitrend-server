# bitrend-server

간단한 Express 기반 API 서버예요. Node.js 환경에서 트렌드 데이터를 제공하는 REST 엔드포인트를 시작점으로 삼았습니다.

## 요구 사항
- Node.js 18+
- npm (또는 필요한 경우 다른 패키지 매니저)

## 설치 및 실행
```bash
npm install
cp .env.example .env   # DATABASE_URL 등 환경 변수 설정
npm run dev            # 코드 변경 시 자동 재시작
# 또는
npm start              # 단발 실행
```

서버가 준비되면 기본 포트는 `http://localhost:3000`입니다.

## 폴더 구조
```
bitrend-server/
├─ src/
│  ├─ db.js       # PostgreSQL 커넥션 풀
│  └─ index.js    # Express 진입점
├─ .env.example
├─ package.json
└─ .gitignore
```