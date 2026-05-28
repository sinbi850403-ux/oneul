-- ============================================================
-- 오늘 시리즈 테스트 데이터 시드 스크립트
-- 편의점 기준 약 2,500건 데이터 생성
--
-- 실행 방법:
--   1. Supabase Dashboard > Authentication > Users 에서
--      본인 계정의 User UID(uuid) 를 복사
--   2. 아래 'YOUR_USER_ID_HERE' 를 복사한 UUID 로 교체
--   3. Supabase SQL Editor 에서 실행
-- ============================================================

DO $$
DECLARE
  v_uid  uuid := 'YOUR_USER_ID_HERE'::uuid;
  v_pid  uuid;
  r      record;
BEGIN

-- ──────────────────────────────────────────────
-- 1. 상품 60개 등록
-- ──────────────────────────────────────────────
CREATE TEMP TABLE _sp (
  name text, unit text, price int, sp int, cat text, minq int, fav bool
) ON COMMIT DROP;

INSERT INTO _sp VALUES
  -- 음료 (20개)
  ('코카콜라 1.5L',       '병', 1200, 2000, '음료', 20, true),
  ('펩시 1.5L',           '병', 1100, 1800, '음료', 20, true),
  ('환타 오렌지 500ml',   '캔', 1000, 1500, '음료', 15, true),
  ('스프라이트 500ml',    '캔', 1000, 1500, '음료', 15, false),
  ('레몬에이드 500ml',    '병', 1500, 2500, '음료', 10, false),
  ('포도주스 1L',         '팩', 2000, 3500, '음료', 10, false),
  ('오렌지주스 1L',       '팩', 2000, 3500, '음료', 10, false),
  ('아메리카노 500ml',    '병', 1500, 2500, '음료', 10, false),
  ('게토레이 600ml',      '병', 1500, 2000, '음료', 15, false),
  ('파워에이드 600ml',    '병', 1500, 2000, '음료', 15, false),
  ('핫식스 250ml',        '캔', 2000, 3000, '음료', 10, false),
  ('레드불 250ml',        '캔', 3000, 4500, '음료', 10, false),
  ('생수 2L',             '병',  800, 1200, '음료', 30, true),
  ('생수 500ml',          '병',  500, 1000, '음료', 50, true),
  ('이온음료 1.5L',       '병', 1500, 2000, '음료', 20, false),
  ('초코우유 200ml',      '팩',  400,  600, '음료', 20, false),
  ('딸기우유 200ml',      '팩',  400,  600, '음료', 20, false),
  ('바나나우유 200ml',    '팩',  400,  600, '음료', 20, false),
  ('두유 190ml',          '팩',  300,  500, '음료', 20, false),
  ('커피우유 200ml',      '팩',  400,  700, '음료', 20, false),
  -- 식품 (15개)
  ('삼각김밥 참치마요',   '개',  500, 1200, '식품', 20, true),
  ('삼각김밥 불고기',     '개',  500, 1200, '식품', 20, true),
  ('삼각김밥 참치',       '개',  500, 1200, '식품', 20, false),
  ('샌드위치 BLT',        '개', 1200, 2500, '식품', 15, false),
  ('샌드위치 에그마요',   '개', 1200, 2500, '식품', 15, false),
  ('핫도그',              '개', 1500, 2500, '식품', 20, false),
  ('컵라면 신라면',       '개',  400, 1000, '식품', 20, true),
  ('컵라면 불닭',         '개',  600, 1500, '식품', 20, false),
  ('컵라면 진라면',       '개',  400,  900, '식품', 20, false),
  ('새우깡',              '봉', 1200, 1800, '식품', 15, false),
  ('초코파이',            '봉',  500,  800, '식품', 15, false),
  ('포카칩',              '봉', 2000, 3500, '식품', 15, false),
  ('허니버터칩',          '봉', 2500, 4000, '식품', 15, false),
  ('빼빼로',              '개', 1500, 2500, '식품', 10, false),
  ('오레오',              '봉', 2000, 3500, '식품', 10, false),
  -- 냉동/아이스크림 (5개)
  ('구구바',              '개',  500,  800, '냉동', 20, false),
  ('설레임',              '개',  700, 1200, '냉동', 20, false),
  ('빵빠레',              '개',  600, 1000, '냉동', 20, false),
  ('메로나',              '개',  500,  800, '냉동', 20, false),
  ('폴라포',              '개',  500,  800, '냉동', 20, false),
  -- 주류 (8개)
  ('테라 500ml',          '캔', 2000, 4500, '주류', 20, false),
  ('하이트 500ml',        '캔', 1700, 4000, '주류', 20, false),
  ('카스 500ml',          '캔', 1800, 4000, '주류', 20, false),
  ('소주 참이슬',         '병', 1200, 1800, '주류', 30, true),
  ('소주 처음처럼',       '병', 1100, 1700, '주류', 30, true),
  ('막걸리 750ml',        '병', 1500, 2500, '주류', 10, false),
  ('와인 레드 750ml',     '병', 8000,13000, '주류',  5, false),
  ('하이네켄 500ml',      '캔', 3000, 5500, '주류', 10, false),
  -- 생활용품 (5개)
  ('생리대',              '팩', 2500, 4500, '생활용품', 10, false),
  ('휴지 3롤',            '롤', 3000, 6000, '생활용품', 10, false),
  ('물티슈',              '팩', 1500, 2500, '생활용품', 10, false),
  ('샴푸 400ml',          '통', 5000, 8500, '생활용품',  5, false),
  ('치약',                '개', 1800, 3000, '생활용품',  5, false),
  -- 담배/기타 (7개)
  ('말보로 레드',         '갑', 4500, 5500, '기타', 20, false),
  ('말보로 골드',         '갑', 4500, 5500, '기타', 20, false),
  ('에쎄 원',             '갑', 4500, 5500, '기타', 20, false),
  ('디스 원',             '갑', 4500, 5500, '기타', 20, false),
  ('아이코스 히츠',       '갑', 5000, 6000, '기타', 15, false),
  ('복권 스크래치',       '장',  500, 1000, '기타', 30, false),
  ('우표 기본',           '장',  430,  500, '기타', 10, false);

