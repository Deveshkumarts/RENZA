-- Run this in your Supabase SQL Editor to enable file uploads!

-- 1. Create the 'uploads' bucket if it doesn't exist and make it public
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to upload files to the 'uploads' bucket
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'uploads' );

-- 3. Allow anyone to view files in the 'uploads' bucket
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
USING ( bucket_id = 'uploads' );

-- 4. Allow anyone to update/delete their own files (or all files, for testing)
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'uploads' );

CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
USING ( bucket_id = 'uploads' );
