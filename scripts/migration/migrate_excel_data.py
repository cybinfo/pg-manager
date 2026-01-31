#!/usr/bin/env python3
"""
Data Migration Script for newgreenhigh@gmail.com
Reads Excel data and generates SQL INSERT statements

Usage:
  python migrate_excel_data.py --workspace-id <WORKSPACE_ID>

Requirements:
  pip install pandas openpyxl
"""

import pandas as pd
import argparse
import os
from datetime import datetime

# Configuration
EXCEL_FILE = "docs/Daily Spend Tracker (1).xlsx"
OUTPUT_DIR = "scripts/migration/output"

# Bill Category Mapping (vendor name -> parent category)
BILL_CATEGORY_MAPPING = {
    # Utilities - Gas
    'bharat gas': 'Utilities - Gas',
    'indian gas': 'Utilities - Gas',
    'indianoil': 'Utilities - Gas',
    'lndianoil': 'Utilities - Gas',
    'indian bada cylinder': 'Utilities - Gas',

    # Utilities - Electricity
    'bses': 'Utilities - Electricity',
    'country light': 'Utilities - Electricity',
    'cooler current': 'Utilities - Electricity',

    # Utilities - Internet
    'ani internet': 'Utilities - Internet',
    'udaan': 'Utilities - Internet',

    # Groceries - Vegetables
    'aalu pyaj tamatar': 'Groceries - Vegetables',

    # Groceries - Spices
    'masale wala': 'Groceries - Spices',

    # Groceries - General
    'kirana store': 'Groceries - General',
    'easy bazar': 'Groceries - General',
    'b3 cinema hall smart bazar': 'Groceries - General',

    # Groceries - Sweets
    'hira sweets': 'Groceries - Sweets',
    'shagun sweetss': 'Groceries - Sweets',
    'shreya sweets': 'Groceries - Sweets',
    'om bikaner': 'Groceries - Sweets',

    # Shopping - Electronics
    'electronic dukaan': 'Shopping - Electronics',
    'whirlpool ac': 'Shopping - Electronics',
    'geyser': 'Shopping - Electronics',

    # Shopping - Clothing
    'pent ki dukan': 'Shopping - Clothing',

    # Shopping - Bedding
    'gada ki dukan': 'Shopping - Bedding',

    # Entertainment
    'raj mandir': 'Entertainment',

    # E-commerce
    'flipkart': 'E-commerce',

    # Printing & Stationery
    'pemplet': 'Printing & Stationery',

    # Transport
    'metoro shit': 'Transport',
    'saikil nai': 'Transport',
}


def escape_sql(value):
    """Escape single quotes for SQL"""
    if pd.isna(value) or value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return "NULL"
        return str(value)
    return "'" + str(value).replace("'", "''").strip() + "'"


