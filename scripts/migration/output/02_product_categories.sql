-- Product Categories
INSERT INTO product_categories (workspace_id, name, sort_order, is_active)
VALUES
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Vegetables', 1, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Hardware', 2, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Staples', 3, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Snacks & Beverages', 4, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Packaged Food', 5, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Personal Care', 6, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Household Care', 7, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Dairy Product', 8, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Home & Kitchen', 9, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Fruits', 10, true),
  ('c33a03b7-989c-4618-b394-10ca454b42a7', 'Dabai Teplet', 11, true)
ON CONFLICT (workspace_id, name) DO NOTHING;
