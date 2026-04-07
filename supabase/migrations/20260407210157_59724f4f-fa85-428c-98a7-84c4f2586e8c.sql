
CREATE POLICY "Users can delete own gastos_telegram"
ON public.gastos_telegram
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