-- ──────────────────────────────────────────────
-- 2. products + stock 삽입
-- ──────────────────────────────────────────────
FOR r IN SELECT * FROM _sp LOOP
  INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
  VALUES (v_uid, r.name, r.unit, r.price, r.sp, r.cat, r.minq, r.fav)
  RETURNING id INTO v_pid;

  INSERT INTO stock (user_id, product_id, quantity, avg_cost)
  VALUES (v_uid, v_pid, 30 + floor(random() * 120)::int, r.price);
END LOOP;

-- ──────────────────────────────────────────────
-- 3. 입출고 이력 ~1,200건 (상품당 20건, 입고/출고 랜덤)
-- ──────────────────────────────────────────────
INSERT INTO stock_log (user_id, product_id, type, quantity, unit_price, selling_price, source, note, created_at)
SELECT
  v_uid,
  p.id,
  CASE WHEN gs % 3 = 0 THEN 'return'
       WHEN gs % 2 = 0 THEN 'out'
       ELSE 'in'
  END AS type,
  CASE WHEN gs % 2 = 0
    THEN 3  + floor(random() * 25)::int   -- 출고: 3~27
    ELSE 20 + floor(random() * 80)::int   -- 입고: 20~99
  END AS quantity,
  p.price  AS unit_price,
  p.selling_price,
  CASE WHEN gs % 2 = 0 THEN 'pos' ELSE 'manual' END AS source,
  NULL,
  (CURRENT_TIMESTAMP - (floor(random() * 180) || ' days')::interval
    + (floor(random() * 86400) || ' seconds')::interval)
FROM products p
CROSS JOIN generate_series(1, 20) AS gs
WHERE p.user_id = v_uid;

-- ──────────────────────────────────────────────
-- 4. sales_items (출고 이력과 연동)
-- ──────────────────────────────────────────────
INSERT INTO sales_items (user_id, product_id, product_name, quantity, unit_price, total_amount, sale_date)
SELECT
  sl.user_id,
  sl.product_id,
  p.name,
  sl.quantity,
  sl.selling_price,
  sl.quantity * sl.selling_price,
  sl.created_at::date
FROM stock_log sl
JOIN products p ON p.id = sl.product_id
WHERE sl.user_id = v_uid
  AND sl.type = 'out'
  AND sl.source = 'pos'
  AND sl.created_at >= CURRENT_DATE - 180;

-- ──────────────────────────────────────────────
-- 5. 장부앱 매출 180일 (주말 매출 높음)
-- ──────────────────────────────────────────────
INSERT INTO sales (user_id, sale_date, card, cash, npay, kpay, total)
SELECT
  v_uid,
  (CURRENT_DATE - n)::date,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - n) IN (0,6)
    THEN floor(600000 + random() * 1000000)::int
    ELSE floor(300000 + random() *  600000)::int
  END * 5 / 10 AS card,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - n) IN (0,6)
    THEN floor(600000 + random() * 1000000)::int
    ELSE floor(300000 + random() *  600000)::int
  END / 10 AS cash,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - n) IN (0,6)
    THEN floor(600000 + random() * 1000000)::int
    ELSE floor(300000 + random() *  600000)::int
  END * 3 / 10 AS npay,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - n) IN (0,6)
    THEN floor(600000 + random() * 1000000)::int
    ELSE floor(300000 + random() *  600000)::int
  END / 10 AS kpay,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - n) IN (0,6)
    THEN floor(600000 + random() * 1000000)::int * 1
    ELSE floor(300000 + random() *  600000)::int * 1
  END AS total
FROM generate_series(0, 179) AS n
ON CONFLICT (user_id, sale_date) DO NOTHING;

-- 총합 보정 (card+cash+npay+kpay = total)
UPDATE sales
SET
  card  = floor(total * 0.50)::int,
  cash  = floor(total * 0.10)::int,
  npay  = floor(total * 0.30)::int,
  kpay  = floor(total * 0.10)::int
WHERE user_id = v_uid
  AND sale_date >= CURRENT_DATE - 179;

-- ──────────────────────────────────────────────
-- 6. 매입 내역 60건 (3일 간격)
-- ──────────────────────────────────────────────
INSERT INTO purchases (user_id, purchase_date, supplier_name, total_amount, note)
SELECT
  v_uid,
  (CURRENT_DATE - n * 3)::date,
  (ARRAY['CJ대한통운','롯데물산','한국코카콜라','농심','해태제과','오리온','하이트진로','동서식품'])[floor(random()*8)::int + 1],
  floor(200000 + random() * 800000)::int,
  (ARRAY['정기 매입','특가 매입','긴급 발주','신상품 입고','판촉 행사'])[floor(random()*5)::int + 1]
FROM generate_series(0, 59) AS n;

RAISE NOTICE '✅ 시드 완료! 상품 60개 · 입출고 ~1200건 · 매출 180일 · 매입 60건 · sales_items ~600건';
END $$;
