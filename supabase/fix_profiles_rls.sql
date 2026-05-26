-- profiles 테이블 INSERT RLS 정책 추가
-- (기존에 UPDATE 정책만 있고 INSERT 정책이 없어서 upsert 시 403 발생)

-- 본인 row INSERT 허용
CREATE POLICY IF NOT EXISTS "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 혹시 기존 정책이 누락된 경우 대비해 SELECT/UPDATE도 재확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;