def parse_date(date_val):
    """Parse date from various formats"""
    if pd.isna(date_val):
        return None
    if isinstance(date_val, datetime):
        return date_val.strftime('%Y-%m-%d')
    if isinstance(date_val, pd.Timestamp):
        return date_val.strftime('%Y-%m-%d')
    if isinstance(date_val, str):
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S']:
            try:
                return datetime.strptime(date_val.split()[0], fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
    return None


def clean_name(name):
    """Standardize names - proper case, trim"""
    if pd.isna(name) or name is None:
        return None
    name = str(name).strip()
    if name.isupper() and len(name) <= 5:
        return name
    return name.title()


def get_category_for_vendor(vendor_name):
    """Get category name for a vendor"""
    if pd.isna(vendor_name):
        return 'Other'
    vendor_lower = str(vendor_name).lower().strip()
    return BILL_CATEGORY_MAPPING.get(vendor_lower, 'Other')


def generate_bill_categories_sql(workspace_id):
    """Generate SQL for bill categories"""
    categories = [
        ('Utilities - Gas', 'गैस', 'LPG cylinders and gas connections', 1, False),
        ('Utilities - Electricity', 'बिजली', 'Electricity bills and related', 2, True),
        ('Utilities - Internet', 'इंटरनेट', 'Internet and broadband', 3, True),
        ('Groceries - Vegetables', 'सब्जी', 'Fresh vegetables', 10, False),
        ('Groceries - Spices', 'मसाले', 'Spices and seasonings', 11, False),
        ('Groceries - General', 'किराना', 'General grocery items', 12, False),
        ('Groceries - Sweets', 'मिठाई', 'Sweets and snacks shops', 13, False),
        ('Shopping - Electronics', 'इलेक्ट्रॉनिक्स', 'Electronic items and appliances', 20, False),
        ('Shopping - Clothing', 'कपड़े', 'Clothing and apparel', 21, False),
        ('Shopping - Appliances', 'उपकरण', 'Home appliances', 22, False),
        ('Shopping - Bedding', 'बिस्तर', 'Bedding and linens', 23, False),
        ('Entertainment', 'मनोरंजन', 'Movies, outings, etc.', 30, False),
        ('E-commerce', 'ऑनलाइन', 'Online shopping platforms', 31, False),
        ('Printing & Stationery', 'प्रिंटिंग', 'Printing, pamphlets, stationery', 32, False),
        ('Transport', 'परिवहन', 'Metro, auto, transport', 33, False),
        ('Other', 'अन्य', 'Miscellaneous bills', 99, False),
    ]

    sql = f"-- Bill Categories for workspace {workspace_id}\n"
    sql += "INSERT INTO bill_categories (workspace_id, name, name_hi, description, sort_order, is_recurring)\nVALUES\n"

    values = []
    for name, name_hi, desc, sort, is_recurring in categories:
        values.append(f"  ('{workspace_id}', {escape_sql(name)}, {escape_sql(name_hi)}, {escape_sql(desc)}, {sort}, {str(is_recurring).lower()})")

    sql += ",\n".join(values)
    sql += "\nON CONFLICT (workspace_id, name) DO NOTHING;\n"

    return sql


def migrate_product_categories(df, workspace_id):
    """Migrate product categories from categoryList sheet"""
    sql = f"-- Product Categories\n"
    sql += "INSERT INTO product_categories (workspace_id, name, sort_order, is_active)\nVALUES\n"

    values = []
    for idx, row in df.iterrows():
        name = clean_name(row.get('categoryName'))
        if name:
            values.append(f"  ('{workspace_id}', {escape_sql(name)}, {idx + 1}, true)")

    sql += ",\n".join(values)
    sql += "\nON CONFLICT (workspace_id, name) DO NOTHING;\n"
    return sql, len(values)


def migrate_products(df, cat_df, workspace_id):
    """Migrate products from productList sheet"""
    # Create category ID to name mapping
    cat_map = {}
    for _, row in cat_df.iterrows():
        cat_id = row.get('categoryId')
        cat_name = clean_name(row.get('categoryName'))
        if cat_id and cat_name:
            cat_map[cat_id] = cat_name

    sql = f"-- Products ({len(df)} records)\n"
    sql += f"""INSERT INTO products (workspace_id, name, category_id)
SELECT
  '{workspace_id}' as workspace_id,
  v.name,
  pc.id as category_id
FROM (VALUES
"""

    values = []
    for idx, row in df.iterrows():
        name = clean_name(row.get('productName'))
        cat_id = row.get('categoryId')
        cat_name = cat_map.get(cat_id)

        if name:
            values.append(f"  ({escape_sql(name)}, {escape_sql(cat_name)})")

    sql += ",\n".join(values)
    sql += f""") AS v(name, category_name)
LEFT JOIN product_categories pc ON pc.workspace_id = '{workspace_id}' AND pc.name = v.category_name
ON CONFLICT (workspace_id, name) DO NOTHING;
"""
    return sql, len(values)


def migrate_vendors(df, workspace_id):
    """Migrate vendors from billCategoryList sheet (these are actually vendor names)"""
    sql = f"-- Vendors ({len(df)} records)\n"
    sql += f"""INSERT INTO vendors (workspace_id, name, category_id)
SELECT
  '{workspace_id}' as workspace_id,
  v.name,
  bc.id as category_id
FROM (VALUES
"""

    values = []
    vendors_seen = set()
    for idx, row in df.iterrows():
        name = clean_name(row.get('billCategoryName'))
        if name and name.lower() not in vendors_seen:
            vendors_seen.add(name.lower())
            category = get_category_for_vendor(name)
            values.append(f"  ({escape_sql(name)}, {escape_sql(category)})")

    sql += ",\n".join(values)
    sql += f""") AS v(name, category_name)
LEFT JOIN bill_categories bc ON bc.workspace_id = '{workspace_id}' AND bc.name = v.category_name
ON CONFLICT (workspace_id, name) DO NOTHING;
"""
    return sql, len(values)


def migrate_service_categories(df, workspace_id):
    """Migrate service categories from serviceCategoryList sheet"""
    sql = f"-- Service Categories ({len(df)} records)\n"
    sql += "INSERT INTO service_categories (workspace_id, name, sort_order, is_active)\nVALUES\n"

    values = []
    for idx, row in df.iterrows():
        name = clean_name(row.get('serviceCategory'))
        if name:
            values.append(f"  ('{workspace_id}', {escape_sql(name)}, {idx + 1}, true)")

    sql += ",\n".join(values)
    sql += "\nON CONFLICT (workspace_id, name) DO NOTHING;\n"
    return sql, len(values)


def migrate_service_providers(df, workspace_id):
    """Migrate service providers from servicePersonList sheet"""
    sql = f"-- Service Providers ({len(df)} records)\n"
    sql += "INSERT INTO service_providers (workspace_id, name, notes)\nVALUES\n"

    values = []
    for idx, row in df.iterrows():
        name = clean_name(row.get('personName'))
        comments = row.get('comments')
        if name:
            values.append(f"  ('{workspace_id}', {escape_sql(name)}, {escape_sql(comments) if not pd.isna(comments) else 'NULL'})")

    sql += ",\n".join(values)
    sql += "\nON CONFLICT (workspace_id, name, category_id) DO NOTHING;\n"
    return sql, len(values)


def migrate_misc_categories(df, workspace_id):
    """Migrate misc transaction categories from otherMoneyCategory sheet"""
    sql = f"-- Misc Transaction Categories ({len(df)} records)\n"
    sql += "INSERT INTO misc_transaction_categories (workspace_id, name, default_type, sort_order, is_active)\nVALUES\n"

    values = []
    for idx, row in df.iterrows():
        name = clean_name(row.get('otherMoneyCategory'))
        if name:
            values.append(f"  ('{workspace_id}', {escape_sql(name)}, 'both', {idx + 1}, true)")

    sql += ",\n".join(values)
    sql += "\nON CONFLICT (workspace_id, name) DO NOTHING;\n"
    return sql, len(values)


def migrate_daily_spend(df, products_df, cat_df, workspace_id):
    """Migrate daily spend transactions from dailySpendList sheet"""
    # Create mappings
    product_map = {}
    for _, row in products_df.iterrows():
        pid = row.get('productId')
        pname = clean_name(row.get('productName'))
        cat_id = row.get('categoryId')
        if pid and pname:
            product_map[pid] = {'name': pname, 'category_id': cat_id}

    cat_map = {}
    for _, row in cat_df.iterrows():
        cat_id = row.get('categoryId')
        cat_name = clean_name(row.get('categoryName'))
        if cat_id and cat_name:
            cat_map[cat_id] = cat_name

    sql = f"-- Daily Spend Transactions ({len(df)} records)\n\n"
    total_amount = 0
    batch_size = 500

    for batch_num in range((len(df) // batch_size) + 1):
        start_idx = batch_num * batch_size
        end_idx = min((batch_num + 1) * batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]

        if len(batch_df) == 0:
            continue

        sql += f"-- Batch {batch_num + 1} (rows {start_idx + 1} to {end_idx})\n"
        sql += f"""INSERT INTO daily_spend (workspace_id, spend_date, product_name, category_name, quantity, unit, rate, total, payment_mode)
VALUES
"""

        values = []
        for idx, row in batch_df.iterrows():
            date = parse_date(row.get('dateOfPayment'))
            product_id = row.get('productId')
            quantity = row.get('productQuantity', 1)
            unit = row.get('productWeightMeasurementType', 'Pcs')
            rate = row.get('perProductWeight', 0)
            total = row.get('totalPrice', 0)
            payment_mode = str(row.get('modeOfPayment', 'cash')).lower()

            # Map payment modes
            if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'credit']:
                payment_mode = 'cash'

            # Get product info
            product_info = product_map.get(product_id, {})
            product_name = product_info.get('name', f'Product-{product_id}')
            category_name = cat_map.get(product_info.get('category_id'))

            if date:
                try:
                    total_val = float(total) if not pd.isna(total) else 0
                    quantity_val = float(quantity) if not pd.isna(quantity) else 1
                    rate_val = float(rate) if not pd.isna(rate) else 0
                    unit_str = str(unit) if not pd.isna(unit) else 'Pcs'

                    if total_val > 0:
                        total_amount += total_val
                        values.append(f"  ('{workspace_id}', '{date}', {escape_sql(product_name)}, {escape_sql(category_name)}, {quantity_val}, {escape_sql(unit_str)}, {rate_val}, {total_val}, '{payment_mode}')")
                except (ValueError, TypeError) as e:
                    continue

        if values:
            sql += ",\n".join(values) + ";\n\n"

    sql += f"-- Daily Spend Total: ₹{total_amount:,.2f}\n"
    return sql, len(df), total_amount


def migrate_bill_payments(df, vendor_df, workspace_id):
    """Migrate bill payments from paidBillsList sheet"""
    # Create vendor name to ID mapping from billCategoryList
    vendor_map = {}
    for _, row in vendor_df.iterrows():
        vid = row.get('billCategoryID')
        vname = clean_name(row.get('billCategoryName'))
        if vid and vname:
            vendor_map[vid] = vname

    sql = f"-- Bill Payment Transactions ({len(df)} records)\n\n"
    total_amount = 0
    batch_size = 500

    for batch_num in range((len(df) // batch_size) + 1):
        start_idx = batch_num * batch_size
        end_idx = min((batch_num + 1) * batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]

        if len(batch_df) == 0:
            continue

        sql += f"-- Batch {batch_num + 1} (rows {start_idx + 1} to {end_idx})\n"
        sql += f"""INSERT INTO bill_payments (workspace_id, vendor_name, category_id, category_name, bill_amount, paid_amount, payment_date, payment_mode, status, notes)
SELECT
  '{workspace_id}' as workspace_id,
  v.vendor_name,
  bc.id as category_id,
  v.category_name,
  v.amount,
  v.amount,
  v.payment_date::DATE,
  v.payment_mode,
  'paid',
  v.notes
FROM (VALUES
"""

        values = []
        for idx, row in batch_df.iterrows():
            date = parse_date(row.get('dateOfPayment'))
            vendor_id = row.get('billCategory')
            amount = row.get('totalPrice', 0)
            comments = row.get('comments')
            payment_mode = str(row.get('modeOfPayment', 'cash')).lower()

            if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'dd']:
                payment_mode = 'cash'

            vendor_name = vendor_map.get(vendor_id, f'Vendor-{vendor_id}')
            category_name = get_category_for_vendor(vendor_name)

            if date:
                try:
                    amount_val = float(amount) if not pd.isna(amount) else 0
                    if amount_val > 0:
                        total_amount += amount_val
                        values.append(f"  ({escape_sql(vendor_name)}, {escape_sql(category_name)}, {amount_val}, '{date}', '{payment_mode}', {escape_sql(comments) if not pd.isna(comments) else 'NULL'})")
                except (ValueError, TypeError):
                    continue

        if values:
            sql += ",\n".join(values)
            sql += f""") AS v(vendor_name, category_name, amount, payment_date, payment_mode, notes)
LEFT JOIN bill_categories bc ON bc.workspace_id = '{workspace_id}' AND bc.name = v.category_name;

"""

    sql += f"-- Bill Payments Total: ₹{total_amount:,.2f}\n"
    return sql, len(df), total_amount


def migrate_service_payments(df, cat_df, provider_df, workspace_id):
    """Migrate service payments from paidForService sheet"""
    # Create mappings
    cat_map = {}
    for _, row in cat_df.iterrows():
        cid = row.get('serviceCategoryId')
        cname = clean_name(row.get('serviceCategory'))
        if cid and cname:
            cat_map[cid] = cname

    provider_map = {}
    for _, row in provider_df.iterrows():
        pid = row.get('servicePersonId')
        pname = clean_name(row.get('personName'))
        if pid and pname:
            provider_map[pid] = pname

    sql = f"-- Service Payment Transactions ({len(df)} records)\n\n"
    total_amount = 0
    batch_size = 500

    for batch_num in range((len(df) // batch_size) + 1):
        start_idx = batch_num * batch_size
        end_idx = min((batch_num + 1) * batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]

        if len(batch_df) == 0:
            continue

        sql += f"-- Batch {batch_num + 1} (rows {start_idx + 1} to {end_idx})\n"
        sql += f"""INSERT INTO service_payments (workspace_id, provider_name, category_name, service_date, description, gross_amount, net_amount, payment_mode)
VALUES
"""

        values = []
        for idx, row in batch_df.iterrows():
            date = parse_date(row.get('dateOfPayment'))
            cat_id = row.get('serviceCategoryId')
            provider_id = row.get('servicePersonId')
            amount = row.get('paidAmount', 0)
            comments = row.get('comments')
            payment_mode = str(row.get('modeOfPayment', 'cash')).lower()

            if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque']:
                payment_mode = 'cash'

            category_name = cat_map.get(cat_id, 'Other')
            provider_name = provider_map.get(provider_id, f'Provider-{provider_id}')
            description = str(comments) if not pd.isna(comments) else 'Service payment'

            if date:
                try:
                    amount_val = float(amount) if not pd.isna(amount) else 0
                    if amount_val > 0:
                        total_amount += amount_val
                        values.append(f"  ('{workspace_id}', {escape_sql(provider_name)}, {escape_sql(category_name)}, '{date}', {escape_sql(description)}, {amount_val}, {amount_val}, '{payment_mode}')")
                except (ValueError, TypeError):
                    continue

        if values:
            sql += ",\n".join(values) + ";\n\n"

    sql += f"-- Service Payments Total: ₹{total_amount:,.2f}\n"
    return sql, len(df), total_amount


def migrate_misc_transactions(df_in, df_out, workspace_id):
    """Migrate misc transactions from otherMoneyIn and otherMoneyOut sheets"""
    sql = ""
    total_in = 0
    total_out = 0
    count_in = 0
    count_out = 0

    # Money In
    if df_in is not None and len(df_in) > 0:
        sql += f"-- Misc Transactions - Money In ({len(df_in)} records)\n\n"

        batch_size = 500
        for batch_num in range((len(df_in) // batch_size) + 1):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(df_in))
            batch_df = df_in.iloc[start_idx:end_idx]

            if len(batch_df) == 0:
                continue

            sql += f"-- Batch {batch_num + 1} (rows {start_idx + 1} to {end_idx})\n"
            sql += f"""INSERT INTO misc_transactions (workspace_id, transaction_type, category_name, person_name, amount, transaction_date, payment_mode, legacy_id)
VALUES
"""

            values = []
            for idx, row in batch_df.iterrows():
                date = parse_date(row.get('receivedDate'))
                category = clean_name(row.get('otherMoneyCategory'))
                person = clean_name(row.get('personName'))
                amount = row.get('amount', 0)
                payment_mode = str(row.get('modeOfPayment', 'cash')).lower()
                legacy_id = f"MI-{row.get('otherMoneyInId', idx)}"

                if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'paytm', 'other']:
                    payment_mode = 'cash'

                if date:
                    try:
                        amount_val = float(amount) if not pd.isna(amount) else 0
                        if amount_val > 0:
                            total_in += amount_val
                            count_in += 1
                            values.append(f"  ('{workspace_id}', 'in', {escape_sql(category)}, {escape_sql(person)}, {amount_val}, '{date}', '{payment_mode}', {escape_sql(legacy_id)})")
                    except (ValueError, TypeError):
                        continue

            if values:
                sql += ",\n".join(values) + ";\n\n"

        sql += f"-- Money In Total: ₹{total_in:,.2f} ({count_in} records)\n\n"

    # Money Out
    if df_out is not None and len(df_out) > 0:
        sql += f"-- Misc Transactions - Money Out ({len(df_out)} records)\n\n"

        batch_size = 500
        for batch_num in range((len(df_out) // batch_size) + 1):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(df_out))
            batch_df = df_out.iloc[start_idx:end_idx]

            if len(batch_df) == 0:
                continue

            sql += f"-- Batch {batch_num + 1} (rows {start_idx + 1} to {end_idx})\n"
            sql += f"""INSERT INTO misc_transactions (workspace_id, transaction_type, category_name, person_name, amount, transaction_date, payment_mode, legacy_id)
VALUES
"""

            values = []
            for idx, row in batch_df.iterrows():
                date = parse_date(row.get('paidDate'))
                category = clean_name(row.get('otherMoneyCategory'))
                person = clean_name(row.get('personName'))
                amount = row.get('amount', 0)
                payment_mode = str(row.get('modeOfPayment', 'cash')).lower()
                legacy_id = f"MO-{row.get('otherMoneyOutId', idx)}"

                if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'paytm', 'other']:
                    payment_mode = 'cash'

                if date:
                    try:
                        amount_val = float(amount) if not pd.isna(amount) else 0
                        if amount_val > 0:
                            total_out += amount_val
                            count_out += 1
                            values.append(f"  ('{workspace_id}', 'out', {escape_sql(category)}, {escape_sql(person)}, {amount_val}, '{date}', '{payment_mode}', {escape_sql(legacy_id)})")
                    except (ValueError, TypeError):
                        continue

            if values:
                sql += ",\n".join(values) + ";\n\n"

        sql += f"-- Money Out Total: ₹{total_out:,.2f} ({count_out} records)\n\n"

    return sql, count_in, count_out, total_in, total_out


def main():
    parser = argparse.ArgumentParser(description='Migrate Excel data to SQL')
    parser.add_argument('--workspace-id', required=True, help='Target workspace UUID')
    parser.add_argument('--excel', default=EXCEL_FILE, help='Path to Excel file')
    args = parser.parse_args()

    workspace_id = args.workspace_id
    excel_file = args.excel

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Reading Excel file: {excel_file}")
    xl = pd.ExcelFile(excel_file)
    print(f"Sheets found: {xl.sheet_names}")

    summary = []

    # 1. Master Data
    print("\n=== Processing Master Data ===")

    # Bill Categories (hardcoded mapping)
    bill_cat_sql = generate_bill_categories_sql(workspace_id)
    with open(f"{OUTPUT_DIR}/01_bill_categories.sql", 'w') as f:
        f.write(bill_cat_sql)
    print(f"✓ Bill categories generated (16 categories)")

    # Product Categories
    if 'categoryList' in xl.sheet_names:
        df = pd.read_excel(xl, 'categoryList')
        sql, count = migrate_product_categories(df, workspace_id)
        with open(f"{OUTPUT_DIR}/02_product_categories.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Product categories: {count} records")
        summary.append(('Product Categories', count, 0))

    # Service Categories
    if 'serviceCategoryList' in xl.sheet_names:
        df = pd.read_excel(xl, 'serviceCategoryList')
        sql, count = migrate_service_categories(df, workspace_id)
        with open(f"{OUTPUT_DIR}/03_service_categories.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Service categories: {count} records")
        summary.append(('Service Categories', count, 0))

    # Misc Transaction Categories
    if 'otherMoneyCategory' in xl.sheet_names:
        df = pd.read_excel(xl, 'otherMoneyCategory')
        sql, count = migrate_misc_categories(df, workspace_id)
        with open(f"{OUTPUT_DIR}/04_misc_categories.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Misc categories: {count} records")
        summary.append(('Misc Categories', count, 0))

    # Products
    if 'productList' in xl.sheet_names and 'categoryList' in xl.sheet_names:
        df = pd.read_excel(xl, 'productList')
        cat_df = pd.read_excel(xl, 'categoryList')
        sql, count = migrate_products(df, cat_df, workspace_id)
        with open(f"{OUTPUT_DIR}/05_products.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Products: {count} records")
        summary.append(('Products', count, 0))

    # Vendors (from billCategoryList)
    if 'billCategoryList' in xl.sheet_names:
        df = pd.read_excel(xl, 'billCategoryList')
        sql, count = migrate_vendors(df, workspace_id)
        with open(f"{OUTPUT_DIR}/06_vendors.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Vendors: {count} records")
        summary.append(('Vendors', count, 0))

    # Service Providers
    if 'servicePersonList' in xl.sheet_names:
        df = pd.read_excel(xl, 'servicePersonList')
        sql, count = migrate_service_providers(df, workspace_id)
        with open(f"{OUTPUT_DIR}/07_service_providers.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Service providers: {count} records")
        summary.append(('Service Providers', count, 0))

    # 2. Transaction Data
    print("\n=== Processing Transaction Data ===")

    # Daily Spend
    if 'dailySpendList' in xl.sheet_names and 'productList' in xl.sheet_names and 'categoryList' in xl.sheet_names:
        df = pd.read_excel(xl, 'dailySpendList')
        products_df = pd.read_excel(xl, 'productList')
        cat_df = pd.read_excel(xl, 'categoryList')
        sql, count, total = migrate_daily_spend(df, products_df, cat_df, workspace_id)
        with open(f"{OUTPUT_DIR}/08_daily_spend.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Daily Spend: {count} records, ₹{total:,.2f}")
        summary.append(('Daily Spend', count, total))

    # Bill Payments
    if 'paidBillsList' in xl.sheet_names and 'billCategoryList' in xl.sheet_names:
        df = pd.read_excel(xl, 'paidBillsList')
        vendor_df = pd.read_excel(xl, 'billCategoryList')
        sql, count, total = migrate_bill_payments(df, vendor_df, workspace_id)
        with open(f"{OUTPUT_DIR}/09_bill_payments.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Bill Payments: {count} records, ₹{total:,.2f}")
        summary.append(('Bill Payments', count, total))

    # Service Payments
    if 'paidForService' in xl.sheet_names:
        df = pd.read_excel(xl, 'paidForService')
        cat_df = pd.read_excel(xl, 'serviceCategoryList') if 'serviceCategoryList' in xl.sheet_names else pd.DataFrame()
        provider_df = pd.read_excel(xl, 'servicePersonList') if 'servicePersonList' in xl.sheet_names else pd.DataFrame()
        sql, count, total = migrate_service_payments(df, cat_df, provider_df, workspace_id)
        with open(f"{OUTPUT_DIR}/10_service_payments.sql", 'w') as f:
            f.write(sql)
        print(f"✓ Service Payments: {count} records, ₹{total:,.2f}")
        summary.append(('Service Payments', count, total))

    # Misc Transactions
    df_in = pd.read_excel(xl, 'otherMoneyIn') if 'otherMoneyIn' in xl.sheet_names else None
    df_out = pd.read_excel(xl, 'otherMoneyOut') if 'otherMoneyOut' in xl.sheet_names else None

    sql, count_in, count_out, total_in, total_out = migrate_misc_transactions(df_in, df_out, workspace_id)
    with open(f"{OUTPUT_DIR}/11_misc_transactions.sql", 'w') as f:
        f.write(sql)
    print(f"✓ Misc Money In: {count_in} records, ₹{total_in:,.2f}")
    print(f"✓ Misc Money Out: {count_out} records, ₹{total_out:,.2f}")
    summary.append(('Misc Money In', count_in, total_in))
    summary.append(('Misc Money Out', count_out, total_out))

    # Print summary
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"{'Data Type':<25} {'Records':>10} {'Amount (₹)':>15}")
    print("-" * 60)

    total_records = 0
    total_amount = 0
    for name, count, amount in summary:
        print(f"{name:<25} {count:>10,} {amount:>15,.2f}")
        total_records += count
        total_amount += amount

    print("-" * 60)
    print(f"{'TOTAL':<25} {total_records:>10,} {total_amount:>15,.2f}")
    print("=" * 60)

    print(f"\nSQL files generated in: {OUTPUT_DIR}/")
    print("\nExpected totals from Excel:")
    print(f"  Daily Spend:      ₹14,75,099.00")
    print(f"  Bill Payments:    ₹27,00,173.00")
    print(f"  Service Payments: ₹4,95,327.00")
    print(f"  Misc Money In:    ₹87,90,632.20")
    print(f"  Misc Money Out:   ₹55,63,646.20")


if __name__ == "__main__":
    main()
