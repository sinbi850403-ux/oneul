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
  owner_name text,
  biz_number text,
  biz_category text,
  biz_type text,
  address text,
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

-- 푸시 구독 테이블
create table push_subscriptions (
  user_id uuid primary key references auth.users,
  subscription text not null,
  updated_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "own push" on push_subscriptions
  for all using (auth.uid() = user_id);

-- 신규 가입 시 profiles row 자동 생성
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
