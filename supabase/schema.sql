-- ================================================
-- 오늘 시리즈 통합 스키마
-- (oneul-jaego 재고 + oneul-jangbu 장부)
-- Supabase 대시보드 → SQL Editor에서 실행
-- ================================================

-- ================================================
-- [공통] 사용자 프로필
-- ================================================
create table if not exists profiles (
  user_id    uuid primary key references auth.users,
  shop_name  text,
  owner_name text,
  biz_number text,
  biz_category text,
  biz_type   text,
  address    text,
  tax_type   text default 'general',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- 신규 가입 시 profiles row 자동 생성
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ================================================
-- [재고] 오늘재고 (oneul-jaego)
-- ================================================

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  unit        text not null default '개',
  price       int  not null default 0,  -- 매입단가 (연동용)
  is_favorite boolean not null default false,
  created_at  timestamptz default now(),
  unique (user_id, name)
);

create table if not exists stock (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity   int not null default 0,
  updated_at timestamptz default now(),
  unique (user_id, product_id)
);

create table if not exists stock_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  product_id uuid references products(id) on delete cascade not null,
  type       text not null check (type in ('in', 'out', 'return')),
  quantity   int not null,
  unit_price int not null default 0,  -- 입고 단가
  source     text not null default 'manual',
  note       text,
  created_at timestamptz default now()
);

create table if not exists stocktake (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  status      text not null default 'in_progress' check (status in ('in_progress', 'done')),
  started_at  timestamptz default now(),
  finished_at timestamptz
);

create table if not exists stocktake_item (
  id           uuid primary key default gen_random_uuid(),
  stocktake_id uuid references stocktake(id) on delete cascade not null,
  product_id   uuid references products(id) on delete cascade not null,
  system_qty   int not null default 0,
  actual_qty   int,
  diff         int generated always as (coalesce(actual_qty, 0) - system_qty) stored,
  adjusted     boolean not null default false
);

alter table products       enable row level security;
alter table stock          enable row level security;
alter table stock_log      enable row level security;
alter table stocktake      enable row level security;
alter table stocktake_item enable row level security;

drop policy if exists "own products"       on products;
drop policy if exists "own stock"          on stock;
drop policy if exists "own stock_log"      on stock_log;
drop policy if exists "own stocktake"      on stocktake;
drop policy if exists "own stocktake_item" on stocktake_item;

create policy "own products"       on products       for all using (auth.uid() = user_id);
create policy "own stock"          on stock          for all using (auth.uid() = user_id);
create policy "own stock_log"      on stock_log      for all using (auth.uid() = user_id);
create policy "own stocktake"      on stocktake      for all using (auth.uid() = user_id);
create policy "own stocktake_item" on stocktake_item for all
  using (exists (
    select 1 from stocktake
    where stocktake.id = stocktake_item.stocktake_id
      and stocktake.user_id = auth.uid()
  ));


-- ================================================
-- [장부] 오늘장부 (oneul-jangbu)
-- ================================================

-- 일매출 테이블
create table if not exists sales (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users not null,
  sale_date date not null,
  card      int default 0,
  cash      int default 0,
  bank      int default 0,
  vbank     int default 0,
  phone     int default 0,
  npay      int default 0,
  kpay      int default 0,
  etc       int default 0,
  total     int default 0,
  memo      text,
  created_at timestamptz default now(),
  unique (user_id, sale_date)
);

-- 매입 테이블 (재고 입고와 연동)
create table if not exists purchases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  stock_log_id uuid references stock_log(id) on delete set null,  -- 재고 연동 키
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity   int not null,
  unit_price int not null default 0,
  total_amount int not null default 0,  -- quantity * unit_price
  purchase_date date not null default current_date,
  source     text not null default 'manual' check (source in ('manual', 'stock_in')),
  note       text,
  created_at timestamptz default now()
);

-- 푸시 구독
create table if not exists push_subscriptions (
  user_id      uuid primary key references auth.users,
  subscription text not null,
  updated_at   timestamptz default now()
);

alter table sales              enable row level security;
alter table purchases          enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "own sales"              on sales;
drop policy if exists "own purchases"          on purchases;
drop policy if exists "own push_subscriptions" on push_subscriptions;
drop policy if exists "own profile"            on profiles;

