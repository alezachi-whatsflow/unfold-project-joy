-- Make access_token nullable — not all integrations have a token at creation time
-- (e.g. ML pending, Telegram uses bot_token instead, Webchat has no token)
ALTER TABLE public.channel_integrations ALTER COLUMN access_token DROP NOT NULL;
