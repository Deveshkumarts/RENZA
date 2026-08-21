-- Add pinned status to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create starred messages table for user-specific starring
CREATE TABLE IF NOT EXISTS public.starred_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, message_id)
);

ALTER TABLE public.starred_messages DISABLE ROW LEVEL SECURITY;

-- Turn on Realtime for starred_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.starred_messages;
