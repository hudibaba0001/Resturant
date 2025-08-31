-- Enable RLS on chat_messages table
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anon users to insert chat messages when session matches restaurant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages'
      AND policyname='anon insert chat_messages when session matches restaurant'
  ) THEN
    CREATE POLICY "anon insert chat_messages when session matches restaurant"
    ON public.chat_messages FOR INSERT TO anon
    WITH CHECK (
      -- Allow null session_id for now (MVP), prefer NOT NULL later once UI always passes it
      session_id IS NULL OR EXISTS (
        SELECT 1 FROM public.widget_sessions ws
        WHERE ws.id = chat_messages.session_id
          AND ws.restaurant_id = chat_messages.restaurant_id
      )
    );
  END IF;
END $$;

-- Policy: Allow anon users to read their own chat messages by session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages'
      AND policyname='anon select own chat messages by session'
  ) THEN
    CREATE POLICY "anon select own chat messages by session"
    ON public.chat_messages FOR SELECT TO anon
    USING (
      session_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.widget_sessions ws
        WHERE ws.id = chat_messages.session_id
          AND ws.restaurant_id = chat_messages.restaurant_id
      )
    );
  END IF;
END $$;

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'chat_messages';
