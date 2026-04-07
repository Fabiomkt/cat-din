
ALTER TABLE public.profiles ADD COLUMN full_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN phone text NOT NULL DEFAULT '';

CREATE POLICY "Allow authenticated users to view gastos_telegram"
ON public.gastos_telegram
FOR SELECT
TO authenticated
USING (true);
