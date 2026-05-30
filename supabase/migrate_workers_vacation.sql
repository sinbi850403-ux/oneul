-- workers 테이블에 입사일 컬럼 추가
alter table workers add column if not exists hire_date date;

-- 연차 사용 기록 테이블
create table if not exists vacation_used (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  worker_id    uuid references workers(id) on delete cascade not null,
  used_date    date not null,
  days         decimal(4,1) not null default 1.0,
  note         text,
  created_at   timestamptz default now()
);

alter table vacation_used enable row level security;

create policy "vacation_used_own" on vacation_used
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
