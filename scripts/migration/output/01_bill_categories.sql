-- Bill Categories for workspace c33a03b7-989c-4618-b394-10ca454b42a7
INSERT INTO bill_categories (workspace_id, name, name_hi, description, sort_order, is_recurring)
VALUES
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Utilities - Gas', 'गैस', 'LPG cylinders and gas connections', 1, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Utilities - Electricity', 'बिजली', 'Electricity bills and related', 2, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Utilities - Internet', 'इंटरनेट', 'Internet and broadband', 3, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Groceries - Vegetables', 'सब्जी', 'Fresh vegetables', 10, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Groceries - Spices', 'मसाले', 'Spices and seasonings', 11, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Groceries - General', 'किराना', 'General grocery items', 12, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Groceries - Sweets', 'मिठाई', 'Sweets and snacks shops', 13, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Shopping - Electronics', 'इलेक्ट्रॉनिक्स', 'Electronic items and appliances', 20, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Shopping - Clothing', 'कपड़े', 'Clothing and apparel', 21, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Shopping - Appliances', 'उपकरण', 'Home appliances', 22, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Shopping - Bedding', 'बिस्तर', 'Bedding and linens', 23, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Entertainment', 'मनोरंजन', 'Movies, outings, etc.', 30, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'E-commerce', 'ऑनलाइन', 'Online shopping platforms', 31, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Printing & Stationery', 'प्रिंटिंग', 'Printing, pamphlets, stationery', 32, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Transport', 'परिवहन', 'Metro, auto, transport', 33, false),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Other', 'अन्य', 'Miscellaneous bills', 99, false)
ON CONFLICT (workspace_id, name) DO NOTHING;
