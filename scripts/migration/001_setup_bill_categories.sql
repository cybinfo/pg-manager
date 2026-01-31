-- ============================================================================
-- Data Migration: Bill Categories & Vendors for newgreenhigh@gmail.com
-- Step 1: Run this AFTER getting the workspace_id
-- ============================================================================

-- Replace '<WORKSPACE_ID>' with actual workspace_id from:
-- SELECT w.id FROM workspaces w JOIN user_profiles up ON w.owner_id = up.id WHERE up.email = 'newgreenhigh@gmail.com';

-- ============================================================================
-- BILL CATEGORIES (Parent Categories)
-- ============================================================================

-- First, delete existing default categories for this workspace (optional - keeps clean)
-- DELETE FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>';

INSERT INTO bill_categories (workspace_id, name, name_hi, description, sort_order, is_recurring, typical_due_day)
VALUES
  -- Utilities
  ('<WORKSPACE_ID>', 'Utilities - Gas', 'गैस', 'LPG cylinders and gas connections', 1, false, NULL),
  ('<WORKSPACE_ID>', 'Utilities - Electricity', 'बिजली', 'Electricity bills and related', 2, true, 10),
  ('<WORKSPACE_ID>', 'Utilities - Internet', 'इंटरनेट', 'Internet and broadband', 3, true, 5),

  -- Groceries
  ('<WORKSPACE_ID>', 'Groceries - Vegetables', 'सब्जी', 'Fresh vegetables', 10, false, NULL),
  ('<WORKSPACE_ID>', 'Groceries - Spices', 'मसाले', 'Spices and seasonings', 11, false, NULL),
  ('<WORKSPACE_ID>', 'Groceries - General', 'किराना', 'General grocery items', 12, false, NULL),
  ('<WORKSPACE_ID>', 'Groceries - Sweets', 'मिठाई', 'Sweets and snacks shops', 13, false, NULL),

  -- Shopping
  ('<WORKSPACE_ID>', 'Shopping - Electronics', 'इलेक्ट्रॉनिक्स', 'Electronic items and appliances', 20, false, NULL),
  ('<WORKSPACE_ID>', 'Shopping - Clothing', 'कपड़े', 'Clothing and apparel', 21, false, NULL),
  ('<WORKSPACE_ID>', 'Shopping - Appliances', 'उपकरण', 'Home appliances', 22, false, NULL),
  ('<WORKSPACE_ID>', 'Shopping - Bedding', 'बिस्तर', 'Bedding and linens', 23, false, NULL),

  -- Other
  ('<WORKSPACE_ID>', 'Entertainment', 'मनोरंजन', 'Movies, outings, etc.', 30, false, NULL),
  ('<WORKSPACE_ID>', 'E-commerce', 'ऑनलाइन', 'Online shopping platforms', 31, false, NULL),
  ('<WORKSPACE_ID>', 'Printing & Stationery', 'प्रिंटिंग', 'Printing, pamphlets, stationery', 32, false, NULL),
  ('<WORKSPACE_ID>', 'Transport', 'परिवहन', 'Metro, auto, transport', 33, false, NULL),
  ('<WORKSPACE_ID>', 'Other', 'अन्य', 'Miscellaneous bills', 99, false, NULL)
ON CONFLICT (workspace_id, name) DO NOTHING;

-- ============================================================================
-- VENDORS (Mapped to Categories)
-- ============================================================================

-- Get category IDs for mapping
WITH category_ids AS (
  SELECT id, name FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>'
)

-- Utilities - Gas
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Bharat Gas'),
  ('Indian Gas'),
  ('IndianOil'),
  ('Indian bada cylinder')
) AS v(name)
CROSS JOIN category_ids c
WHERE c.name = 'Utilities - Gas'
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Utilities - Electricity
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('BSES'),
  ('Country light'),
  ('Cooler current'),
  ('Geyser')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Utilities - Electricity') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Utilities - Internet
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('ANI Internet'),
  ('Udaan')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Utilities - Internet') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Groceries - Vegetables
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Aalu pyaj tamatar')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Groceries - Vegetables') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Groceries - Spices
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Masale wala')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Groceries - Spices') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Groceries - General
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Kirana store'),
  ('EASY BAZAR'),
  ('B3 cinema hall smart bazar')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Groceries - General') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Groceries - Sweets
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Hira Sweets'),
  ('Shagun sweetss'),
  ('Shreya sweets'),
  ('OM Bikaner')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Groceries - Sweets') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Shopping - Electronics
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Electronic dukaan'),
  ('Whirlpool AC')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Shopping - Electronics') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Shopping - Clothing
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Pent ki dukan')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Shopping - Clothing') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Shopping - Bedding
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Gada ki dukan')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Shopping - Bedding') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Entertainment
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Raj Mandir')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Entertainment') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- E-commerce
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Flipkart')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'E-commerce') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Printing & Stationery
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Pemplet')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Printing & Stationery') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Transport
INSERT INTO vendors (workspace_id, name, category_id)
SELECT '<WORKSPACE_ID>', v.name, c.id
FROM (VALUES
  ('Metoro shit'),
  ('Saikil nai')
) AS v(name)
CROSS JOIN (SELECT id FROM bill_categories WHERE workspace_id = '<WORKSPACE_ID>' AND name = 'Transport') c
ON CONFLICT (workspace_id, name) DO NOTHING;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Check categories
SELECT name, name_hi, sort_order FROM bill_categories
WHERE workspace_id = '<WORKSPACE_ID>' ORDER BY sort_order;

-- Check vendors with categories
SELECT v.name as vendor, bc.name as category
FROM vendors v
LEFT JOIN bill_categories bc ON v.category_id = bc.id
WHERE v.workspace_id = '<WORKSPACE_ID>'
ORDER BY bc.sort_order, v.name;
