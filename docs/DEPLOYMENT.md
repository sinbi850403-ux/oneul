# Vercel 배포 가이드

이 모노레포는 **2개의 독립 Vercel 프로젝트**로 배포됩니다 — `oneul-jaego`, `oneul-jangbu` 각각.

## 기존 Vercel 프로젝트 마이그레이션

기존에 `oneul-jaego`, `oneul-jangbu` 레포에 연결된 Vercel 프로젝트가 있다면 다음 절차로 옮깁니다.

### 1. Vercel 대시보드에서 각 프로젝트 → Settings → Git

- **Disconnect** 기존 GitHub 레포 연결 해제
- 새 `oneul` 레포로 다시 **Connect**

### 2. Settings → General → Root Directory

각 프로젝트의 Root Directory를 다음으로 설정:

| Vercel 프로젝트 | Root Directory |
|---|---|
| `oneul-jaego` | `apps/jaego` |
| `oneul-jangbu` | `apps/jangbu` |

### 3. Settings → Build & Development Settings

각 앱의 `vercel.json`에 이미 명시되어 있으므로 **Override 비활성화** 권장. 만약 수동 설정이 필요하면:

- Framework Preset: **Vite**
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: `dist`

### 4. 환경변수

기존 프로젝트의 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 등)는 그대로 유지됩니다.

### 5. 도메인

기존 도메인은 Vercel 프로젝트에 묶여 있으므로 레포만 갈아끼우면 도메인은 자동 유지됩니다.

## 신규 배포

새 Vercel 프로젝트로 배포한다면:

1. Vercel → Add New Project → `oneul` 레포 선택
2. Root Directory를 `apps/jaego` 또는 `apps/jangbu`로 지정
3. 환경변수 입력 후 Deploy

각 앱을 위해 별도 프로젝트를 만들어야 합니다 (Vercel은 하나의 레포에서 여러 프로젝트 생성 가능).

## 로컬 미리보기

```bash
pnpm dev:jaego      # http://localhost:5173
pnpm dev:jangbu     # http://localhost:5173 (포트 겹치면 5174)
pnpm build          # 전체 프로덕션 빌드
```
