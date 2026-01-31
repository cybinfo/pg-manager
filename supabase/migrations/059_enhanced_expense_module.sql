-- ============================================
-- Migration 059: Enhanced Expense Module
-- Adds: Daily Spend, Bills & Vendors, Services
-- Date: 2026-01-31
-- ============================================

-- ============================================
-- PART 1: PRODUCT CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_hi TEXT, -- Hindi name for regional support
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_product_categories_workspace ON product_categories(workspace_id) WHERE is_active = true;

-- ============================================
-- PART 2: PRODUCTS (Kitchen/Daily Spend Items)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_hi TEXT, -- Hindi name
  category_id UUID REFERENCES product_categories(id),

  default_unit TEXT, -- Kg, Ltr, Pcs, Dozen, etc.
  default_rate DECIMAL(10,2),

  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_products_workspace ON products(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active ON products(workspace_id, is_active) WHERE deleted_at IS NULL;

-- ============================================
-- PART 3: DAILY SPEND (Kitchen Purchases)
-- ============================================

CREATE TABLE IF NOT EXISTS daily_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id), -- Optional property link

  spend_date DATE NOT NULL,

  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL, -- Denormalized for history
  category_name TEXT, -- Denormalized from product category

  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  rate DECIMAL(10,2) NOT NULL CHECK (rate >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),

  vendor_name TEXT, -- Optional: where purchased
  notes TEXT,
  receipt_url TEXT,

  -- Payment tracking
  payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'credit')),
  payment_reference TEXT, -- UPI UTR, etc.

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_daily_spend_workspace_date ON daily_spend(workspace_id, spend_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_spend_property ON daily_spend(property_id, spend_date DESC) WHERE property_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_daily_spend_product ON daily_spend(product_id) WHERE deleted_at IS NULL;

-- ============================================
-- PART 4: BILL CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS bill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_hi TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- For recurring bill tracking
  is_recurring BOOLEAN DEFAULT false,
  typical_due_day INTEGER CHECK (typical_due_day >= 1 AND typical_due_day <= 31),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_bill_categories_workspace ON bill_categories(workspace_id) WHERE is_active = true;

-- ============================================
-- PART 5: VENDORS (Bill Payment Parties)
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  category_id UUID REFERENCES bill_categories(id),

  -- Contact info
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,

  -- India-specific
  gstin TEXT, -- 15-digit GST number
  pan TEXT, -- 10-digit PAN
  upi_id TEXT, -- Vendor's UPI ID for quick payments

  -- Bank details (for NEFT/RTGS)
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,

  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_vendors_workspace ON vendors(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_category ON vendors(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_active ON vendors(workspace_id, is_active) WHERE deleted_at IS NULL;

-- ============================================
-- PART 6: BILL PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id), -- Optional property link

  vendor_id UUID REFERENCES vendors(id),
  vendor_name TEXT NOT NULL, -- Denormalized
  category_id UUID REFERENCES bill_categories(id),
  category_name TEXT, -- Denormalized

  -- Bill details
  bill_number TEXT,
  bill_period TEXT, -- "Jan 2026", "Q1 2026", etc.
  bill_date DATE,
  due_date DATE,

  -- Amounts
  bill_amount DECIMAL(10,2) NOT NULL CHECK (bill_amount > 0),

  -- GST breakdown (India-specific)
  base_amount DECIMAL(10,2), -- Amount before GST
  gst_amount DECIMAL(10,2),
  cgst DECIMAL(10,2),
  sgst DECIMAL(10,2),
  igst DECIMAL(10,2),
  hsn_code TEXT,

  -- Payment
  paid_amount DECIMAL(10,2),
  payment_date DATE,
  payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'dd')),
  payment_reference TEXT, -- UTR, cheque no, etc.

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),

  receipt_url TEXT,
  invoice_url TEXT, -- Original invoice/bill image
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_bill_payments_workspace ON bill_payments(workspace_id, payment_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_bill_payments_vendor ON bill_payments(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bill_payments_status ON bill_payments(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bill_payments_due ON bill_payments(workspace_id, due_date) WHERE status IN ('pending', 'overdue') AND deleted_at IS NULL;
CREATE INDEX idx_bill_payments_property ON bill_payments(property_id, payment_date DESC) WHERE property_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================
-- PART 7: SERVICE CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_hi TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- TDS settings for this category
  default_tds_section TEXT, -- '194C', '194J', etc.
  default_tds_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_service_categories_workspace ON service_categories(workspace_id) WHERE is_active = true;

-- ============================================
-- PART 8: SERVICE PROVIDERS
-- ============================================

CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  category_id UUID REFERENCES service_categories(id),

  -- Contact info
  phone TEXT,
  alternate_phone TEXT,
  email TEXT,
  address TEXT,

  -- India-specific (for TDS)
  pan TEXT, -- Required for TDS > ₹30,000
  gstin TEXT,
  upi_id TEXT,

  -- TDS settings
  tds_applicable BOOLEAN DEFAULT false,
  tds_section TEXT, -- '194C', '194J', '194I', '194H'
  tds_rate DECIMAL(5,2),

  -- Rating & notes
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  total_jobs INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name, category_id)
);

CREATE INDEX idx_service_providers_workspace ON service_providers(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_providers_category ON service_providers(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_providers_rating ON service_providers(workspace_id, rating DESC) WHERE deleted_at IS NULL AND is_active = true;

-- ============================================
-- PART 9: SERVICE PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id), -- Optional
  room_id UUID REFERENCES rooms(id), -- Optional - specific room

  provider_id UUID REFERENCES service_providers(id),
  provider_name TEXT NOT NULL, -- Denormalized
  category_id UUID REFERENCES service_categories(id),
  category_name TEXT, -- Denormalized

  service_date DATE NOT NULL,
  description TEXT NOT NULL,

  -- Amounts with TDS
  gross_amount DECIMAL(10,2) NOT NULL CHECK (gross_amount > 0),
  tds_applicable BOOLEAN DEFAULT false,
  tds_section TEXT,
  tds_rate DECIMAL(5,2),
  tds_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL, -- gross - tds

  payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),
  payment_reference TEXT,
  payment_date DATE,

  -- Warranty tracking
  warranty_months INTEGER DEFAULT 0,
  warranty_expiry DATE,

  -- Documentation
  photos JSONB DEFAULT '[]', -- Array of photo URLs
  receipt_url TEXT,
  notes TEXT,

  -- Link to complaint if service was for complaint resolution
  complaint_id UUID REFERENCES complaints(id),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_service_payments_workspace ON service_payments(workspace_id, service_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_payments_provider ON service_payments(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_payments_property ON service_payments(property_id, service_date DESC) WHERE property_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_service_payments_warranty ON service_payments(workspace_id, warranty_expiry) WHERE warranty_months > 0 AND deleted_at IS NULL;
CREATE INDEX idx_service_payments_complaint ON service_payments(complaint_id) WHERE complaint_id IS NOT NULL;

-- ============================================
-- PART 10: PRICE HISTORY (For Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  recorded_date DATE NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  vendor_name TEXT,
  quantity DECIMAL(10,3),

  -- Source of the price
  source_type TEXT DEFAULT 'daily_spend', -- 'daily_spend', 'manual', 'import'
  source_id UUID, -- Reference to daily_spend entry

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON product_price_history(product_id, recorded_date DESC);
CREATE INDEX idx_price_history_workspace_date ON product_price_history(workspace_id, recorded_date DESC);

-- ============================================
-- PART 11: EXPENSE BUDGETS
-- ============================================

CREATE TABLE IF NOT EXISTS expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id), -- NULL = all properties

  budget_type TEXT NOT NULL CHECK (budget_type IN ('daily_spend', 'bills', 'services', 'total')),
  category_id UUID, -- Optional: specific category

  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  fiscal_year TEXT NOT NULL, -- '2025-26'
  month INTEGER CHECK (month >= 1 AND month <= 12), -- For monthly budgets
  quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4), -- For quarterly budgets

  budget_amount DECIMAL(12,2) NOT NULL CHECK (budget_amount > 0),

  -- Tracking
  alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- Alert at 80% usage

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, property_id, budget_type, category_id, period_type, fiscal_year, month, quarter)
);

