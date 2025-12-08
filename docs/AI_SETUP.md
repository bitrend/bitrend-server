# AI 기능 활성화 가이드

## 개요

BitTrend 서버는 Google Gemini AI를 사용하여 GitHub 프로젝트를 분석합니다. AI가 활성화되면 fallback 함수 대신 훨씬 더 정교한 코드 분석을 제공합니다.

## 🎯 AI vs Fallback 비교

| 기능 | Fallback | AI (Gemini) |
|------|----------|------------|
| **코드 분석** | 메타데이터만 | 실제 코드 내용 분석 |
| **복잡도 측정** | 추정값 | 실제 계산값 |
| **점수 정확도** | 제한적 | 매우 정확 |
| **개선사항 제안** | 일반적 | 구체적 맞춤형 |
| **처리 속도** | 빠름 | 보통 |
| **비용** | 무료 | API 비용 |

## 🔑 1단계: Google AI Studio에서 API 키 발급

### 1. Google AI Studio 접속
- https://makersuite.google.com/app/apikey 방문
- Google 계정으로 로그인

### 2. API 키 생성
```bash
1. "Create API key" 클릭
2. 기존 프로젝트 선택하거나 새 프로젝트 생성
3. API 키 복사해서 안전한 곳에 저장
```

### 3. API 키 제한 설정 (선택사항)
- API 키 사용량 제한
- IP 주소 제한
- 리퍼러 제한

## ⚙️ 2단계: 환경변수 설정

### .env 파일에 추가
```bash
# 기존 환경변수들...
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### Docker 환경에서 설정
```yaml
# docker-compose.yml
environment:
  - GEMINI_API_KEY=your-actual-gemini-api-key-here
```

## 🧪 3단계: AI 기능 테스트

### 서버 재시작
```bash
npm run dev
```

### AI 활성화 확인
서버 로그에서 다음 메시지 확인:
```
✅ AI Service initialized with Gemini 2.5 Flash
```

오류 메시지가 나타나면:
```
⚠️  GEMINI_API_KEY not set. AI analysis features will be disabled.
```

## 📊 4단계: 성능 차이 확인

### AI 활성화 후 예상 개선사항:

**코드 품질 분석 (35%)**
- Fallback: 기본 50점 + 간단한 가산점
- AI: 실제 코드 복잡도, 주석 비율, 중복 코드 분석

**프로젝트 구조 분석 (30%)**
- Fallback: 디렉토리 개수, 파일 크기
- AI: 아키텍처 패턴, 모듈화 수준, 설계 품질

**기술 역량 평가 (15%)**
- Fallback: 언어 개수, 기본 통계
- AI: 기술 스택 현대성, 고급 패턴 사용도

## 🎪 예상 점수 개선

| 프로젝트 유형 | Fallback | AI | 개선도 |
|-------------|----------|----|----|
| **초보자 프로젝트** | ~200 bits | ~400 bits | +100% |
| **중급자 프로젝트** | ~350 bits | ~600 bits | +71% |
| **고급자 프로젝트** | ~400 bits | ~800 bits | +100% |

## 💰 API 사용량 관리

### Gemini API 가격 (2024년 12월 기준)
- **Gemini 2.5 Flash**: 무료 할당량 있음
- **요청당**: $0.000125 (1M 토큰당)
- **일반적 분석**: 프로젝트당 ~500 토큰

### 비용 최적화
```javascript
// AI 서비스에서 이미 구현된 기능들
- 토큰 수 제한
- 에러 시 fallback 자동 전환
- 분석 결과 캐싱
- Rate limiting
```

## 🔧 트러블슈팅

### 1. "API key not valid" 에러
```bash
✅ API 키가 올바른지 확인
✅ API 키에 공백이나 특수문자가 없는지 확인
✅ Google AI Studio에서 키가 활성화되었는지 확인
```

### 2. "Quota exceeded" 에러
```bash
✅ Google AI Studio에서 사용량 확인
✅ 일일/월간 한도 증가 요청
✅ fallback 모드로 임시 전환
```

### 3. 분석 속도가 느림
```bash
✅ 정상적인 현상 (AI 분석은 2-5초 소요)
✅ 대용량 파일 분석 시 더 오래 걸릴 수 있음
✅ 타임아웃 설정 확인 (30초)
```

### 4. AI가 비활성화된 것 같을 때
```bash
# 현재 AI 상태 확인
curl http://localhost:3000/api/health

# 응답 예시
{
  "status": "ok",
  "ai": {
    "enabled": true,
    "model": "gemini-2.5-flash"
  }
}
```

## 🎯 추천 설정

### 개발 환경
```bash
GEMINI_API_KEY=your-dev-api-key
NODE_ENV=development
```

### 프로덕션 환경
```bash
GEMINI_API_KEY=your-prod-api-key
NODE_ENV=production
```

## 📈 성공 지표

AI 기능이 올바르게 동작하면:
1. **점수 상승**: 평균 50-100% 점수 증가
2. **상세한 분석**: 구체적인 개선사항 제안
3. **정확한 평가**: 실제 코드 품질 반영
4. **티어 상승**: 더 많은 사용자가 Junior Dev 이상 달성

---

## 🚀 시작하기

1. [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 발급
2. `.env` 파일에 `GEMINI_API_KEY` 추가
3. 서버 재시작: `npm run dev`
4. 프로젝트 분석 실행하여 개선된 점수 확인

**AI 기능 활성화 후 GitHub 리포지토리 데이터가 훨씬 더 효과적으로 활용됩니다!**