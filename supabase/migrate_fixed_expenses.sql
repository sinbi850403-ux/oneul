-- 정기 고정비 테이블 (임대료, 공과금, 인건비 등 매월 고정 지출)
create table if not exists fixed_expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  amount     bigint not null default 0,
  category   text not null default 'other', -- 'rent' | 'utility' | 'labor' | 'other'
  created_at timestamptz not null default now()
);

alter table fixed_expenses enable row level security;

create policy "own_fixed_expenses" on fixed_expenses
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
