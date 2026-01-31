#!/usr/bin/env python3
"""
Execute Migration via Supabase REST API
Converts SQL INSERTs to JSON and bulk inserts via REST API
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing environment variables")
    exit(1)

WORKSPACE_ID = "c33a03b7-989c-4618-b394-10ca454b42a7"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=ignore-duplicates,return=minimal'
}

def insert_records(table, records, batch_size=500):
    """Insert records in batches"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    total = len(records)
    inserted = 0
    errors = 0

    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        response = requests.post(url, headers=headers, json=batch)

        if response.status_code in [200, 201]:
            inserted += len(batch)
        else:
            print(f"  ❌ Error: {response.text[:200]}")
            errors += len(batch)

    return inserted, errors


def run_migration():
    print("🚀 Starting Migration for newgreenhigh@gmail.com")
    print(f"   Workspace: {WORKSPACE_ID}\n")

    results = []

    # 1. Bill Categories
    print("📦 Inserting Bill Categories...")
    bill_categories = [
        {"workspace_id": WORKSPACE_ID, "name": "Utilities - Gas", "name_hi": "गैस", "description": "LPG cylinders and gas connections", "sort_order": 1, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Utilities - Electricity", "name_hi": "बिजली", "description": "Electricity bills and related", "sort_order": 2, "is_recurring": True},
        {"workspace_id": WORKSPACE_ID, "name": "Utilities - Internet", "name_hi": "इंटरनेट", "description": "Internet and broadband", "sort_order": 3, "is_recurring": True},
        {"workspace_id": WORKSPACE_ID, "name": "Groceries - Vegetables", "name_hi": "सब्जी", "description": "Fresh vegetables", "sort_order": 10, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Groceries - Spices", "name_hi": "मसाले", "description": "Spices and seasonings", "sort_order": 11, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Groceries - General", "name_hi": "किराना", "description": "General grocery items", "sort_order": 12, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Groceries - Sweets", "name_hi": "मिठाई", "description": "Sweets and snacks shops", "sort_order": 13, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Shopping - Electronics", "name_hi": "इलेक्ट्रॉनिक्स", "description": "Electronic items and appliances", "sort_order": 20, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Shopping - Clothing", "name_hi": "कपड़े", "description": "Clothing and apparel", "sort_order": 21, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Shopping - Appliances", "name_hi": "उपकरण", "description": "Home appliances", "sort_order": 22, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Shopping - Bedding", "name_hi": "बिस्तर", "description": "Bedding and linens", "sort_order": 23, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Entertainment", "name_hi": "मनोरंजन", "description": "Movies, outings, etc.", "sort_order": 30, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "E-commerce", "name_hi": "ऑनलाइन", "description": "Online shopping platforms", "sort_order": 31, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Printing & Stationery", "name_hi": "प्रिंटिंग", "description": "Printing, pamphlets, stationery", "sort_order": 32, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Transport", "name_hi": "परिवहन", "description": "Metro, auto, transport", "sort_order": 33, "is_recurring": False},
        {"workspace_id": WORKSPACE_ID, "name": "Other", "name_hi": "अन्य", "description": "Miscellaneous bills", "sort_order": 99, "is_recurring": False},
    ]
    ins, err = insert_records('bill_categories', bill_categories)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Bill Categories', ins, err))

    # 2. Product Categories from Excel
    print("\n📦 Inserting Product Categories...")
    import pandas as pd
    xl = pd.ExcelFile("docs/Daily Spend Tracker (1).xlsx")

    cat_df = pd.read_excel(xl, 'categoryList')
    product_categories = []
    for idx, row in cat_df.iterrows():
        name = str(row.get('categoryName', '')).strip().title()
        if name:
            product_categories.append({
                "workspace_id": WORKSPACE_ID,
                "name": name,
                "sort_order": idx + 1,
                "is_active": True
            })
    ins, err = insert_records('product_categories', product_categories)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Product Categories', ins, err))

    # 3. Service Categories
    print("\n📦 Inserting Service Categories...")
    svc_cat_df = pd.read_excel(xl, 'serviceCategoryList')
    service_categories = []
    for idx, row in svc_cat_df.iterrows():
        name = str(row.get('serviceCategory', '')).strip().title()
        if name:
            service_categories.append({
                "workspace_id": WORKSPACE_ID,
                "name": name,
                "sort_order": idx + 1,
                "is_active": True
            })
    ins, err = insert_records('service_categories', service_categories)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Service Categories', ins, err))

    # 4. Misc Transaction Categories
    print("\n📦 Inserting Misc Transaction Categories...")
    misc_cat_df = pd.read_excel(xl, 'otherMoneyCategory')
    misc_categories = []
    for idx, row in misc_cat_df.iterrows():
        name = str(row.get('otherMoneyCategory', '')).strip().title()
        if name:
            misc_categories.append({
                "workspace_id": WORKSPACE_ID,
                "name": name,
                "default_type": "both",
                "sort_order": idx + 1,
                "is_active": True
            })
    ins, err = insert_records('misc_transaction_categories', misc_categories)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Misc Categories', ins, err))

    # Get category IDs for products
    print("\n📦 Fetching category IDs...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_categories?workspace_id=eq.{WORKSPACE_ID}&select=id,name",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    cat_id_map = {r['name'].lower(): r['id'] for r in response.json()}

    # 5. Products
    print("\n📦 Inserting Products...")
    prod_df = pd.read_excel(xl, 'productList')
    cat_df = pd.read_excel(xl, 'categoryList')

    # Build category ID to name map from Excel
    excel_cat_map = {}
    for _, row in cat_df.iterrows():
        cid = row.get('categoryId')
        cname = str(row.get('categoryName', '')).strip().title()
        if cid and cname:
            excel_cat_map[cid] = cname

    products = []
    for idx, row in prod_df.iterrows():
        name = str(row.get('productName', '')).strip().title()
        cat_id_excel = row.get('categoryId')
        cat_name = excel_cat_map.get(cat_id_excel, '')
        db_cat_id = cat_id_map.get(cat_name.lower()) if cat_name else None

        if name:
            products.append({
                "workspace_id": WORKSPACE_ID,
                "name": name,
                "category_id": db_cat_id,
                "is_active": True
            })
    ins, err = insert_records('products', products)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Products', ins, err))

    # Get bill category IDs
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/bill_categories?workspace_id=eq.{WORKSPACE_ID}&select=id,name",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    bill_cat_id_map = {r['name'].lower(): r['id'] for r in response.json()}

    # 6. Vendors
    print("\n📦 Inserting Vendors...")
    vendor_df = pd.read_excel(xl, 'billCategoryList')

    # Vendor to category mapping
    VENDOR_CAT_MAP = {
        'bharat gas': 'Utilities - Gas', 'indian gas': 'Utilities - Gas', 'indianoil': 'Utilities - Gas', 'lndianoil': 'Utilities - Gas', 'indian bada cylinder': 'Utilities - Gas',
        'bses': 'Utilities - Electricity', 'country light': 'Utilities - Electricity', 'cooler current': 'Utilities - Electricity',
        'ani internet': 'Utilities - Internet', 'udaan': 'Utilities - Internet',
        'aalu pyaj tamatar': 'Groceries - Vegetables',
        'masale wala': 'Groceries - Spices',
        'kirana store': 'Groceries - General', 'easy bazar': 'Groceries - General', 'b3 cinema hall smart bazar': 'Groceries - General',
        'hira sweets': 'Groceries - Sweets', 'shagun sweetss': 'Groceries - Sweets', 'shreya sweets': 'Groceries - Sweets', 'om bikaner': 'Groceries - Sweets',
        'electronic dukaan': 'Shopping - Electronics', 'whirlpool ac': 'Shopping - Electronics', 'geyser': 'Shopping - Electronics',
        'pent ki dukan': 'Shopping - Clothing',
        'gada ki dukan': 'Shopping - Bedding',
        'raj mandir': 'Entertainment',
        'flipkart': 'E-commerce',
        'pemplet': 'Printing & Stationery',
        'metoro shit': 'Transport', 'saikil nai': 'Transport',
    }

    vendors = []
    seen = set()
    for _, row in vendor_df.iterrows():
        name = str(row.get('billCategoryName', '')).strip().title()
        if name and name.lower() not in seen:
            seen.add(name.lower())
            cat_name = VENDOR_CAT_MAP.get(name.lower(), 'Other')
            cat_id = bill_cat_id_map.get(cat_name.lower())
            vendors.append({
                "workspace_id": WORKSPACE_ID,
                "name": name,
                "category_id": cat_id,
                "is_active": True
            })
    ins, err = insert_records('vendors', vendors)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Vendors', ins, err))

    # Get service category IDs
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/service_categories?workspace_id=eq.{WORKSPACE_ID}&select=id,name",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    svc_cat_id_map = {r['name'].lower(): r['id'] for r in response.json()}

    # 7. Service Providers
    print("\n📦 Inserting Service Providers...")
    provider_df = pd.read_excel(xl, 'servicePersonList')
    providers = []
    for _, row in provider_df.iterrows():
        name = str(row.get('personName', '')).strip().title()
        notes = row.get('comments')
        if name:
            providers.append({
                "workspace_id": WORKSPACE_ID,
                "name": name,
                "notes": str(notes) if pd.notna(notes) else None,
                "is_active": True
            })
    ins, err = insert_records('service_providers', providers)
    print(f"   ✓ {ins} inserted, {err} errors")
    results.append(('Service Providers', ins, err))

    # Print summary
    print("\n" + "=" * 60)
    print("MASTER DATA MIGRATION COMPLETE")
    print("=" * 60)
    total_ins = sum(r[1] for r in results)
    total_err = sum(r[2] for r in results)
    for name, ins, err in results:
        print(f"  {name:<25} {ins:>5} inserted, {err:>3} errors")
    print("-" * 60)
    print(f"  {'TOTAL':<25} {total_ins:>5} inserted, {total_err:>3} errors")
    print("=" * 60)

    return results


if __name__ == "__main__":
    run_migration()
