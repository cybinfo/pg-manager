#!/usr/bin/env python3
"""
Execute Transaction Data Migration via Supabase REST API
Migrates: Daily Spend, Bill Payments, Service Payments, Misc Transactions
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
WORKSPACE_ID = "c33a03b7-989c-4618-b394-10ca454b42a7"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}


def parse_date(date_val):
    if pd.isna(date_val):
        return None
    if isinstance(date_val, (datetime, pd.Timestamp)):
        return date_val.strftime('%Y-%m-%d')
    return None


def clean_name(name):
    if pd.isna(name) or name is None:
        return None
    return str(name).strip().title()


def insert_batch(table, records, batch_num, total_batches):
    """Insert a batch of records"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    response = requests.post(url, headers=headers, json=records)

    if response.status_code in [200, 201]:
        print(f"   Batch {batch_num}/{total_batches}: {len(records)} records ✓")
        return len(records), 0
    else:
        print(f"   Batch {batch_num}/{total_batches}: Error - {response.text[:100]}")
        return 0, len(records)


def migrate_daily_spend():
    print("\n📦 Migrating Daily Spend...")

    xl = pd.ExcelFile("docs/Daily Spend Tracker (1).xlsx")
    df = pd.read_excel(xl, 'dailySpendList')
    prod_df = pd.read_excel(xl, 'productList')
    cat_df = pd.read_excel(xl, 'categoryList')

    # Build mappings
    product_map = {}
    for _, row in prod_df.iterrows():
        pid = row.get('productId')
        pname = clean_name(row.get('productName'))
        cat_id = row.get('categoryId')
        if pid and pname:
            product_map[pid] = {'name': pname, 'category_id': cat_id}

    cat_map = {}
    for _, row in cat_df.iterrows():
        cid = row.get('categoryId')
        cname = clean_name(row.get('categoryName'))
        if cid and cname:
            cat_map[cid] = cname

    # Process records
    records = []
    total_amount = 0

    for _, row in df.iterrows():
        date = parse_date(row.get('dateOfPayment'))
        product_id = row.get('productId')
        quantity = row.get('productQuantity', 1)
        unit = row.get('productWeightMeasurementType', 'Pcs')
        rate = row.get('perProductWeight', 0)
        total = row.get('totalPrice', 0)
        payment_mode = str(row.get('modeOfPayment', 'cash')).lower()

        if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'credit']:
            payment_mode = 'cash'

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
                    records.append({
                        "workspace_id": WORKSPACE_ID,
                        "spend_date": date,
                        "product_name": product_name,
                        "category_name": category_name,
                        "quantity": quantity_val,
                        "unit": unit_str,
                        "rate": rate_val,
                        "total": total_val,
                        "payment_mode": payment_mode
                    })
            except:
                continue

    # Insert in batches
    batch_size = 500
    total_inserted = 0
    total_errors = 0
    total_batches = (len(records) // batch_size) + 1

    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        ins, err = insert_batch('daily_spend', batch, batch_num, total_batches)
        total_inserted += ins
        total_errors += err

    print(f"   Total: {total_inserted} inserted, {total_errors} errors")
    print(f"   Amount: ₹{total_amount:,.2f}")
    return total_inserted, total_errors, total_amount


def migrate_bill_payments():
    print("\n📦 Migrating Bill Payments...")

    xl = pd.ExcelFile("docs/Daily Spend Tracker (1).xlsx")
    df = pd.read_excel(xl, 'paidBillsList')
    vendor_df = pd.read_excel(xl, 'billCategoryList')

    # Get bill category IDs
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/bill_categories?workspace_id=eq.{WORKSPACE_ID}&select=id,name",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    bill_cat_id_map = {r['name'].lower(): r['id'] for r in response.json()}

    # Vendor mapping
    vendor_map = {}
    for _, row in vendor_df.iterrows():
        vid = row.get('billCategoryID')
        vname = clean_name(row.get('billCategoryName'))
        if vid and vname:
            vendor_map[vid] = vname

    VENDOR_CAT_MAP = {
        'bharat gas': 'Utilities - Gas', 'indian gas': 'Utilities - Gas', 'indianoil': 'Utilities - Gas',
        'bses': 'Utilities - Electricity', 'country light': 'Utilities - Electricity',
        'ani internet': 'Utilities - Internet', 'udaan': 'Utilities - Internet',
        'aalu pyaj tamatar': 'Groceries - Vegetables',
        'masale wala': 'Groceries - Spices',
        'kirana store': 'Groceries - General', 'easy bazar': 'Groceries - General',
        'hira sweets': 'Groceries - Sweets', 'shagun sweetss': 'Groceries - Sweets', 'om bikaner': 'Groceries - Sweets',
        'electronic dukaan': 'Shopping - Electronics', 'whirlpool ac': 'Shopping - Electronics',
        'pent ki dukan': 'Shopping - Clothing',
        'gada ki dukan': 'Shopping - Bedding',
        'raj mandir': 'Entertainment',
        'flipkart': 'E-commerce',
    }

    records = []
    total_amount = 0

    for _, row in df.iterrows():
        date = parse_date(row.get('dateOfPayment'))
        vendor_id = row.get('billCategory')
        amount = row.get('totalPrice', 0)
        comments = row.get('comments')
        payment_mode = str(row.get('modeOfPayment', 'cash')).lower()

        if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'dd']:
            payment_mode = 'cash'

        vendor_name = vendor_map.get(vendor_id, f'Vendor-{vendor_id}')
        cat_name = VENDOR_CAT_MAP.get(vendor_name.lower() if vendor_name else '', 'Other')
        cat_id = bill_cat_id_map.get(cat_name.lower())

        if date:
            try:
                amount_val = float(amount) if not pd.isna(amount) else 0
                if amount_val > 0:
                    total_amount += amount_val
                    records.append({
                        "workspace_id": WORKSPACE_ID,
                        "vendor_name": vendor_name,
                        "category_id": cat_id,
                        "category_name": cat_name,
                        "bill_amount": amount_val,
                        "paid_amount": amount_val,
                        "payment_date": date,
                        "payment_mode": payment_mode,
                        "status": "paid",
                        "notes": str(comments) if pd.notna(comments) else None
                    })
            except:
                continue

    batch_size = 500
    total_inserted = 0
    total_errors = 0
    total_batches = (len(records) // batch_size) + 1

    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        ins, err = insert_batch('bill_payments', batch, batch_num, total_batches)
        total_inserted += ins
        total_errors += err

    print(f"   Total: {total_inserted} inserted, {total_errors} errors")
    print(f"   Amount: ₹{total_amount:,.2f}")
    return total_inserted, total_errors, total_amount


def migrate_service_payments():
    print("\n📦 Migrating Service Payments...")

    xl = pd.ExcelFile("docs/Daily Spend Tracker (1).xlsx")
    df = pd.read_excel(xl, 'paidForService')
    cat_df = pd.read_excel(xl, 'serviceCategoryList')
    provider_df = pd.read_excel(xl, 'servicePersonList')

    # Build mappings
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

    records = []
    total_amount = 0

    for _, row in df.iterrows():
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
        description = str(comments) if pd.notna(comments) else 'Service payment'

        if date:
            try:
                amount_val = float(amount) if not pd.isna(amount) else 0
                if amount_val > 0:
                    total_amount += amount_val
                    records.append({
                        "workspace_id": WORKSPACE_ID,
                        "provider_name": provider_name,
                        "category_name": category_name,
                        "service_date": date,
                        "description": description,
                        "gross_amount": amount_val,
                        "net_amount": amount_val,
                        "payment_mode": payment_mode
                    })
            except:
                continue

    batch_size = 500
    total_inserted = 0
    total_errors = 0
    total_batches = (len(records) // batch_size) + 1

    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        ins, err = insert_batch('service_payments', batch, batch_num, total_batches)
        total_inserted += ins
        total_errors += err

    print(f"   Total: {total_inserted} inserted, {total_errors} errors")
    print(f"   Amount: ₹{total_amount:,.2f}")
    return total_inserted, total_errors, total_amount


def migrate_misc_transactions():
    print("\n📦 Migrating Misc Transactions...")

    xl = pd.ExcelFile("docs/Daily Spend Tracker (1).xlsx")
    df_in = pd.read_excel(xl, 'otherMoneyIn')
    df_out = pd.read_excel(xl, 'otherMoneyOut')

    records = []
    total_in = 0
    total_out = 0

    # Money In
    for _, row in df_in.iterrows():
        date = parse_date(row.get('receivedDate'))
        category = clean_name(row.get('otherMoneyCategory'))
        person = clean_name(row.get('personName'))
        amount = row.get('amount', 0)
        payment_mode = str(row.get('modeOfPayment', 'cash')).lower()
        legacy_id = f"MI-{row.get('otherMoneyInId', '')}"

        if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'paytm', 'other']:
            payment_mode = 'cash'

        if date:
            try:
                amount_val = float(amount) if not pd.isna(amount) else 0
                if amount_val > 0:
                    total_in += amount_val
                    records.append({
                        "workspace_id": WORKSPACE_ID,
                        "transaction_type": "in",
                        "category_name": category,
                        "person_name": person,
                        "amount": amount_val,
                        "transaction_date": date,
                        "payment_mode": payment_mode,
                        "legacy_id": legacy_id
                    })
            except:
                continue

    # Money Out
    for _, row in df_out.iterrows():
        date = parse_date(row.get('paidDate'))
        category = clean_name(row.get('otherMoneyCategory'))
        person = clean_name(row.get('personName'))
        amount = row.get('amount', 0)
        payment_mode = str(row.get('modeOfPayment', 'cash')).lower()
        legacy_id = f"MO-{row.get('otherMoneyOutId', '')}"

        if payment_mode not in ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'paytm', 'other']:
            payment_mode = 'cash'

        if date:
            try:
                amount_val = float(amount) if not pd.isna(amount) else 0
                if amount_val > 0:
                    total_out += amount_val
                    records.append({
                        "workspace_id": WORKSPACE_ID,
                        "transaction_type": "out",
                        "category_name": category,
                        "person_name": person,
                        "amount": amount_val,
                        "transaction_date": date,
                        "payment_mode": payment_mode,
                        "legacy_id": legacy_id
                    })
            except:
                continue

    batch_size = 500
    total_inserted = 0
    total_errors = 0
    total_batches = (len(records) // batch_size) + 1

    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        ins, err = insert_batch('misc_transactions', batch, batch_num, total_batches)
        total_inserted += ins
        total_errors += err

    print(f"   Total: {total_inserted} inserted, {total_errors} errors")
    print(f"   Money In: ₹{total_in:,.2f}")
    print(f"   Money Out: ₹{total_out:,.2f}")
    return total_inserted, total_errors, total_in + total_out


def main():
    print("🚀 Starting Transaction Data Migration for newgreenhigh@gmail.com")
    print(f"   Workspace: {WORKSPACE_ID}\n")

    results = []

    # Migrate each data type
    ins, err, amt = migrate_daily_spend()
    results.append(('Daily Spend', ins, err, amt))

    ins, err, amt = migrate_bill_payments()
    results.append(('Bill Payments', ins, err, amt))

    ins, err, amt = migrate_service_payments()
    results.append(('Service Payments', ins, err, amt))

    ins, err, amt = migrate_misc_transactions()
    results.append(('Misc Transactions', ins, err, amt))

    # Print summary
    print("\n" + "=" * 70)
    print("TRANSACTION DATA MIGRATION COMPLETE")
    print("=" * 70)
    print(f"{'Data Type':<25} {'Inserted':>10} {'Errors':>10} {'Amount (₹)':>18}")
    print("-" * 70)

    total_ins = 0
    total_err = 0
    total_amt = 0
    for name, ins, err, amt in results:
        print(f"{name:<25} {ins:>10,} {err:>10} {amt:>18,.2f}")
        total_ins += ins
        total_err += err
        total_amt += amt

    print("-" * 70)
    print(f"{'TOTAL':<25} {total_ins:>10,} {total_err:>10} {total_amt:>18,.2f}")
    print("=" * 70)

    print("\n📊 Expected totals from Excel:")
    print(f"   Daily Spend:      ₹14,75,099.00")
    print(f"   Bill Payments:    ₹27,00,173.00")
    print(f"   Service Payments: ₹4,95,327.00")
    print(f"   Misc Money In:    ₹87,90,632.20")
    print(f"   Misc Money Out:   ₹55,63,646.20")
    print(f"   TOTAL:            ₹1,90,24,877.40")


if __name__ == "__main__":
    main()
