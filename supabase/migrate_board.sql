-- 게시판 테이블
create table if not exists board_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  category   text not null default 'free',   -- 'bug' | 'feature' | 'free'
  title      text not null,
  content    text not null,
  nickname   text not null default '익명',
  created_at timestamptz not null default now()
);

alter table board_posts enable row level security;

-- 누구나 읽기 가능
create policy "Anyone can read posts" on board_posts
  for select using (true);

-- 로그인 유저만 작성
create policy "Authenticated users can insert" on board_posts
  for insert with check (auth.uid() = user_id);

-- 본인 글만 삭제
create policy "Owner can delete own post" on board_posts
  for delete using (auth.uid() = user_id);
