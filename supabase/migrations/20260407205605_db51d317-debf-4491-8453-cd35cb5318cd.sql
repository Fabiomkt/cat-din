
CREATE TABLE IF NOT EXISTS public.perfis_telegram (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL UNIQUE,
  data_vinculo TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.perfis_telegram ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own telegram profile" ON public.perfis_telegram;
DROP POLICY IF EXISTS "Users can view own telegram profile" ON public.perfis_telegram;
DROP POLICY IF EXISTS "Users can update own telegram profile" ON public.perfis_telegram;
DROP POLICY IF EXISTS "Users can delete own telegram profile" ON public.perfis_telegram;

CREATE POLICY "Users can insert own telegram profile"
ON public.perfis_telegram
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own telegram profile"
ON public.perfis_telegram
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram profile"
ON public.perfis_telegram
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram profile"
ON public.perfis_telegram
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
