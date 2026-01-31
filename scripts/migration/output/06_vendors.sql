-- Vendors (28 records)
INSERT INTO vendors (workspace_id, name, category_id)
SELECT
  'c33a03b7-989c-4618-b394-10ca454b42a7' as workspace_id,
  v.name,
  bc.id as category_id
FROM (VALUES
  ('Udaan', 'Utilities - Internet'),
  ('Ani Internet', 'Utilities - Internet'),
  ('Raj Mandir', 'Entertainment'),
  ('Indian Gas', 'Utilities - Gas'),
  ('Easy Bazar', 'Groceries - General'),
  ('Country Light', 'Utilities - Electricity'),
  ('Bharat Gas', 'Utilities - Gas'),
  ('Hira Sweets', 'Groceries - Sweets'),
  ('BSES', 'Utilities - Electricity'),
  ('Shagun Sweetss', 'Groceries - Sweets'),
  ('Kirana Store', 'Groceries - General'),
  ('Om Bikaner', 'Groceries - Sweets'),
  ('Lndianoil', 'Utilities - Gas'),
  ('Aalu Pyaj Tamatar', 'Groceries - Vegetables'),
  ('Whirlpool Ac', 'Shopping - Electronics'),
  ('Shreya Sweets', 'Groceries - Sweets'),
  ('Indian Bada Cylinder', 'Utilities - Gas'),
  ('Flipkart', 'E-commerce'),
  ('Electronic Dukaan', 'Shopping - Electronics'),
  ('Cooler Current', 'Utilities - Electricity'),
  ('B3 Cinema Hall Smart Bazar', 'Groceries - General'),
  ('Masale Wala', 'Groceries - Spices'),
  ('Geyser', 'Shopping - Electronics'),
  ('Gada Ki Dukan', 'Shopping - Bedding'),
  ('Pent Ki Dukan', 'Shopping - Clothing'),
  ('Metoro Shit', 'Transport'),
  ('Pemplet', 'Printing & Stationery'),
  ('Saikil Nai', 'Transport')) AS v(name, category_name)
LEFT JOIN bill_categories bc ON bc.workspace_id = 'c33a03b7-989c-4618-b394-10ca454b42a7' AND bc.name = v.category_name
ON CONFLICT (workspace_id, name) DO NOTHING;
