-- onboarded 컬럼 추가
alter table profiles
  add column if not exists onboarded boolean not null default false;

-- 기존 사용자(가게이름 있는 경우) → 이미 온보딩 완료로 처리
update profiles set onboarded = true
  where shop_name is not null and shop_name != '';
