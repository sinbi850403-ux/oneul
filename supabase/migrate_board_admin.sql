-- 관리자 플래그
alter table profiles add column if not exists is_admin boolean not null default false;

-- 게시글 상태 (open / processing / done)
alter table board_posts add column if not exists status text not null default 'open';

-- 관리자 답변 테이블
create table if not exists board_replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references board_posts(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

alter table board_replies enable row level security;

-- 누구나 답변 읽기 가능
create policy "board_replies_read" on board_replies
  for select using (true);

-- 관리자만 답변 작성/삭제
create policy "board_replies_admin_write" on board_replies
  for all using (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where user_id = auth.uid() and is_admin = true
    )
  );

-- 관리자 계정 설정 (아래 쿼리를 별도로 실행하세요)
-- update profiles set is_admin = true where user_id = (
--   select id from auth.users where email = 'sinbi850403@gmail.com'
-- );
