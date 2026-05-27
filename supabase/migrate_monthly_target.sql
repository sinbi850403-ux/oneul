-- 월 매출 목표 컬럼 추가
alter table profiles
  add column if not exists monthly_target bigint not null default 0;
