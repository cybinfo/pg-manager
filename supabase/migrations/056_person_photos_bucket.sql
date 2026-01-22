-- ============================================
-- Migration 056: Person Photos Storage Bucket
-- ============================================
-- Creates storage bucket for person photos in the People module
-- ============================================

-- Create person-photos bucket (public for dashboard display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'person-photos',
    'person-photos',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Person photos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload person photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own person photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own person photos" ON storage.objects;

-- Create storage policies for person-photos bucket
CREATE POLICY "Person photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'person-photos');

CREATE POLICY "Authenticated users can upload person photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'person-photos');

CREATE POLICY "Users can update own person photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'person-photos');

CREATE POLICY "Users can delete own person photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'person-photos');
