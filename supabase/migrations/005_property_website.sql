-- Property Website Feature
-- Adds fields to properties table for public-facing PG websites

-- Add website-related columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS website_slug TEXT UNIQUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS website_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS website_config JSONB DEFAULT '{}'::jsonb;

/*
website_config structure:
{
    "tagline": "Your Home Away From Home",
    "description": "Welcome to our PG accommodation...",
    "property_type": "pg", -- "pg", "hostel", "coliving"
    "established_year": 2020,
    "cover_photo_url": "https://...",
    "gallery": ["url1", "url2", ...],
    "amenities": ["WiFi", "AC", "Food", "Laundry", "Parking", "CCTV", "Power Backup", "Gym"],
    "house_rules": "1. No smoking...\n2. Visitors till 8 PM...",
    "google_maps_url": "https://maps.google.com/...",
    "nearby_landmarks": ["Metro Station - 500m", "Mall - 1km"],
    "contact_whatsapp": "919876543210",
    "contact_email": "contact@example.com",
    "show_rooms": true,
    "show_pricing": true,
    "show_contact_form": true
}
*/

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_properties_website_slug ON properties(website_slug) WHERE website_slug IS NOT NULL;

-- Function to generate slug from property name
CREATE OR REPLACE FUNCTION generate_property_slug(property_name TEXT, property_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(property_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- Limit length
    IF length(base_slug) > 50 THEN
        base_slug := substring(base_slug from 1 for 50);
    END IF;

    final_slug := base_slug;

    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM properties WHERE website_slug = final_slug AND id != property_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create table for website inquiries (leads from contact form)
CREATE TABLE IF NOT EXISTS website_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT,

    -- Inquiry preferences
    preferred_room_type TEXT, -- "single", "double", "triple"
    expected_move_in DATE,

    -- Status tracking
    status TEXT DEFAULT 'new', -- "new", "contacted", "converted", "closed"
    notes TEXT,

    -- Source tracking
    source TEXT DEFAULT 'website', -- "website", "whatsapp", "phone"

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_website_inquiries_owner ON website_inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_website_inquiries_property ON website_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_website_inquiries_status ON website_inquiries(status);

-- RLS for website_inquiries
ALTER TABLE website_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their inquiries" ON website_inquiries
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their inquiries" ON website_inquiries
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their inquiries" ON website_inquiries
    FOR DELETE USING (owner_id = auth.uid());

-- Allow anyone to insert inquiries (public contact form)
CREATE POLICY "Anyone can submit inquiry" ON website_inquiries
    FOR INSERT WITH CHECK (true);
