# 오늘장부 (oneul-jangbu) 개발 지침서
> 1인 소상공인을 위한 **일매출 기록 + 월마감 + 세금계산** 웹앱
> Claude Code가 이 문서를 보고 그대로 만들 수 있도록 작성됨

---

## 0. 설계 3원칙 (절대 어기지 말 것)

1. **단순함이 최우선** — 기능 욕심 금지. 핵심 4개 화면만.
2. **모바일 우선** — 사장님은 폰으로 매일 입력한다. 큰 버튼, 큰 숫자.
3. **이름은 짧고 영어로** — 테이블/컬럼/함수는 전부 소문자 snake_case, 짧게.

---

## 1. 기술 스택 (현재 보유)

| 구분 | 사용 | 비고 |
|---|---|---|
| 프론트 | React + Vite + Tailwind CSS | Invex와 동일 |
| 백엔드 | Supabase (PostgreSQL + Auth) | 이미 사용 중 |
| 배포 | Vercel | 이미 사용 중 |
| 저장소 | GitHub `oneul-jangbu` | 생성 완료 |
| 메인컬러 | `#FF6B35` (주황) | 따뜻함 + 신뢰 |

---

## 2. 폴더 구조

```
oneul-jangbu/
├── public/
│   ├── manifest.json       # PWA 매니페스트 (초기부터 포함)
│   └── icons/              # PWA 아이콘 (192x192, 512x512)
├── src/
│   ├── pages/
│   │   ├── Input.jsx       # 매출 입력
│   │   ├── Calendar.jsx    # 달력 대시보드
│   │   ├── Tax.jsx         # 세금 계산
│   │   └── Settings.jsx    # 설정
│   ├── components/
│   │   ├── NumberInput.jsx # 금액 입력 칸
│   │   ├── NavBar.jsx      # 하단 탭바
│   │   └── DayCell.jsx     # 달력 한 칸
│   ├── lib/
│   │   ├── supabase.js     # supabase 클라이언트
│   │   ├── tax.js          # 세금 계산 함수
│   │   └── date.js         # KST 날짜 유틸
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── schema.sql          # 테이블 + RLS + 트리거
├── .env.example
├── README.md
└── package.json
```

---

## 3. 데이터베이스 설계 (단순하게)

> 핵심 규칙: **하루 = 한 줄(row)**. 결제수단은 컬럼으로. 초보가 봐도 이해되게.

### 테이블 ① `sales` (일매출)

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | 자동 생성 |
| `user_id` | uuid | 로그인 사용자 (auth 연결) |
| `sale_date` | date | 판매일 (하루에 한 줄, 중복 금지) |
| `card` | int | 카드 |
| `cash` | int | 현금영수증 |
| `bank` | int | 무통장입금 |
| `vbank` | int | 가상계좌 |
| `phone` | int | 휴대폰결제 |
| `npay` | int | 네이버페이 |
| `kpay` | int | 카카오페이 |
| `etc` | int | 기타 |
| `total` | int | 합계 (저장 시 자동 계산) |
| `memo` | text | 메모 (선택) |
| `created_at` | timestamp | 자동 |

→ `user_id` + `sale_date` 조합은 **유일(UNIQUE)** 하게. 같은 날 다시 입력하면 덮어쓰기(upsert).

### 테이블 ② `profiles` (사용자 설정)

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `user_id` | uuid (PK) | auth 사용자 |
| `shop_name` | text | 가게 이름 |
| `tax_type` | text | `simple`(간이) / `general`(일반) |
| `created_at` | timestamp | 자동 |

→ 부가세 계산이 과세 유형에 따라 달라지므로 이것만 받아둠.

### schema.sql (Claude Code에게 그대로 시킬 것)

```sql
-- 일매출 테이블
create table sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  sale_date date not null,
  card int default 0,
  cash int default 0,
  bank int default 0,
  vbank int default 0,
  phone int default 0,
  npay int default 0,
  kpay int default 0,
  etc int default 0,
  total int default 0,
  memo text,
  created_at timestamptz default now(),
  unique (user_id, sale_date)
);

-- 사용자 설정 테이블
create table profiles (
  user_id uuid primary key references auth.users,
  shop_name text,
  tax_type text default 'general',
  created_at timestamptz default now()
);

-- RLS: 본인 데이터만 보이게
alter table sales enable row level security;
alter table profiles enable row level security;

create policy "own sales" on sales
  for all using (auth.uid() = user_id);

create policy "own profile" on profiles
  for all using (auth.uid() = user_id);

-- 신규 가입 시 profiles row 자동 생성 트리거
-- (앱에서 따로 처리 안 해도 됨. 가입 즉시 프로필 존재 보장)
create function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## 4. 자주 쓰는 쿼리 (단순하게)

```js
// ① 오늘 매출 저장 (있으면 덮어쓰기)
await supabase.from('sales').upsert({
  user_id, sale_date, card, cash, bank, vbank, phone, npay, kpay, etc, total
}, { onConflict: 'user_id,sale_date' })

