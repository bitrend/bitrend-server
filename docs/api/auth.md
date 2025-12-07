# 인증 (Authentication) 시스템

## 개요

Bitrend 클라이언트는 GitHub OAuth를 통한 인증을 사용하며, JWT 토큰 기반으로 사용자 세션을 관리합니다.

## 기술 스택

- **상태 관리**: statio-lib (자체 제작 상태관리 라이브러리)
- **저장소**: localStorage (자동 동기화)
- **인증 방식**: GitHub OAuth 2.0
- **토큰 형식**: JWT (7일 유효)

## 인증 플로우

```
1. 사용자가 "GitHub으로 로그인" 버튼 클릭
   ↓
2. GitHub OAuth 페이지로 리다이렉트
   ↓
3. 사용자 승인 후 authorization code와 함께 리다이렉트
   ↓
4. 백엔드 API로 authorization code 전송
   ↓
5. 백엔드가 GitHub에서 access token 교환 후 JWT 발급
   ↓
6. JWT와 사용자 정보를 statio에 저장 (자동으로 localStorage 동기화)
   ↓
7. Dashboard로 이동
```

## 상태 관리 구조

### Statio 설정 (src/main.tsx)

```typescript
import { globalStore, persistStatio } from "statio-lib";

const keyPrefix = "statio:";
const whitelist = ['authToken', 'authUser'];

// 1. localStorage에서 초기값 복원
whitelist.forEach((key) => {
  const stored = localStorage.getItem(`${keyPrefix}${key}`);
  if (stored) {
    try {
      globalStore.set(key, JSON.parse(stored));
    } catch (e) {
      console.warn(`Failed to restore ${key} from localStorage`, e);
    }
  }
});

// 2. persistStatio 미들웨어 등록 (이후 변경사항 자동 저장)
globalStore.use(persistStatio({
  keyPrefix,
  storage: localStorage,
  whitelist
}));
```

### 저장되는 데이터

localStorage에 다음 키로 저장됩니다:

- `statio:authToken`: JWT 토큰 문자열
- `statio:authUser`: 사용자 정보 객체 (JSON)

### 컴포넌트에서 사용

```typescript
import { useStatio } from "statio-lib";
import type { User } from "./types/auth";

function App() {
  const [token, setToken] = useStatio<string>('authToken', '');
  const [user, setUser] = useStatio<User | null>('authUser', null);
  
  // 로그인 처리
  const handleLogin = (tokenData: TokenResponse) => {
    setToken(tokenData.token);  // 자동으로 localStorage에 저장됨
    setUser(tokenData.user);    // 자동으로 localStorage에 저장됨
  };
  
  // 로그아웃 처리
  const handleLogout = () => {
    setToken('');
    setUser(null);
  };
}
```

## API 엔드포인트

### GitHub OAuth 콜백

**Endpoint**: `POST /api/auth/github/callback`

**Request**:
```json
{
  "authorizationCode": "string"
}
```

**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "githubId": 12345678,
    "username": "username",
    "name": "User Name",
    "email": "user@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Authorization code가 없음
- `500 Internal Server Error`: GitHub 토큰 교환 실패

## 인증 유틸리티 (src/utils/auth.ts)

컴포넌트 외부에서 인증 상태에 접근해야 할 때 사용:

```typescript
import { auth } from "./utils/auth";

// 토큰 가져오기
const token = auth.getToken();

// 사용자 정보 가져오기
const user = auth.getUser();

// 로그인 여부 확인
if (auth.isAuthenticated()) {
  // 인증된 사용자
}

// 로그아웃
auth.logout();
```

## 타입 정의

TypeScript 타입 정의는 `src/types/auth.ts`에서 관리됩니다.

## 라우트 보호

App.tsx에서 토큰이 없으면 자동으로 로그인 페이지로 리다이렉트:

```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  
  if (code && !isProcessingCode) {
    getAccessToken(code);
  } else if (!token && location.pathname !== "/login" && !code) {
    navigate("/login");
  }
}, [location, token]);
```

## 보안 고려사항

### 현재 구현
- JWT 토큰을 localStorage에 저장
- 7일 유효기간
- 페이지 새로고침 시 자동 복원

### 보안 제한사항
- localStorage는 XSS 공격에 취약할 수 있음
- JavaScript로 접근 가능

### 향후 개선 방안
1. **HttpOnly Cookie 사용**: 백엔드에서 쿠키로 토큰 설정
2. **Refresh Token 도입**: 짧은 access token + 긴 refresh token
3. **Token Rotation**: 주기적인 토큰 갱신
4. **CSP 헤더**: XSS 공격 방어

## 디버깅

### localStorage 확인
브라우저 개발자 도구 > Application > Local Storage에서 확인:
- `statio:authToken`
- `statio:authUser`

### 상태 로깅
statio의 loggerStatio 미들웨어 사용:

```typescript
import { loggerStatio } from "statio-lib";

globalStore.use(loggerStatio());
```

## 문제 해결

### 새로고침 시 로그인이 풀림
- localStorage에 `statio:authToken`, `statio:authUser`가 있는지 확인
- main.tsx의 초기화 코드가 실행되는지 확인

### 로그인 후 리다이렉트 안 됨
- `getAccessToken` 함수의 에러 로그 확인
- 백엔드 서버가 실행 중인지 확인 (localhost:3000)

### CORS 에러
- 백엔드에서 CORS 설정 확인
- 프론트엔드 origin (localhost:5173) 허용 필요
