-- Chat System Setup Script

-- 1. Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PRIVATE', 'GROUP', 'COMPANY')),
    sub_category TEXT CHECK (sub_category IN ('TECH', 'NON-TECH', 'PROJECT', NULL)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create channel members table
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'ADMIN')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(channel_id, user_id)
);

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS to match existing app pattern
ALTER TABLE public.channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Turn on Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Insert default channels
INSERT INTO public.channels (name, type) VALUES ('General', 'COMPANY');
INSERT INTO public.channels (name, type) VALUES ('Announcements', 'COMPANY');

INSERT INTO public.channels (name, type, sub_category) VALUES ('Frontend Devs', 'GROUP', 'TECH');
INSERT INTO public.channels (name, type, sub_category) VALUES ('Backend Architecture', 'GROUP', 'TECH');
INSERT INTO public.channels (name, type, sub_category) VALUES ('HR Updates', 'GROUP', 'NON-TECH');
INSERT INTO public.channels (name, type, sub_category) VALUES ('Marketing Ideas', 'GROUP', 'NON-TECH');
INSERT INTO public.channels (name, type, sub_category) VALUES ('Project Alpha', 'GROUP', 'PROJECT');
INSERT INTO public.channels (name, type, sub_category) VALUES ('Website Redesign', 'GROUP', 'PROJECT');