// ② 이번 달 매출 전체 가져오기
await supabase.from('sales')
  .select('*')
  .gte('sale_date', '2026-05-01')
  .lte('sale_date', '2026-05-31')
  .order('sale_date')

// ③ 특정 날짜 매출 가져오기
await supabase.from('sales')
  .select('*')
  .eq('sale_date', '2026-05-24')
  .single()
```

> 월 합계, 일평균 같은 계산은 **DB가 아니라 화면(JS)에서** 계산한다. (단순함 유지)

---

## 5. UI / UX 설계 (직관 + 단순)

### 전체 레이아웃

- 화면 **하단에 탭바 4개** → 입력 / 달력 / 세금 / 설정
- 폰트 크게, 버튼 크게, 한 화면에 정보 적게
- 숫자 입력 시 **천 단위 콤마 자동** (1,250,000)

### 화면 ① 입력 (Input) — 가장 중요

```
┌─────────────────────────┐
│   📅 2026년 5월 24일       │  ← 날짜 (탭하면 변경)
├─────────────────────────┤
│  카드          [        ] │
│  현금영수증     [        ] │
│  무통장입금     [        ] │
│  가상계좌       [        ] │
│  휴대폰결제     [        ] │
│  네이버페이     [        ] │
│  카카오페이     [        ] │
│  기타          [        ] │
├─────────────────────────┤
│  오늘 합계   ₩ 1,250,000  │  ← 입력하면 실시간 합산
├─────────────────────────┤
│  [   저장하기   ]          │  ← 큰 주황 버튼
│  [   초기화     ]          │  ← 작은 버튼 (전체 0으로 리셋)
└─────────────────────────┘
```

- 안 쓰는 결제수단은 0으로 두면 됨
- 저장 누르면 "저장됐어요 ✅" 토스트
- 초기화 누르면 확인 다이얼로그 후 전체 필드 0으로 리셋 (DB에는 0으로 upsert)

### 화면 ② 달력 (Calendar)

```
┌─────────────────────────┐
│  < 2026년 5월 >           │  ← 최근 12개월만 탐색 가능
│  이번달 ₩ 28,400,000      │  ← 월 누계 (크게)
│  일평균 ₩ 1,183,000       │
├─────────────────────────┤
│  일 월 화 수 목 금 토       │
│        1   2   3   4      │  ← 각 칸에 그날 매출 숫자
│   5   6   7  ...          │
│  ...                      │
└─────────────────────────┘
```

- 날짜 칸 탭 → 그날 입력 화면으로 이동
- 매출 있는 날은 주황 점 표시
- **월 탐색 범위: 현재 월 기준 최근 12개월까지만** (그 이전 버튼 비활성화)

### 화면 ③ 세금 (Tax)

```
┌─────────────────────────┐
│  💰 예상 세금 (이번달 기준)  │
├─────────────────────────┤
│  부가세 예상   ₩ 2,581,000 │
│  종소세 예상   (구간 안내)   │
├─────────────────────────┤
│  📌 다음 신고일             │
│  부가세  7/25  D-62        │
│  종소세  5/31  D-7         │
└─────────────────────────┘
```

- 계산식은 6번 참고

### 화면 ④ 설정 (Settings)

- 가게 이름
- 과세 유형 (간이/일반) 선택
- 로그아웃

---

## 6. 세금 계산 로직 (`lib/tax.js`)

> ⚠️ 정확한 세무 신고용 아님. **"대략 이만큼 떼어두세요" 가이드**임. 화면에 이 문구 표시할 것.

```js
// 부가세 (일반과세자): 매출에 포함된 부가세 = 매출 / 11
export function vat(totalSales, taxType) {
  if (taxType === 'simple') {
    // 간이과세자는 업종별 부가가치율이 달라 단순 추정만
    return Math.round(totalSales * 0.015) // 약 1.5% (안내용)
  }
  return Math.round(totalSales / 11) // 일반과세자
}

