-- 상품 카테고리 컬럼 추가
alter table products add column if not exists category text not null default '일반';

-- 인덱스 추가 (카테고리 필터링 성능)
create index if not exists products_category_idx on products(user_id, category);
