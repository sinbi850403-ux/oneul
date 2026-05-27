-- ================================================
-- 이동평균법 (Moving Average Cost) 원가 계산
-- ================================================
-- 계산 공식:
--   새 평균단가 = (현재재고 × 현재평균단가 + 입고수량 × 입고단가)
--                ÷ (현재재고 + 입고수량)
--
-- 규칙:
--   - 입고 시 unit_price > 0 인 경우에만 avg_cost 갱신
--   - unit_price = 0 이면 수량만 늘고 평균단가 유지 (가격 미입력)
--   - 재고가 0인 상태에서 입고 시 → 입고단가 그대로 avg_cost
-- ================================================

-- 1. stock 테이블에 avg_cost 컬럼 추가
alter table stock
  add column if not exists avg_cost numeric(12,2) not null default 0;

-- 2. handle_stock_in 함수: 이동평균 재계산 포함
create or replace function handle_stock_in(
  p_user_id    uuid,
  p_product_id uuid,
  p_quantity   int,
  p_unit_price int default 0,
  p_note       text default null
) returns void language plpgsql security definer as $$
declare
  v_current_qty  int;
  v_current_avg  numeric(12,2);
  v_new_avg      numeric(12,2);
begin
  -- 현재 재고 수량 & 평균단가 조회
  select coalesce(quantity, 0), coalesce(avg_cost, 0)
    into v_current_qty, v_current_avg
    from stock
   where user_id = p_user_id and product_id = p_product_id;

  -- 이동평균 계산 (단가 입력된 경우에만)
  if p_unit_price > 0 then
    if v_current_qty is null or v_current_qty = 0 then
      -- 재고 없을 때 첫 입고 → 입고단가 그대로
      v_new_avg := p_unit_price;
    else
      -- 이동평균법: (현재재고 × 현재평균 + 입고수량 × 입고단가) ÷ 총수량
      v_new_avg := (v_current_qty * v_current_avg + p_quantity * p_unit_price)
                   / (v_current_qty + p_quantity);
    end if;
  else
    -- 단가 미입력 시 기존 평균단가 유지
    v_new_avg := coalesce(v_current_avg, 0);
  end if;

  -- 재고 수량 + 평균단가 업데이트
  insert into stock (user_id, product_id, quantity, avg_cost)
    values (p_user_id, p_product_id, p_quantity, v_new_avg)
    on conflict (user_id, product_id)
    do update set
      quantity   = stock.quantity + p_quantity,
      avg_cost   = v_new_avg,
      updated_at = now();

  -- 이력 기록 (트리거가 purchases 자동 생성)
  insert into stock_log (user_id, product_id, type, quantity, unit_price, note)
    values (p_user_id, p_product_id, 'in', p_quantity, p_unit_price, p_note);
end;
$$;