// 종합소득세는 구간/경비에 따라 천차만별 → 정확 계산 금지.
// "전문가 상담 권장" 문구 + 신고 마감일 D-day만 안내.

// 다음 신고일 D-day
export function dDay(target) {
  const diff = Math.ceil((new Date(target) - new Date()) / 86400000)
  return diff
}
```

신고 마감일(개인사업자 기준):
- 부가세 1기: **7/25**, 2기: **1/25**
- 종합소득세: **5/31**

---

## 7. KST 날짜 처리 (`lib/date.js`)

> ⚠️ `new Date()`는 UTC 기준이므로 밤 11시 이후 입력 시 날짜가 다음 날로 저장됨.
> **반드시 KST 기준 날짜를 사용할 것.**

```js
// KST 기준 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환
export function todayKST() {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '')
}

// 특정 Date 객체를 KST 기준 'YYYY-MM-DD'로 변환
export function toKSTDateString(date) {
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '')
}
```

- `sale_date` 저장 시 항상 `todayKST()` 또는 `toKSTDateString()` 사용
- 날짜 선택기(date picker)에서 선택한 날짜도 동일 함수로 변환 후 저장

---

## 8. Claude Code 작업 순서 (단계별 프롬프트)

> 한 번에 다 시키지 말고 **단계별로** 시킬 것. 그래야 오류 잡기 쉬움.

### 1단계 — 프로젝트 세팅

```
oneul-jangbu 폴더에 React + Vite + Tailwind 프로젝트를 세팅해줘.
@supabase/supabase-js, react-router-dom 설치하고,
src/lib/supabase.js에 supabase 클라이언트를 만들어줘.
src/lib/date.js에 SPEC.md 7번의 KST 날짜 유틸 함수도 만들어줘.
.env.example 파일도 만들어줘 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
public/manifest.json과 public/icons/ 폴더도 기본 PWA 세팅으로 만들어줘.
```

### 2단계 — DB 스키마

```
supabase/schema.sql 파일을 만들어줘.
SPEC.md의 3번 데이터베이스 설계를 그대로 반영하고,
RLS 정책과 신규 가입 시 profiles 자동 생성 트리거도 포함해줘.
```

→ 만든 SQL을 Supabase 대시보드 SQL Editor에 직접 붙여넣어 실행

### 3단계 — 로그인

```
Supabase Auth로 이메일 로그인/회원가입 화면을 만들어줘.
로그인 안 하면 입력 화면 못 보게 막아줘.
디자인은 단순하게, 메인컬러 #FF6B35.
```

### 4단계 — 입력 화면 (핵심)

```
SPEC.md 5번의 '화면 ① 입력'을 만들어줘.
결제수단 8칸 입력, 실시간 합계, 천단위 콤마, 큰 저장 버튼.
저장은 sales 테이블에 upsert (user_id + sale_date 기준).
날짜는 lib/date.js의 KST 함수를 사용해줘.
저장되면 토스트 메시지.
초기화 버튼은 확인 다이얼로그 후 전체 필드 0으로 리셋.
```

### 5단계 — 달력 대시보드

```
SPEC.md 5번 '화면 ② 달력'을 만들어줘.
이번 달 sales를 가져와서 날짜별 매출을 달력에 표시,
월 누계와 일평균을 위에 크게 보여줘.
날짜 탭하면 그날 입력 화면으로 이동.
월 탐색은 현재 월 기준 최근 12개월까지만 가능하게 제한해줘.
```

### 6단계 — 세금 화면

```
SPEC.md 5번 '화면 ③ 세금'과 6번 계산 로직으로
세금 화면을 만들어줘. lib/tax.js 함수 사용.
"참고용 추정치" 안내 문구 꼭 넣어줘.
```

### 7단계 — 하단 탭바 연결

```
입력/달력/세금/설정 4개를 하단 탭바로 연결해줘.
react-router-dom 사용.
```

### 8단계 — 배포

```
Vercel 배포용으로 빌드 설정 확인하고,
환경변수 설정 방법을 README.md에 정리해줘.
PWA manifest 최종 점검도 해줘.
```

---

## 9. 개인정보 보호 원칙

> 1인 소상공인 앱이므로 수집하는 개인정보는 최소한으로 제한한다.

### 수집 항목 (이것만)

| 항목 | 이유 |
|---|---|
| 이메일 | 로그인 식별자 |
| 가게 이름 | 설정 화면 표시용 |
| 과세 유형 | 세금 계산용 |

- 이름, 전화번호, 주소, 주민번호 등 **일절 수집 안 함**
- 매출 데이터는 사용자 본인 외 접근 불가 (RLS로 강제)
- 회원 탈퇴 시 `sales` + `profiles` 데이터 즉시 삭제

---

## 10. 보안 체크리스트

### 반드시 막아야 하는 것

| 위협 | 대응 |
|---|---|
| 로그인 없이 앱 접근 | 모든 라우트에 인증 가드 적용 (로그인 화면 제외) |
| 다른 사용자 데이터 조회 | Supabase RLS로 `auth.uid() = user_id` 강제 |
| URL 파라미터 변조로 타인 자료 열람 | 서버(RLS) 단에서 차단 — 프론트 필터링만으론 부족 |
| 비밀번호 평문 저장 | Supabase Auth가 자동 해싱 처리 (bcrypt) |
| 엑셀 업로드 악성 데이터 유입 | MVP에는 파일 업로드 없음. 추후 추가 시 파일 타입·크기 검증 필수 |
| 개인정보·매출 데이터 외부 노출 | service_role key 프론트 노출 금지, anon key만 사용 |
| 퇴사자/탈퇴 계정 잔존 | Supabase 대시보드에서 계정 직접 비활성화. 탈퇴 기능 앱에서 제공 |

### 코드 작성 규칙

- 데이터 조회는 항상 `user_id` 필터 포함 (RLS가 있어도 명시적으로)
- 에러 메시지에 내부 구조(테이블명, 쿼리 등) 노출 금지
- `console.log`에 사용자 데이터 출력 금지 (프로덕션 빌드)

---

## 11. 백업 및 장애 대응

### 백업 체계

| 항목 | 내용 |
|---|---|
| DB 백업 | Supabase 무료 플랜: 자동 백업 없음. **Pro 플랜($25/월) 전환 시 일별 자동 백업 활성화** |
| MVP 단계 임시 대안 | 주 1회 Supabase 대시보드 → Table Editor → CSV 내보내기 수동 보관 |
| 파일 백업 | MVP에는 첨부파일 없음. 추후 Storage 사용 시 Supabase 백업 정책 따름 |
| 복구 테스트 | Pro 전환 후 분기 1회 백업 복구 테스트 실시 |

### 장애 대응

| 상황 | 대응 |
|---|---|
| Supabase 서비스 장애 | [Supabase Status](https://status.supabase.com) 확인. 복구까지 대기 (1인 운영 한계) |
| Vercel 배포 오류 | Vercel 대시보드에서 이전 배포로 롤백 |
| 데이터 오입력 | 입력 화면 초기화 기능으로 당일 수정. 이전 날짜는 달력에서 해당 날 탭 후 재입력 |

### 로그 및 오류 추적

- Supabase 대시보드 → Logs 탭에서 DB 쿼리 오류 확인 가능
- Vercel 대시보드 → Functions 탭에서 서버 로그 확인
- 프론트 에러는 추후 [Sentry](https://sentry.io) 무료 플랜 연동 고려 (MVP 이후)
- **MVP 단계에서는 사용자가 오류 발생 시 직접 제보할 수 있는 이메일/카카오 채널 안내 필수**

---

## 12. 출시 후 로드맵 (나중에)

| 단계 | 할 일 |
|---|---|
| MVP 완성 | 지인 10명 무료 테스트 |
| PWA 변환 | 폰에 앱처럼 설치 가능하게 (manifest는 초기부터 포함) |
| 수익화 ① | 월 9,900원 구독 (토스페이먼츠/포트원) |
| 수익화 ② | Google AdMob 광고 |
| 앱스토어 | 구글 플레이 → iOS 순서 |
| 프리미엄 | 엑셀 내보내기, 월마감 PDF |

목표: **구독자 31명 = 월 30만원**

---

## 13. 주의사항

- `.env` 파일은 **절대 GitHub에 올리지 말 것** (.gitignore 확인)
- Supabase anon key는 공개돼도 되지만, **service_role key는 절대 프론트에 넣지 말 것**
- 세금 화면엔 항상 "참고용, 정확한 신고는 세무사 상담" 문구
- 결제·구독 기능은 MVP 완성 후 붙이기 (처음부터 욕심 금지)
- **날짜 처리는 반드시 KST 기준** — `lib/date.js` 유틸 외 `new Date()` 직접 사용 금지
