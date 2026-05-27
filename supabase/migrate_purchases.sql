-- ================================================
-- purchases 테이블 + 입고→매입 연동 마이그레이션
-- Supabase 대시보드 → SQL Editor에서 실행
-- ================================================

-- 1. stock_log에 unit_price 컬럼 추가 (없을 경우)
alter table stock_log
  add column if not exists unit_price int not null default 0;

-- 2. purchases 테이블 생성
create table if not exists purchases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  stock_log_id  uuid references stock_log(id) on delete set null,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,
  quantity      int not null,
  unit_price    int not null default 0,
  total_amount  int not null default 0,
  purchase_date date not null default current_date,
  source        text not null default 'manual' check (source in ('manual', 'stock_in')),
  note          text,
  created_at    timestamptz default now()
);

-- 3. RLS
alter table purchases enable row level security;

drop policy if exists "own purchases" on purchases;
create policy "own purchases" on purchases
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. 입고 트리거: 입고(type='in', source='manual') 시 purchases 자동 기록
create or replace function sync_stock_in_to_purchase()
returns trigger as $$
declare
  v_product_name text;
begin
  if NEW.type = 'in' and NEW.source = 'manual' then
    select name into v_product_name
      from products where id = NEW.product_id;

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

-- 5. handle_stock_in 함수 업데이트 (unit_price 파라미터 추가)
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

-- 6. sales/sales_items RLS도 with check 추가 (혹시 누락된 경우)
drop policy if exists "own sales" on sales;
create policy "own sales" on sales
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'sales_items') then
    execute 'drop policy if exists "own sales_items" on sales_items';
    execute 'create policy "own sales_items" on sales_items
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;
