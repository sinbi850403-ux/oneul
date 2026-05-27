-- ================================================
-- 판가(selling_price) 추가 마이그레이션
-- Supabase 대시보드 → SQL Editor에서 실행
-- ================================================

-- 1. products 테이블에 매입단가 + 판가 + 안전재고 추가
alter table products
  add column if not exists price int not null default 0;
alter table products
  add column if not exists selling_price int not null default 0;
alter table products
  add column if not exists min_quantity int not null default 0;

-- 2. stock_log에 출고 시 적용된 판가 추가
alter table stock_log
  add column if not exists selling_price int not null default 0;

-- 3. 출고 시 장부 sales_items에 매출 자동 기록
create table if not exists sales_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  stock_log_id    uuid references stock_log(id) on delete set null,
  product_id      uuid references products(id) on delete set null,
  product_name    text not null,
  quantity        int not null,
  unit_price      int not null default 0,  -- 판가
  total_amount    int not null default 0,  -- quantity * unit_price
  sale_date       date not null default current_date,
  source          text not null default 'stock_out',
  note            text,
  created_at      timestamptz default now()
);

alter table sales_items enable row level security;

drop policy if exists "own sales_items" on sales_items;
create policy "own sales_items" on sales_items
  for all using (auth.uid() = user_id);

-- 4. 출고 트리거: 출고(type='out') 시 sales_items 자동 기록
create or replace function sync_stock_out_to_sales()
returns trigger as $$
declare
  v_product_name  text;
  v_selling_price int;
begin
  if NEW.type = 'out' and NEW.source = 'manual' and NEW.selling_price > 0 then
    select name, selling_price
      into v_product_name, v_selling_price
      from products where id = NEW.product_id;

    insert into sales_items (
      user_id, stock_log_id, product_id, product_name,
      quantity, unit_price, total_amount, sale_date, source, note
    ) values (
      NEW.user_id,
      NEW.id,
      NEW.product_id,
      coalesce(v_product_name, '알 수 없는 상품'),
      NEW.quantity,
      NEW.selling_price,
      NEW.quantity * NEW.selling_price,
      current_date,
      'stock_out',
      NEW.note
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_stock_out_to_sales on stock_log;
create trigger trg_stock_out_to_sales
  after insert on stock_log
  for each row execute function sync_stock_out_to_sales();

-- 5. 출고 처리 함수 업데이트 (selling_price 파라미터 추가)
create or replace function handle_stock_out(
  p_user_id       uuid,
  p_product_id    uuid,
  p_quantity      int,
  p_selling_price int default 0,
  p_note          text default null
) returns void language plpgsql security definer as $$
begin
  update stock
    set quantity = quantity - p_quantity, updated_at = now()
    where user_id = p_user_id and product_id = p_product_id;

  insert into stock_log (user_id, product_id, type, quantity, selling_price, note)
    values (p_user_id, p_product_id, 'out', p_quantity, p_selling_price, p_note);
  -- 트리거가 자동으로 sales_items에 기록
end;
$$;
