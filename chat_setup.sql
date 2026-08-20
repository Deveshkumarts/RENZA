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
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'ADMIN')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(channel_id, user_id)
);

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for Channels
CREATE POLICY "Channels are visible to members or if they are COMPANY channels" 
ON public.channels FOR SELECT 
USING (type = 'COMPANY' OR id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()));

-- Policies for Channel Members
CREATE POLICY "Users can see members of their channels"
ON public.channel_members FOR SELECT
USING (channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR EXISTS(SELECT 1 FROM public.channels WHERE id = channel_id AND type = 'COMPANY'));

-- Policies for Messages
CREATE POLICY "Users can read messages in their channels"
ON public.messages FOR SELECT
USING (channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR EXISTS(SELECT 1 FROM public.channels WHERE id = channel_id AND type = 'COMPANY'));

CREATE POLICY "Users can insert messages in their channels"
ON public.messages FOR INSERT
WITH CHECK (sender_id = auth.uid() AND (channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()) OR EXISTS(SELECT 1 FROM public.channels WHERE id = channel_id AND type = 'COMPANY')));

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
