-- ============================================================
-- 오늘재고 / 오늘장부 대용량 시드 데이터
-- UID: faaad4cc-19d1-480b-9568-ab4fd62aa5a3
-- 상품 1,500개 + 재고 + 입출고이력 + 매출 180일
-- ============================================================

DO $$
DECLARE
  v_uid uuid := 'faaad4cc-19d1-480b-9568-ab4fd62aa5a3'::uuid;
BEGIN

-- ──────────────────────────────────────────────────────────
-- 1. 음료 300개
-- ──────────────────────────────────────────────────────────
INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
SELECT
  v_uid,
  b || ' ' || f || ' ' || s,
  '개',
  floor(700  + random() * 2300)::int,
  floor(1200 + random() * 3300)::int,
  '음료',
  floor(10 + random() * 30)::int,
  false
FROM
  unnest(ARRAY['코카콜라','펩시','스프라이트','환타','포카리스웨트','게토레이','비타500','레드불','핫식스','몬스터','파워에이드','번개맨']) AS b,
  unnest(ARRAY['오리지널','라이트','제로','레몬','오렌지','딸기','포도','사과','복숭아'])        AS f,
  unnest(ARRAY['200ml','250ml','355ml','500ml','1L','1.5L'])                                    AS s
ORDER BY random()
LIMIT 300;

-- ──────────────────────────────────────────────────────────
-- 2. 식품 300개
-- ──────────────────────────────────────────────────────────
INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
SELECT
  v_uid,
  b || ' ' || t || ' ' || v,
  '개',
  floor(300  + random() * 2700)::int,
  floor(500  + random() * 4500)::int,
  '식품',
  floor(10 + random() * 25)::int,
  false
FROM
  unnest(ARRAY['농심','오리온','롯데','해태','크라운','삼양','빙그레','동서','CJ제일제당','팔도','풀무원','대상']) AS b,
  unnest(ARRAY['새우깡','초코파이','포카칩','오레오','빼빼로','젤리','사탕','껌','쿠키','크래커'])              AS t,
  unnest(ARRAY['오리지널','허니버터','불닭','치즈','초코','딸기','바닐라'])                                   AS v
ORDER BY random()
LIMIT 300;

-- ──────────────────────────────────────────────────────────
-- 3. 냉동/아이스크림 150개
-- ──────────────────────────────────────────────────────────
INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
SELECT
  v_uid,
  b || ' ' || t || ' ' || v,
  '개',
  floor(400  + random() * 1600)::int,
  floor(700  + random() * 2300)::int,
  '냉동',
  floor(15 + random() * 25)::int,
  false
FROM
  unnest(ARRAY['빙그레','롯데','해태','농심','동원','CJ','오뚜기','풀무원']) AS b,
  unnest(ARRAY['아이스크림','샌드','바','튜브','컵','조각피자','떡볶이','만두'])                     AS t,
  unnest(ARRAY['딸기','초코','바닐라','메론','포도','복숭아'])                                     AS v
ORDER BY random()
LIMIT 150;

-- ──────────────────────────────────────────────────────────
-- 4. 주류 200개
-- ──────────────────────────────────────────────────────────
INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
SELECT
  v_uid,
  b || ' ' || t || ' ' || s,
  '개',
  floor(1000 + random() * 9000)::int,
  floor(1800 + random() * 13000)::int,
  '주류',
  floor(10 + random() * 20)::int,
  false
FROM
  unnest(ARRAY['하이트','테라','카스','오비','클라우드','참이슬','처음처럼','한라산','막걸리','와인','위스키','수입맥주']) AS b,
  unnest(ARRAY['오리지널','라이트','드라이','골드','프리미엄','스페셜','클래식','리저브'])                              AS t,
  unnest(ARRAY['200ml','330ml','355ml','500ml','750ml','1L'])                                                       AS s
ORDER BY random()
LIMIT 200;

-- ──────────────────────────────────────────────────────────
-- 5. 생활용품 200개
-- ──────────────────────────────────────────────────────────
INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
SELECT
  v_uid,
  b || ' ' || t || ' ' || v,
  '개',
  floor(500  + random() * 9500)::int,
  floor(1000 + random() * 14000)::int,
  '생활용품',
  floor(5 + random() * 20)::int,
  false
FROM
  unnest(ARRAY['유한킴벌리','P&G','엘지생활건강','아모레퍼시픽','애경','3M','옥시','버터플라이','그린핑거','깨끗한나라']) AS b,
  unnest(ARRAY['샴푸','린스','바디워시','치약','칫솔','면도기','생리대','기저귀','물티슈','휴지'])                       AS t,
  unnest(ARRAY['200ml','400ml','500ml','1L','2L','3팩','5팩','10개입'])                                              AS v
