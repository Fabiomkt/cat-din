CREATE TABLE IF NOT EXISTS public.telegram_update_log (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_update_log ENABLE ROW LEVEL SECURITY;