create policy "own sales"              on sales              for all using (auth.uid() = user_id);
create policy "own purchases"          on purchases          for all using (auth.uid() = user_id);
create policy "own push_subscriptions" on push_subscriptions for all using (auth.uid() = user_id);
create policy "own profile"            on profiles           for all using (auth.uid() = user_id);


-- ================================================
-- [연동] 재고 입고 → 매입 자동 기록 트리거
-- ================================================

create or replace function sync_stock_in_to_purchase()
returns trigger as $$
declare
  v_product_name text;
begin
  -- 입고(type='in')이고 수동 입력일 때만 장부에 기록
  if NEW.type = 'in' and NEW.source = 'manual' then
    select name into v_product_name from products where id = NEW.product_id;

    insert into purchases (
      user_id, stock_log_id, product_id, product_name,
      quantity, unit_price, total_amount, purchase_date, source, note
    ) values (
      NEW.user_id,
      NEW.id,
      NEW.product_id,
      coalesce(v_product_name, '알 수 없는 상품'),
      NEW.quantity,
      NEW.unit_price,
      NEW.quantity * NEW.unit_price,
      current_date,
      'stock_in',
      NEW.note
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_stock_in_to_purchase on stock_log;
create trigger trg_stock_in_to_purchase
  after insert on stock_log
  for each row execute function sync_stock_in_to_purchase();


-- ================================================
-- [재고] 입고 처리 함수 (unit_price 포함)
-- ================================================
create or replace function handle_stock_in(
  p_user_id    uuid,
  p_product_id uuid,
  p_quantity   int,
  p_unit_price int default 0,
  p_note       text default null
) returns void language plpgsql security definer as $$
begin
  insert into stock (user_id, product_id, quantity)
    values (p_user_id, p_product_id, p_quantity)
    on conflict (user_id, product_id)
    do update set quantity = stock.quantity + p_quantity, updated_at = now();

  insert into stock_log (user_id, product_id, type, quantity, unit_price, note)
    values (p_user_id, p_product_id, 'in', p_quantity, p_unit_price, p_note);
  -- 트리거가 자동으로 purchases에 기록
end;
$$;

create or replace function handle_stock_out(
  p_user_id    uuid,
  p_product_id uuid,
  p_quantity   int,
  p_note       text default null
) returns void language plpgsql security definer as $$
begin
  update stock
    set quantity = quantity - p_quantity, updated_at = now()
    where user_id = p_user_id and product_id = p_product_id;

  insert into stock_log (user_id, product_id, type, quantity, note)
    values (p_user_id, p_product_id, 'out', p_quantity, p_note);
end;
$$;

create or replace function handle_stock_return(
  p_user_id    uuid,
  p_product_id uuid,
  p_quantity   int,
  p_note       text default null
) returns void language plpgsql security definer as $$
begin
  update stock
    set quantity = quantity + p_quantity, updated_at = now()
    where user_id = p_user_id and product_id = p_product_id;

  insert into stock_log (user_id, product_id, type, quantity, note)
    values (p_user_id, p_product_id, 'return', p_quantity, p_note);
end;
$$;

create or replace function handle_stocktake_adjust(
  p_item_id    uuid,
  p_user_id    uuid,
  p_product_id uuid,
  p_actual_qty int
) returns void language plpgsql security definer as $$
declare
  v_system_qty int;
  v_diff       int;
  v_type       text;
begin
  select system_qty into v_system_qty
    from stocktake_item where id = p_item_id;

  v_diff := p_actual_qty - v_system_qty;

  if v_diff = 0 then
    update stocktake_item set adjusted = true where id = p_item_id;
    return;
  end if;

  if v_diff > 0 then
    v_type := 'in';
  else
    v_type := 'out';
  end if;

  update stock
    set quantity = quantity + v_diff, updated_at = now()
    where user_id = p_user_id and product_id = p_product_id;

  -- 재고실사 조정은 장부 연동 제외 (source='stocktake')
  insert into stock_log (user_id, product_id, type, quantity, source, note)
    values (p_user_id, p_product_id, v_type, abs(v_diff), 'stocktake', '재고실사 조정');

  update stocktake_item set adjusted = true where id = p_item_id;
end;
$$;
