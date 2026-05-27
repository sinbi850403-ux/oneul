-- 알바생 테이블
create table if not exists workers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  hourly_wage  integer not null default 9860,
  created_at   timestamptz default now()
);

alter table workers enable row level security;

create policy "workers_own" on workers
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 근무 기록 테이블
create table if not exists work_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  worker_id      uuid references workers(id) on delete cascade not null,
  work_date      date not null,
  start_time     time not null,
  end_time       time not null,
  break_minutes  integer not null default 0,
  note           text,
  created_at     timestamptz default now()
);

alter table work_logs enable row level security;

create policy "work_logs_own" on work_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
