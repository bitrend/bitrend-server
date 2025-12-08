# BitTrend 티어 및 평가 시스템

## 개요

BitTrend는 bit/byte 단위를 사용한 독특한 평가 시스템을 채택하고 있습니다.

## 점수 체계

### 기본 단위
- **총점**: 1024 bit = 128 byte
- **1 byte = 8 bits**
- **점수는 bit 단위로 측정되며, 내부적으로 byte로 변환하여 티어 판정**

### 점수 범위
- 최소: 0 bit (0 byte)
- 최대: 1024 bit (128 byte)

---

## 티어 시스템

BitTrend는 4단계 티어 시스템을 운영합니다.

### 티어 상세

| 티어 | 범위 (byte) | 범위 (bit) | 설명 |
|------|-------------|------------|------|
| **Intern** | 0 - 127 | 0 - 1016 | 입문 개발자 레벨 |
| **Junior Dev** | 128 - 255 | 1024 - 2040 | 주니어 개발자 레벨 |
| **Senior Dev** | 256 - 767 | 2048 - 6136 | 시니어 개발자 레벨 |
| **Architect** | 768 - 1024 | 6144 - 8192 | 최상위 개발자 레벨 (상위 10인) |

```javascript
const TIERS = {
  INTERN: { max: 127, name: 'Intern', color: '#gray' },
  JUNIOR: { max: 255, name: 'Junior Dev', color: '#blue' },
  SENIOR: { max: 767, name: 'Senior Dev', color: '#purple' },
  ARCHITECT: { max: 1024, name: 'Architect', color: '#gold' }
};
```

### 티어별 특징

#### 🟤 Intern (0 - 127 byte)
- 개발 입문자
- 기초적인 프로젝트 경험
- 학습 중심의 개발자

#### 🔵 Junior Dev (128 - 255 byte)
- 실무 경험이 있는 주니어 개발자
- 독립적인 기능 구현 가능
- 코드 품질에 대한 이해 증가

#### 🟣 Senior Dev (256 - 767 byte)
- 숙련된 시니어 개발자
- 프로젝트 구조 설계 능력
- 복잡한 문제 해결 능력
- 팀 리딩 경험

#### 🟡 Architect (768 - 1024 byte)
- 최상위 레벨 개발자
- 전체 시스템 아키텍처 설계
- **상위 10인에게만 부여**
- 기술적 리더십과 멘토링

---

## 등급 시스템 (Grade)

점수를 기반으로 A-F 등급이 부여됩니다.

| 등급 | 범위 (byte) | 범위 (bit) | 백분율 |
|------|-------------|------------|--------|
| **A** | 96 - 128 | 768 - 1024 | 75% - 100% |
| **B** | 64 - 95 | 512 - 767 | 50% - 74% |
| **C** | 32 - 63 | 256 - 511 | 25% - 49% |
| **D** | 16 - 31 | 128 - 255 | 12.5% - 24% |
| **F** | 0 - 15 | 0 - 127 | 0% - 12.4% |

---

## 평가 기준

### 1. 코드 품질 (Code Quality)
- 가중치: 35%
- 평가 항목:
  - 코드 스타일 및 컨벤션
  - 복잡도 관리
  - 테스트 커버리지
  - 문서화 수준

### 2. 프로젝트 구조 (Project Structure)
- 가중치: 30%
- 평가 항목:
  - 디렉토리 구조
  - 모듈화 수준
  - 의존성 관리
  - 프로젝트 규모

### 3. 기여 패턴 (Contribution Pattern)
- 가중치: 25%
- 평가 항목:
  - 커밋 빈도 및 일관성
  - PR 관리
  - 이슈 해결
  - 커뮤니티 참여

### 4. 기술 역량 (Skill Assessment)
- 가중치: 10%
- 평가 항목:
  - 사용 언어 다양성
  - 프레임워크 활용
  - 최신 기술 적용
  - 기술 스택 깊이

---

## 점수 계산 방식

### 기본 계산식

```
총 점수 (bit) = Σ(카테고리별 점수 × 가중치)

코드 품질: 최대 358.4 bit (35%)
프로젝트 구조: 최대 307.2 bit (30%)
기여 패턴: 최대 256 bit (25%)
기술 역량: 최대 102.4 bit (10%)
────────────────────────────
총합: 1024 bit = 128 byte
```

### Byte 변환

```
1 byte = 8 bits
점수(byte) = 점수(bit) ÷ 8
```

### 예시

```javascript
// 사용자 점수: 640 bit
const bitScore = 640;
const byteScore = bitScore / 8; // 80 byte

// 티어 판정
if (byteScore > 767) return 'Architect';
if (byteScore > 255) return 'Senior Dev'; // ✓ 해당
if (byteScore > 127) return 'Junior Dev';
return 'Intern';

// 등급 판정
if (byteScore >= 96) return 'A';
if (byteScore >= 64) return 'B'; // ✓ 해당
if (byteScore >= 32) return 'C';
if (byteScore >= 16) return 'D';
return 'F';

// 결과: Senior Dev, Grade B
```

---

## 랭킹 시스템

### 전체 랭킹
- 모든 사용자의 총점(bit) 기준 순위
- 실시간 업데이트
- 백분위(percentile) 제공

### Architect 티어 특별 규칙
- **상위 10인에게만 부여**
- 점수가 768 bit 이상이어도 11위 이하는 Senior Dev로 표시
- 동점자 처리: 먼저 달성한 사용자 우선

---

## API 응답 예시

### Dashboard API Response

```json
{
  "user": {
    "id": 1,
    "username": "developer",
    "totalScore": 640,
    "skillLevel": "Senior Dev",
    "overallGrade": "B"
  },
  "ranking": {
    "userPosition": 15,
    "totalUsers": 1250,
    "percentile": 98.8
  }
}
```

---

## 업데이트 내역

- **2025-12-08**: 초기 티어 시스템 정의
- bit/byte 기반 평가 시스템 도입
- 4단계 티어 구조 확립

---

## 참고사항

1. 점수는 프로젝트 평가 완료 시 갱신됩니다.
2. 최대 3개의 프로젝트를 선택하여 평가받을 수 있습니다.
3. 각 프로젝트의 점수는 가중 평균으로 계산됩니다.
4. Architect 티어는 상위 10인 제한으로 진입이 매우 어렵습니다.
