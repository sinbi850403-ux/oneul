# 오늘 시리즈 (oneul)

소상공인을 위한 일상 운영 도구 모음 모노레포.

## 구성

```
oneul/
├── apps/
│   ├── jaego/      오늘재고 — 입출고 · 재고 관리
│   └── jangbu/     오늘장부 — 매입매출 · 거래 기록
└── packages/        (예정) 공통 UI · Supabase 클라이언트
```

## 시작

```bash
pnpm install
pnpm dev:jaego      # 재고 앱 개발 서버
pnpm dev:jangbu     # 장부 앱 개발 서버
pnpm build          # 전체 빌드
```

## 요구사항

- Node.js 20 이상
- pnpm 9 이상