CREATE INDEX idx_expense_budgets_workspace ON expense_budgets(workspace_id, fiscal_year);

-- ============================================
-- PART 12: KITCHEN WASTAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS kitchen_wastage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),

  wastage_date DATE NOT NULL,

  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,

  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  estimated_value DECIMAL(10,2) NOT NULL,

  reason TEXT CHECK (reason IN ('over_prepared', 'spoiled', 'expired', 'damaged', 'other')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_kitchen_wastage_workspace ON kitchen_wastage(workspace_id, wastage_date DESC);
CREATE INDEX idx_kitchen_wastage_property ON kitchen_wastage(property_id, wastage_date DESC) WHERE property_id IS NOT NULL;

-- ============================================
-- PART 13: UPI PAYMENT DETAILS
-- ============================================

CREATE TABLE IF NOT EXISTS payment_upi_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL CHECK (entity_type IN ('daily_spend', 'bill_payment', 'service_payment', 'expense')),
  entity_id UUID NOT NULL,

  upi_app TEXT, -- 'gpay', 'phonepe', 'paytm', 'bhim', 'bank'
  upi_id TEXT, -- Vendor/provider UPI ID
  transaction_id TEXT, -- UTR number
  screenshot_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upi_details_entity ON payment_upi_details(entity_type, entity_id);

-- ============================================
-- PART 14: RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_wastage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_upi_details ENABLE ROW LEVEL SECURITY;

-- Product Categories policies
CREATE POLICY "Users can view product categories in their workspace"
  ON product_categories FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage product categories in their workspace"
  ON product_categories FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Products policies
CREATE POLICY "Users can view products in their workspace"
  ON products FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage products in their workspace"
  ON products FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Daily Spend policies
CREATE POLICY "Users can view daily spend in their workspace"
  ON daily_spend FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage daily spend in their workspace"
  ON daily_spend FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Bill Categories policies
CREATE POLICY "Users can view bill categories in their workspace"
  ON bill_categories FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage bill categories in their workspace"
  ON bill_categories FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Vendors policies
CREATE POLICY "Users can view vendors in their workspace"
  ON vendors FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage vendors in their workspace"
  ON vendors FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Bill Payments policies
CREATE POLICY "Users can view bill payments in their workspace"
  ON bill_payments FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage bill payments in their workspace"
  ON bill_payments FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Service Categories policies
CREATE POLICY "Users can view service categories in their workspace"
  ON service_categories FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage service categories in their workspace"
  ON service_categories FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Service Providers policies
CREATE POLICY "Users can view service providers in their workspace"
  ON service_providers FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage service providers in their workspace"
  ON service_providers FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Service Payments policies
CREATE POLICY "Users can view service payments in their workspace"
  ON service_payments FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage service payments in their workspace"
  ON service_payments FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Price History policies
CREATE POLICY "Users can view price history in their workspace"
  ON product_price_history FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage price history in their workspace"
  ON product_price_history FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Expense Budgets policies
CREATE POLICY "Users can view expense budgets in their workspace"
  ON expense_budgets FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage expense budgets in their workspace"
  ON expense_budgets FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Kitchen Wastage policies
CREATE POLICY "Users can view kitchen wastage in their workspace"
  ON kitchen_wastage FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage kitchen wastage in their workspace"
  ON kitchen_wastage FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- UPI Details policies (linked to parent entity)
CREATE POLICY "Users can view UPI details for their expenses"
  ON payment_upi_details FOR SELECT
  USING (
    (entity_type = 'daily_spend' AND entity_id IN (SELECT id FROM daily_spend WHERE workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)))
    OR (entity_type = 'bill_payment' AND entity_id IN (SELECT id FROM bill_payments WHERE workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)))
    OR (entity_type = 'service_payment' AND entity_id IN (SELECT id FROM service_payments WHERE workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)))
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can manage UPI details for their expenses"
  ON payment_upi_details FOR ALL
  USING (
    (entity_type = 'daily_spend' AND entity_id IN (SELECT id FROM daily_spend WHERE workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)))
    OR (entity_type = 'bill_payment' AND entity_id IN (SELECT id FROM bill_payments WHERE workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)))
    OR (entity_type = 'service_payment' AND entity_id IN (SELECT id FROM service_payments WHERE workspace_id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true)))
    OR is_platform_admin(auth.uid())
  );

