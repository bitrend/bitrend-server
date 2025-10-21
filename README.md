# bitrend-server

## 요구 사항
- Node.js 18+
- npm (또는 필요한 경우 다른 패키지 매니저)

## 설치 및 실행
```bash
npm install
npm run dev   # 코드 변경 시 자동 재시작
# 또는
npm start
```

서버가 준비되면 기본 포트는 `http://localhost:3000`입니다.

## 제공 엔드포인트
- `GET /health` → `{ "status": "ok" }`를 반환해 서비스 상태를 확인합니다.

## 폴더 구조
```
bitrend-server/
├─ src/
│  └─ index.js   # Express 진입점
├─ package.json
└─ .gitignore
```
