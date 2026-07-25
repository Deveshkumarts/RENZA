-- Run this in the Supabase SQL Editor

-- 1. Create Company Updates Table
CREATE TABLE public.company_updates (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Disable RLS so frontend can query it easily (matches existing app pattern)
ALTER TABLE public.company_updates DISABLE ROW LEVEL SECURITY;