-- ============================================
-- PART 15: SEED DEFAULT CATEGORIES
-- ============================================

-- Function to seed default categories for a workspace
CREATE OR REPLACE FUNCTION seed_expense_categories(p_workspace_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Product Categories (Kitchen)
  INSERT INTO product_categories (workspace_id, name, name_hi, sort_order, created_by)
  VALUES
    (p_workspace_id, 'Vegetables', 'सब्जियां', 1, p_user_id),
    (p_workspace_id, 'Fruits', 'फल', 2, p_user_id),
    (p_workspace_id, 'Grocery', 'किराना', 3, p_user_id),
    (p_workspace_id, 'Dairy', 'दूध/डेयरी', 4, p_user_id),
    (p_workspace_id, 'Meat & Poultry', 'मांस', 5, p_user_id),
    (p_workspace_id, 'Spices', 'मसाले', 6, p_user_id),
    (p_workspace_id, 'Beverages', 'पेय पदार्थ', 7, p_user_id),
    (p_workspace_id, 'Snacks', 'नाश्ता', 8, p_user_id),
    (p_workspace_id, 'Cleaning', 'सफाई', 9, p_user_id),
    (p_workspace_id, 'Other', 'अन्य', 99, p_user_id)
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Bill Categories
  INSERT INTO bill_categories (workspace_id, name, name_hi, sort_order, is_recurring, typical_due_day, created_by)
  VALUES
    (p_workspace_id, 'Electricity', 'बिजली', 1, true, 10, p_user_id),
    (p_workspace_id, 'Water', 'पानी', 2, true, 15, p_user_id),
    (p_workspace_id, 'Gas/Cylinder', 'गैस/सिलेंडर', 3, false, NULL, p_user_id),
    (p_workspace_id, 'Internet', 'इंटरनेट', 4, true, 5, p_user_id),
    (p_workspace_id, 'Maintenance', 'रखरखाव', 5, true, 1, p_user_id),
    (p_workspace_id, 'Insurance', 'बीमा', 6, true, NULL, p_user_id),
    (p_workspace_id, 'Property Tax', 'संपत्ति कर', 7, false, NULL, p_user_id),
    (p_workspace_id, 'Other', 'अन्य', 99, false, NULL, p_user_id)
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Service Categories
  INSERT INTO service_categories (workspace_id, name, name_hi, sort_order, default_tds_section, default_tds_rate, created_by)
  VALUES
    (p_workspace_id, 'Electrician', 'इलेक्ट्रीशियन', 1, '194C', 1.00, p_user_id),
    (p_workspace_id, 'Plumber', 'प्लंबर', 2, '194C', 1.00, p_user_id),
    (p_workspace_id, 'Carpenter', 'बढ़ई', 3, '194C', 1.00, p_user_id),
    (p_workspace_id, 'AC Service', 'एसी सर्विस', 4, '194C', 1.00, p_user_id),
    (p_workspace_id, 'Cleaning', 'सफाई', 5, NULL, NULL, p_user_id),
    (p_workspace_id, 'Pest Control', 'कीट नियंत्रण', 6, '194C', 1.00, p_user_id),
    (p_workspace_id, 'Painting', 'पेंटिंग', 7, '194C', 1.00, p_user_id),
    (p_workspace_id, 'Security', 'सुरक्षा', 8, '194C', 1.00, p_user_id),
    (p_workspace_id, 'Other', 'अन्य', 99, NULL, NULL, p_user_id)
  ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 16: TRIGGER FOR PRICE HISTORY
-- ============================================

-- Auto-record price history when daily_spend is created
CREATE OR REPLACE FUNCTION record_product_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    INSERT INTO product_price_history (
      workspace_id,
      product_id,
      recorded_date,
      rate,
      vendor_name,
      quantity,
      source_type,
      source_id
    ) VALUES (
      NEW.workspace_id,
      NEW.product_id,
      NEW.spend_date,
      NEW.rate,
      NEW.vendor_name,
      NEW.quantity,
      'daily_spend',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_price_history
  AFTER INSERT ON daily_spend
  FOR EACH ROW
  EXECUTE FUNCTION record_product_price();

-- ============================================
-- PART 17: HELPER FUNCTIONS
-- ============================================

-- Get fiscal year for a date (Indian: April-March)
CREATE OR REPLACE FUNCTION get_indian_fiscal_year(p_date DATE)
RETURNS TEXT AS $$
BEGIN
  IF EXTRACT(MONTH FROM p_date) >= 4 THEN
    RETURN EXTRACT(YEAR FROM p_date)::TEXT || '-' || (EXTRACT(YEAR FROM p_date) + 1 - 2000)::TEXT;
  ELSE
    RETURN (EXTRACT(YEAR FROM p_date) - 1)::TEXT || '-' || (EXTRACT(YEAR FROM p_date) - 2000)::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get quarter for a date (Indian fiscal: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
CREATE OR REPLACE FUNCTION get_indian_fiscal_quarter(p_date DATE)
RETURNS INTEGER AS $$
DECLARE
  month_num INTEGER;
BEGIN
  month_num := EXTRACT(MONTH FROM p_date);
  CASE
    WHEN month_num BETWEEN 4 AND 6 THEN RETURN 1;
    WHEN month_num BETWEEN 7 AND 9 THEN RETURN 2;
    WHEN month_num BETWEEN 10 AND 12 THEN RETURN 3;
    ELSE RETURN 4;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update service provider job count
CREATE OR REPLACE FUNCTION update_provider_job_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.provider_id IS NOT NULL THEN
    UPDATE service_providers
    SET total_jobs = total_jobs + 1
    WHERE id = NEW.provider_id;
  ELSIF TG_OP = 'DELETE' AND OLD.provider_id IS NOT NULL THEN
    UPDATE service_providers
    SET total_jobs = GREATEST(total_jobs - 1, 0)
    WHERE id = OLD.provider_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_job_count
  AFTER INSERT OR DELETE ON service_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_job_count();

-- ============================================
-- PART 18: ADD AUDIT TRIGGERS
-- ============================================

-- Add tables to audit system
DO $$
DECLARE
  tables_to_audit TEXT[] := ARRAY[
    'products',
    'daily_spend',
    'vendors',
    'bill_payments',
    'service_providers',
    'service_payments',
    'expense_budgets',
    'kitchen_wastage'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_audit LOOP
    -- Check if trigger already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'audit_trigger_' || t
    ) THEN
      EXECUTE format('
        CREATE TRIGGER audit_trigger_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION log_audit_event()
      ', t, t);
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON TABLE products IS 'Product master for kitchen/daily spend tracking';
COMMENT ON TABLE daily_spend IS 'Daily kitchen/grocery purchases';
COMMENT ON TABLE vendors IS 'Vendor directory for bill payments';
COMMENT ON TABLE bill_payments IS 'Utility and recurring bill payments';
COMMENT ON TABLE service_providers IS 'Service provider directory (electricians, plumbers, etc.)';
COMMENT ON TABLE service_payments IS 'Service provider payments with TDS tracking';
COMMENT ON TABLE expense_budgets IS 'Budget tracking for expense categories';
COMMENT ON TABLE kitchen_wastage IS 'Food wastage tracking for kitchen';
