# 오늘장부 (oneul-jangbu)

1인 소상공인을 위한 일매출 기록 + 월마감 + 세금계산 웹앱. 상세 스펙은 [SPEC.md](SPEC.md) 참고.

---

## 설계 3원칙 (절대 어기지 말 것)

1. **단순함이 최우선** — 기능 욕심 금지. 핵심 4개 화면만.
2. **모바일 우선** — 사장님은 폰으로 매일 입력한다. 큰 버튼, 큰 숫자.
3. **이름은 짧고 영어로** — 테이블/컬럼/함수는 전부 소문자 snake_case, 짧게.

---

## 기술 스택

| 구분 | 사용 |
|---|---|
| 프론트 | React + Vite + Tailwind CSS |
| 백엔드 | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel |
| 메인컬러 | `#FF6B35` (주황) |

---

## 코드 작성 규칙

- 날짜는 반드시 `src/lib/date.js`의 KST 유틸 사용. `new Date()` 직접 사용 금지.
- 데이터 조회 시 `user_id` 필터 항상 명시 (RLS가 있어도 코드에도 포함).
- 에러 메시지에 테이블명·쿼리 등 내부 구조 노출 금지.
- `console.log`에 사용자 데이터 출력 금지.
- 세금 화면에는 반드시 "참고용 추정치, 정확한 신고는 세무사 상담" 문구 포함.

---

## 보안 원칙

- `service_role` key는 절대 프론트엔드 코드에 넣지 않는다. `anon` key만 사용.
- `.env` 파일은 `.gitignore`에 포함 확인 후 커밋.
- 모든 라우트에 인증 가드 적용 (로그인 화면 제외).
- 개인정보는 최소한만 수집: 이메일, 가게 이름, 과세 유형만. 그 외 일절 수집 안 함.

---

## 핵심 파일 위치

| 파일 | 역할 |
|---|---|
| `src/lib/supabase.js` | Supabase 클라이언트 |
| `src/lib/date.js` | KST 날짜 유틸 (`todayKST`, `toKSTDateString`) |
| `src/lib/tax.js` | 부가세·D-day 계산 |
| `supabase/schema.sql` | 테이블 + RLS + 신규 가입 트리거 |
| `public/manifest.json` | PWA 매니페스트 |

---

## DB 핵심 규칙

- `sales` 테이블: 하루 = 한 줄. `user_id + sale_date` UNIQUE.
- 저장은 항상 upsert (`onConflict: 'user_id,sale_date'`).
- 합계(`total`) 계산은 DB가 아닌 프론트(JS)에서.
- 신규 가입 시 `profiles` row는 DB 트리거가 자동 생성 (앱에서 따로 처리 불필요).

---

## 하지 말아야 할 것

- MVP 범위 초과 기능 추가 (결제·구독·파일 업로드는 출시 후)
- 달력 탐색 12개월 초과 허용
- URL 파라미터로 다른 사용자 데이터 접근 가능한 구조
- 비밀번호 등 민감 정보 평문 저장 또는 로그 출력
