-- sales / purchases / sales_items RLS 정책 정상화
-- (profiles 와 동일한 문제: SELECT/UPDATE 정책만 있고 INSERT 정책이 없어서 upsert 시 403)
-- Supabase 대시보드 → SQL Editor 에서 실행

do $$
begin

  -- ============ sales ============
  if exists (select 1 from information_schema.tables where table_name = 'sales') then
    execute 'drop policy if exists "own sales"                  on sales';
    execute 'drop policy if exists "Users can view own sales"   on sales';
    execute 'drop policy if exists "Users can insert own sales" on sales';
    execute 'drop policy if exists "Users can update own sales" on sales';
    execute 'drop policy if exists "Users can delete own sales" on sales';

    execute 'create policy "own sales" on sales for all
      using      (auth.uid() = user_id)
      with check (auth.uid() = user_id)';
  end if;

  -- ============ purchases ============
  if exists (select 1 from information_schema.tables where table_name = 'purchases') then
    execute 'drop policy if exists "own purchases"                  on purchases';
    execute 'drop policy if exists "Users can view own purchases"   on purchases';
    execute 'drop policy if exists "Users can insert own purchases" on purchases';
    execute 'drop policy if exists "Users can update own purchases" on purchases';
    execute 'drop policy if exists "Users can delete own purchases" on purchases';

    execute 'create policy "own purchases" on purchases for all
      using      (auth.uid() = user_id)
      with check (auth.uid() = user_id)';
  end if;

  -- ============ sales_items ============
  if exists (select 1 from information_schema.tables where table_name = 'sales_items') then
    execute 'drop policy if exists "own sales_items"                  on sales_items';
    execute 'drop policy if exists "Users can view own sales_items"   on sales_items';
    execute 'drop policy if exists "Users can insert own sales_items" on sales_items';
    execute 'drop policy if exists "Users can update own sales_items" on sales_items';
    execute 'drop policy if exists "Users can delete own sales_items" on sales_items';

    execute 'create policy "own sales_items" on sales_items for all
      using      (auth.uid() = user_id)
      with check (auth.uid() = user_id)';
  end if;

end $$;
