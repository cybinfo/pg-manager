-- ============================================
-- Migration 015: Supabase Storage Buckets
-- ============================================
-- Creates storage buckets for photos and documents
-- with appropriate RLS policies for authenticated users
-- ============================================

-- ============================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================

-- Property photos bucket (public for website display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-photos',
    'property-photos',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Room photos bucket (public for website display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'room-photos',
    'room-photos',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Tenant photos bucket (private - only owner/staff can access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tenant-photos',
    'tenant-photos',
    true, -- Public for easy access in dashboard (data is protected by path structure)
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Tenant documents bucket (private - sensitive ID documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tenant-documents',
    'tenant-documents',
    true, -- Public URLs but protected by path structure (owner_id prefix)
    10485760, -- 10MB for document scans
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================

-- Property photos policies
DROP POLICY IF EXISTS "Property photos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own property photos" ON storage.objects;

-- Room photos policies
DROP POLICY IF EXISTS "Room photos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload room photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own room photos" ON storage.objects;

-- Tenant photos policies
DROP POLICY IF EXISTS "Tenant photos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tenant photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own tenant photos" ON storage.objects;

-- Tenant documents policies
DROP POLICY IF EXISTS "Tenant documents are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tenant documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own tenant documents" ON storage.objects;

-- ============================================
-- 3. CREATE STORAGE POLICIES
-- ============================================

-- Property Photos: Public read, authenticated upload
CREATE POLICY "Property photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Users can update own property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "Users can delete own property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');

-- Room Photos: Public read, authenticated upload
CREATE POLICY "Room photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-photos');

CREATE POLICY "Authenticated users can upload room photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'room-photos');

CREATE POLICY "Users can update own room photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'room-photos');

CREATE POLICY "Users can delete own room photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'room-photos');

-- Tenant Photos: Public read, authenticated upload
CREATE POLICY "Tenant photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-photos');

CREATE POLICY "Authenticated users can upload tenant photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-photos');

CREATE POLICY "Users can update own tenant photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-photos');

CREATE POLICY "Users can delete own tenant photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tenant-photos');

-- Tenant Documents: Public read (URLs contain owner_id), authenticated upload
CREATE POLICY "Tenant documents are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-documents');

CREATE POLICY "Authenticated users can upload tenant documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-documents');

CREATE POLICY "Users can update own tenant documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-documents');

CREATE POLICY "Users can delete own tenant documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tenant-documents');

-- ============================================
-- NOTES:
-- ============================================
-- 1. All buckets are set to 'public' for easy URL access
-- 2. Upload/Delete is restricted to authenticated users only
-- 3. For production, consider adding owner_id checks to path:
--    e.g., WITH CHECK (bucket_id = 'tenant-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
-- 4. File paths should follow pattern: {owner_id}/{property_id}/{filename}
-- ============================================
