
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
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram profile"
ON public.perfis_telegram
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
