-- Run this in the Supabase SQL Editor

-- 1. Create Task Comments Table
CREATE TABLE public.task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES public.assigned_tasks(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Disable RLS so frontend can query it easily
ALTER TABLE public.task_comments DISABLE ROW LEVEL SECURITY;