ORDER BY random()
LIMIT 200;

-- ──────────────────────────────────────────────────────────
-- 6. 기타/담배/문구 350개
-- ──────────────────────────────────────────────────────────
INSERT INTO products (user_id, name, unit, price, selling_price, category, min_quantity, is_favorite)
SELECT
  v_uid,
  b || ' ' || t || ' ' || v,
  '개',
  floor(300  + random() * 7700)::int,
  floor(500  + random() * 10000)::int,
  '기타',
  floor(5 + random() * 30)::int,
  false
FROM
  unnest(ARRAY['KT&G','필립모리스','BAT코리아','JTI','동아','모나미','스테들러','파일로','3M','다이소']) AS b,
  unnest(ARRAY['담배','전자담배','볼펜','수정액','포스트잇','건전지','USB','이어폰','마스크','핫팩'])     AS t,
  unnest(ARRAY['오리지널','슬림','멘솔','라이트','골드','블랙','레드','화이트','블루','그린','퍼플'])     AS v
ORDER BY random()
LIMIT 350;

-- ──────────────────────────────────────────────────────────
-- 7. 재고 초기화 (신규 상품만)
-- ──────────────────────────────────────────────────────────
INSERT INTO stock (user_id, product_id, quantity, avg_cost)
SELECT
  p.user_id, p.id,
  floor(20 + random() * 150)::int,
  p.price
FROM products p
WHERE p.user_id = v_uid
  AND NOT EXISTS (
    SELECT 1 FROM stock s WHERE s.product_id = p.id
  );

-- ──────────────────────────────────────────────────────────
-- 8. 입출고 이력 (상품당 4건 = 약 6,000건)
-- ──────────────────────────────────────────────────────────
INSERT INTO stock_log (user_id, product_id, type, quantity, unit_price, selling_price, source, note, created_at)
SELECT
  v_uid,
  p.id,
  CASE WHEN gs % 2 = 0 THEN 'out' ELSE 'in' END,
  CASE WHEN gs % 2 = 0 THEN floor(2  + random() * 20)::int
                        ELSE floor(15 + random() * 85)::int END,
  p.price,
  p.selling_price,
  CASE WHEN gs % 2 = 0 THEN 'pos' ELSE 'manual' END,
  NULL,
  NOW() - (floor(random() * 180) || ' days')::interval
       - (floor(random() * 86400) || ' seconds')::interval
FROM products p
CROSS JOIN generate_series(1, 4) AS gs
WHERE p.user_id = v_uid;

-- ──────────────────────────────────────────────────────────
-- 9. sales_items (출고와 연동)
-- ──────────────────────────────────────────────────────────
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
  AND sl.type    = 'out'
  AND sl.source  = 'pos';

-- ──────────────────────────────────────────────────────────
-- 10. 장부앱 매출 180일
-- ──────────────────────────────────────────────────────────
INSERT INTO sales (user_id, sale_date, card, cash, npay, kpay, total)
SELECT
  v_uid,
  (CURRENT_DATE - n)::date,
  floor(base * 0.50)::int,
  floor(base * 0.10)::int,
  floor(base * 0.30)::int,
  floor(base * 0.10)::int,
  base
FROM (
  SELECT
    n,
    CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - n) IN (0,6)
      THEN floor(1500000 + random() * 2000000)::int
      ELSE floor(700000  + random() * 1000000)::int
    END AS base
  FROM generate_series(0, 179) n
) sub
ON CONFLICT (user_id, sale_date) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 11. 매입 내역 60건
-- ──────────────────────────────────────────────────────────
INSERT INTO purchases (user_id, purchase_date, supplier_name, total_amount, note)
SELECT
  v_uid,
  (CURRENT_DATE - n * 3)::date,
  (ARRAY['CJ대한통운','롯데물산','한국코카콜라','농심','해태제과','오리온','하이트진로','동서식품','아모레퍼시픽','LG생활건강'])[floor(random()*10)::int + 1],
  floor(500000 + random() * 2000000)::int,
  (ARRAY['정기 매입','특가 매입','긴급 발주','신상품 입고','판촉행사 재고','대량 할인'])[floor(random()*6)::int + 1]
FROM generate_series(0, 59) AS n;

RAISE NOTICE '✅ 완료! 상품 1,500개 · 재고 초기화 · 입출고 ~6,000건 · 매출 180일 · 매입 60건';
END $$;
