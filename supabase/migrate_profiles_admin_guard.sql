-- profiles.is_admin 승격 차단
--
-- profiles 의 RLS 는 "본인 row" 단위라 컬럼을 가리지 못한다. 그래서 아무 사용자나
-- anon 키로 자기 row 의 is_admin 을 true 로 UPDATE 하면 관리자가 됐다
-- (게시판 관리 · /api/analytics 방문자 통계 접근).
--
-- 컬럼 단위로 막아야 하는데 GRANT 는 화이트리스트라 컬럼이 늘 때마다 손봐야 해서,
-- 값이 바뀌는 것 자체를 트리거로 되돌린다. 컬럼이 추가돼도 영향받지 않는다.

create or replace function protect_is_admin()
returns trigger as $$
begin
  -- PostgREST 는 요청 역할로 전환한 뒤 질의한다(current_user = anon | authenticated).
  -- 서버리스 함수(service_role)와 SQL 편집기(postgres)는 그대로 통과시켜
  -- 관리자 지정은 계속 가능하게 둔다.
  if new.is_admin is distinct from old.is_admin
     and current_user in ('anon', 'authenticated') then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$ language plpgsql;   -- security definer 금지: 그러면 current_user 가 함수 소유자로 바뀐다

drop trigger if exists profiles_protect_is_admin on profiles;

create trigger profiles_protect_is_admin
  before update on profiles
  for each row execute function protect_is_admin();

-- 확인: 아래를 authenticated 세션(앱)에서 실행해도 is_admin 은 false 로 남아야 한다.
--   update profiles set is_admin = true where user_id = auth.uid();
--
-- 관리자 지정은 SQL 편집기에서:
--   update profiles set is_admin = true where user_id = (
--     select id from auth.users where email = 'sinbi850403@gmail.com'
--   );
