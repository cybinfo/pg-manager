/**
 * Expense Data Migration Script for newgreenhigh@gmail.com
 * Migrates Daily Spend Tracker data from Google Sheets CSVs
 *
 * Usage: npx tsx scripts/migrate-expense-data.ts
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { parse } from "csv-parse/sync"
import { config } from "dotenv"

config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const CSV_DIR = "/tmp/expense_migration"
const CLIENT_EMAIL = "newgreenhigh@gmail.com"
const OWNER_ID = "ffaaa66a-91ae-43c8-8c34-9d4ea1624628"
const WORKSPACE_ID = "c33a03b7-989c-4618-b394-10ca454b42a7"

const BILL_CATEGORY_MAP: Record<string, string> = {
  "bharat gas": "Utilities - Gas", "indian gas": "Utilities - Gas",
  "indianoil": "Utilities - Gas", "lndianoil": "Utilities - Gas",
  "indian bada cylinder": "Utilities - Gas",
  "bses": "Utilities - Electricity", "country light": "Utilities - Electricity",
  "cooler current": "Utilities - Electricity",
  "ani internet": "Utilities - Internet", "udaan": "Utilities - Internet",
  "aalu pyaj tamatar": "Groceries - Vegetables",
  "masale wala": "Groceries - Spices",
  "kirana store": "Groceries - General", "easy bazar": "Groceries - General",
  "b3 cinema hall smart bazar": "Groceries - General",
  "hira sweets": "Groceries - Sweets", "shagun sweetss": "Groceries - Sweets",
  "shreya sweets": "Groceries - Sweets", "om bikaner": "Groceries - Sweets",
  "electronic dukaan": "Shopping - Electronics", "whirlpool ac": "Shopping - Electronics",
  "geyser": "Shopping - Electronics",
  "pent ki dukan": "Shopping - Clothing",
  "gada ki dukan": "Shopping - Bedding",
  "raj mandir": "Entertainment",
  "flipkart": "E-commerce",
  "pemplet": "Printing & Stationery",
  "metoro shit": "Transport", "saikil nai": "Transport",
}

function readCSV(filename: string): Record<string, string>[] {
  const raw = readFileSync(`${CSV_DIR}/${filename}`, "utf-8")
  return parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true })
}

function normalizeDate(val: string): string | null {
  if (!val || val.trim() === "") return null
  const s = val.trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const dm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dm) return `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`
  return null
}

function normalizeFloat(val: string): number {
  if (!val || val.trim() === "") return 0
  return parseFloat(val.trim()) || 0
}

function normalizeInt(val: string): number {
  if (!val || val.trim() === "") return 0
  return parseInt(val.trim()) || 0
}

function normalizePaymentMode(mode: string): string {
  const m = (mode || "").toLowerCase().trim()
  if (m.includes("upi") || m.includes("google") || m.includes("phonepe")) return "upi"
  if (m.includes("paytm")) return "upi"
  if (m.includes("bank") || m.includes("transfer") || m.includes("neft")) return "bank_transfer"
  if (m.includes("card")) return "card"
  if (m.includes("cheque") || m.includes("check")) return "bank_transfer"
  return "cash"
}

function cleanName(name: string): string {
  if (!name || name.trim() === "") return ""
  return name.trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

async function migrate() {
  console.log("🚀 Starting Expense Data Migration...")
  console.log(`   Owner: ${CLIENT_EMAIL} (${OWNER_ID})`)
  console.log(`   Workspace: ${WORKSPACE_ID}\n`)

  // ── Step 1: Clean existing expense data ──
  console.log("🧹 Cleaning existing expense data...")
  const expenseTables = [
    "misc_transactions", "service_payments", "bill_payments", "daily_spend",
    "service_providers", "vendors", "products",
    "misc_transaction_categories", "service_categories", "product_categories", "bill_categories",
  ]
  for (const tbl of expenseTables) {
    const { error } = await supabase.from(tbl).delete().eq("workspace_id", WORKSPACE_ID)
    if (error) console.warn(`  Warning: cleanup ${tbl}: ${error.message}`)
    else console.log(`  ✓ Cleared ${tbl}`)
  }

  // ── Step 2: Migrate Bill Categories (hardcoded) ──
  console.log("\n📂 Migrating bill categories...")
  const billCats = [
    { name: "Utilities - Gas", description: "LPG cylinders and gas connections", sort_order: 1 },
    { name: "Utilities - Electricity", description: "Electricity bills and related", sort_order: 2 },
    { name: "Utilities - Internet", description: "Internet and broadband", sort_order: 3 },
    { name: "Groceries - Vegetables", description: "Fresh vegetables", sort_order: 10 },
    { name: "Groceries - Spices", description: "Spices and seasonings", sort_order: 11 },
    { name: "Groceries - General", description: "General grocery items", sort_order: 12 },
    { name: "Groceries - Sweets", description: "Sweets and snacks shops", sort_order: 13 },
    { name: "Shopping - Electronics", description: "Electronic items and appliances", sort_order: 20 },
    { name: "Shopping - Clothing", description: "Clothing and apparel", sort_order: 21 },
    { name: "Shopping - Appliances", description: "Home appliances", sort_order: 22 },
    { name: "Shopping - Bedding", description: "Bedding and linens", sort_order: 23 },
    { name: "Entertainment", description: "Movies, outings, etc.", sort_order: 30 },
    { name: "E-commerce", description: "Online shopping platforms", sort_order: 31 },
    { name: "Printing & Stationery", description: "Printing, pamphlets, stationery", sort_order: 32 },
    { name: "Transport", description: "Metro, auto, transport", sort_order: 33 },
    { name: "Other", description: "Miscellaneous bills", sort_order: 99 },
  ]

  const billCatNameToId = new Map<string, string>()
  for (const bc of billCats) {
    const { data, error } = await supabase.from("bill_categories")
      .insert({ workspace_id: WORKSPACE_ID, ...bc })
      .select("id").single()
    if (!error && data) billCatNameToId.set(bc.name, data.id)
  }
  console.log(`  ✓ ${billCatNameToId.size} bill categories`)

  // ── Step 3: Product Categories ──
  console.log("\n📂 Migrating product categories...")
  const productCatsRaw = readCSV("product_categories.csv")
  const productCatIdToName = new Map<string, string>()
  const productCatNameToDbId = new Map<string, string>()

  for (const row of productCatsRaw) {
    const name = cleanName(row.categoryName)
    if (!name) continue
    productCatIdToName.set(row.categoryId, name)
    const { data, error } = await supabase.from("product_categories")
      .insert({ workspace_id: WORKSPACE_ID, name, sort_order: 0, is_active: true })
      .select("id").single()
    if (!error && data) productCatNameToDbId.set(name, data.id)
  }
  console.log(`  ✓ ${productCatNameToDbId.size} product categories`)

  // ── Step 4: Service Categories ──
  console.log("\n📂 Migrating service categories...")
  const serviceCatsRaw = readCSV("service_categories.csv")
  const serviceCatIdToName = new Map<string, string>()
  const serviceCatNameToDbId = new Map<string, string>()

  for (const [idx, row] of serviceCatsRaw.entries()) {
    const name = cleanName(row.serviceCategory)
    if (!name) continue
    serviceCatIdToName.set(row.serviceCategoryId, name)
    const { data, error } = await supabase.from("service_categories")
      .insert({ workspace_id: WORKSPACE_ID, name, sort_order: idx + 1, is_active: true })
      .select("id").single()
    if (!error && data) serviceCatNameToDbId.set(name, data.id)
  }
  console.log(`  ✓ ${serviceCatNameToDbId.size} service categories`)

  // ── Step 5: Misc Transaction Categories ──
  console.log("\n📂 Migrating misc transaction categories...")
  const miscCatsRaw = readCSV("misc_categories.csv")
  const miscCatNameToDbId = new Map<string, string>()

  for (const [idx, row] of miscCatsRaw.entries()) {
    const name = cleanName(row.otherMoneyCategory)
    if (!name) continue
    const { data, error } = await supabase.from("misc_transaction_categories")
      .insert({ workspace_id: WORKSPACE_ID, name, default_type: "both", sort_order: idx + 1, is_active: true })
      .select("id").single()
    if (!error && data) miscCatNameToDbId.set(name, data.id)
  }
  console.log(`  ✓ ${miscCatNameToDbId.size} misc transaction categories`)

  // ── Step 6: Products ──
  console.log("\n📂 Migrating products...")
  const productsRaw = readCSV("products.csv")
  const productIdToName = new Map<string, string>()

  let productCount = 0
  for (const row of productsRaw) {
    const name = cleanName(row.productName)
    if (!name) continue
    productIdToName.set(row.productId, name)
    const catName = productCatIdToName.get(row.categoryId)
    const catDbId = catName ? productCatNameToDbId.get(catName) : null
    const { error } = await supabase.from("products")
      .insert({ workspace_id: WORKSPACE_ID, name, category_id: catDbId || null })
    if (!error) productCount++
  }
  console.log(`  ✓ ${productCount} products`)

  // ── Step 7: Vendors ──
  console.log("\n📂 Migrating vendors (bill categories)...")
  const vendorCatsRaw = readCSV("bill_categories.csv")
  const vendorIdToName = new Map<string, string>()
  const vendorNameToDbId = new Map<string, string>()

  for (const row of vendorCatsRaw) {
    const name = cleanName(row.billCategoryName)
    if (!name) continue
    vendorIdToName.set(row.billCategoryID, name)
    const catName = BILL_CATEGORY_MAP[name.toLowerCase()] || "Other"
    const catDbId = billCatNameToId.get(catName)
    const { data, error } = await supabase.from("vendors")
      .insert({ workspace_id: WORKSPACE_ID, name, category_id: catDbId || null })
      .select("id").single()
    if (!error && data) vendorNameToDbId.set(name, data.id)
  }
  console.log(`  ✓ ${vendorNameToDbId.size} vendors`)

  // ── Step 8: Service Providers ──
  console.log("\n📂 Migrating service providers...")
  const providersRaw = readCSV("service_providers.csv")
  const providerIdToName = new Map<string, string>()
  const providerNameToDbId = new Map<string, string>()

  for (const row of providersRaw) {
    const name = cleanName(row.personName)
    if (!name) continue
    providerIdToName.set(row.servicePersonId, name)
    const { data, error } = await supabase.from("service_providers")
      .insert({ workspace_id: WORKSPACE_ID, name, notes: row.comments || null })
      .select("id").single()
    if (!error && data) providerNameToDbId.set(name, data.id)
  }
  console.log(`  ✓ ${providerNameToDbId.size} service providers`)

  // ── Step 9: Daily Spend ──
  console.log("\n💰 Migrating daily spend transactions...")
  const dailySpendRaw = readCSV("daily_spend.csv")
  const BATCH = 100
  let dsCount = 0
  let dsSkipped = 0

  for (let i = 0; i < dailySpendRaw.length; i += BATCH) {
    const batch = dailySpendRaw.slice(i, i + BATCH)
    const rows = []
    for (const row of batch) {
      const date = normalizeDate(row.dateOfPayment)
      const total = normalizeFloat(row.totalPrice)
      if (!date || total <= 0) { dsSkipped++; continue }
      const productName = productIdToName.get(row.productId) || `Product-${row.productId}`
      const catId = row.productId ? productsRaw.find((p) => p.productId === row.productId)?.categoryId : null
      const catName = catId ? productCatIdToName.get(catId) || null : null
      rows.push({
        workspace_id: WORKSPACE_ID,
        spend_date: date,
        product_name: productName,
        category_name: catName || null,
        quantity: normalizeFloat(row.productQuantity) || 1,
        unit: row.productWeightMeasurementType || "Pcs",
        rate: normalizeFloat(row.perProductWeight),
        total,
        payment_mode: normalizePaymentMode(row.modeOfPayment),
      })
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("daily_spend").insert(rows)
      if (error) { dsSkipped += rows.length; console.warn(`  Batch ${i}: ${error.message}`) }
      else dsCount += rows.length
    }
    process.stdout.write(`  Daily Spend: ${Math.min(i + BATCH, dailySpendRaw.length)}/${dailySpendRaw.length}\r`)
  }
  console.log(`\n  ✓ ${dsCount} daily spend records (${dsSkipped} skipped)`)

  // ── Step 10: Bill Payments ──
  console.log("\n💰 Migrating bill payments...")
  const billPayRaw = readCSV("paid_bills.csv")
  let bpCount = 0; let bpSkipped = 0

  for (let i = 0; i < billPayRaw.length; i += BATCH) {
    const batch = billPayRaw.slice(i, i + BATCH)
    const rows = []
    for (const row of batch) {
      const date = normalizeDate(row.dateOfPayment)
      const amount = normalizeFloat(row.totalPrice)
      if (!date || amount <= 0) { bpSkipped++; continue }
      const vendorName = vendorIdToName.get(row.billCategory) || `Vendor-${row.billCategory}`
      const catName = BILL_CATEGORY_MAP[vendorName.toLowerCase()] || "Other"
      const catDbId = billCatNameToId.get(catName)
      rows.push({
        workspace_id: WORKSPACE_ID,
        vendor_name: vendorName,
        category_id: catDbId || null,
        category_name: catName,
        bill_amount: amount,
        paid_amount: amount,
        payment_date: date,
        payment_mode: normalizePaymentMode(row.modeOfPayment),
        status: "paid",
        notes: row.comments || null,
      })
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("bill_payments").insert(rows)
      if (error) { bpSkipped += rows.length; console.warn(`  Batch ${i}: ${error.message}`) }
      else bpCount += rows.length
    }
    process.stdout.write(`  Bill Payments: ${Math.min(i + BATCH, billPayRaw.length)}/${billPayRaw.length}\r`)
  }
  console.log(`\n  ✓ ${bpCount} bill payments (${bpSkipped} skipped)`)

  // ── Step 11: Service Payments ──
  console.log("\n💰 Migrating service payments...")
  const servicePayRaw = readCSV("service_payments.csv")
  let spCount = 0; let spSkipped = 0

  for (let i = 0; i < servicePayRaw.length; i += BATCH) {
    const batch = servicePayRaw.slice(i, i + BATCH)
    const rows = []
    for (const row of batch) {
      const date = normalizeDate(row.dateOfPayment)
      const amount = normalizeFloat(row.paidAmount)
      if (!date || amount <= 0) { spSkipped++; continue }
      const catName = serviceCatIdToName.get(row.serviceCategoryId) || "Other"
      const providerName = providerIdToName.get(row.servicePersonId) || `Provider-${row.servicePersonId}`
      rows.push({
        workspace_id: WORKSPACE_ID,
        provider_name: providerName,
        category_name: catName,
        service_date: date,
        description: row.comments || "Service payment",
        gross_amount: amount,
        net_amount: amount,
        payment_mode: normalizePaymentMode(row.modeOfPayment),
      })
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("service_payments").insert(rows)
      if (error) { spSkipped += rows.length; console.warn(`  Batch ${i}: ${error.message}`) }
      else spCount += rows.length
    }
    process.stdout.write(`  Service Payments: ${Math.min(i + BATCH, servicePayRaw.length)}/${servicePayRaw.length}\r`)
  }
  console.log(`\n  ✓ ${spCount} service payments (${spSkipped} skipped)`)

  // ── Step 12: Misc Transactions (Money In + Out) ──
  console.log("\n💰 Migrating misc transactions...")
  const moneyInRaw = readCSV("money_in.csv")
  const moneyOutRaw = readCSV("money_out.csv")
  let miscCount = 0; let miscSkipped = 0

  async function insertMisc(rows: Record<string, unknown>[], label: string) {
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await supabase.from("misc_transactions").insert(batch)
      if (error) { miscSkipped += batch.length; console.warn(`  ${label} batch ${i}: ${error.message}`) }
      else miscCount += batch.length
      process.stdout.write(`  ${label}: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`)
    }
    console.log(`  ✓ ${label} done`)
  }

  const inRows: Record<string, unknown>[] = []
  for (const row of moneyInRaw) {
    const date = normalizeDate(row.receivedDate)
    const amount = normalizeFloat(row.amount)
    if (!date || amount <= 0) { miscSkipped++; continue }
    const catName = cleanName(row.otherMoneyCategory)
    inRows.push({
      workspace_id: WORKSPACE_ID,
      transaction_type: "in",
      category_name: catName || null,
      person_name: cleanName(row.personName) || null,
      amount,
      transaction_date: date,
      payment_mode: normalizePaymentMode(row.modeOfPayment),
      legacy_id: `MI-${row.otherMoneyInId || miscCount}`,
    })
  }

  const outRows: Record<string, unknown>[] = []
  for (const row of moneyOutRaw) {
    const date = normalizeDate(row.paidDate)
    const amount = normalizeFloat(row.amount)
    if (!date || amount <= 0) { miscSkipped++; continue }
    const catName = cleanName(row.otherMoneyCategory)
    outRows.push({
      workspace_id: WORKSPACE_ID,
      transaction_type: "out",
      category_name: catName || null,
      person_name: cleanName(row.personName) || null,
      amount,
      transaction_date: date,
      payment_mode: normalizePaymentMode(row.modeOfPayment),
      legacy_id: `MO-${row.otherMoneyOutId || miscCount}`,
    })
  }

  await insertMisc(inRows, "Money In")
  await insertMisc(outRows, "Money Out")
  console.log(`  ✓ ${miscCount} misc transactions total (${miscSkipped} skipped)`)

  // ── Summary ──
  console.log("\n" + "=".repeat(60))
  console.log("✅ EXPENSE MIGRATION COMPLETE")
  console.log("=".repeat(60))
  console.log(`  Bill Categories:          ${billCatNameToId.size}`)
  console.log(`  Product Categories:       ${productCatNameToDbId.size}`)
  console.log(`  Service Categories:       ${serviceCatNameToDbId.size}`)
  console.log(`  Misc Categories:          ${miscCatNameToDbId.size}`)
  console.log(`  Products:                 ${productCount}`)
  console.log(`  Vendors:                  ${vendorNameToDbId.size}`)
  console.log(`  Service Providers:        ${providerNameToDbId.size}`)
  console.log(`  Daily Spend:              ${dsCount}`)
  console.log(`  Bill Payments:            ${bpCount}`)
  console.log(`  Service Payments:         ${spCount}`)
  console.log(`  Misc Transactions:        ${miscCount}`)
  console.log("=".repeat(60))
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
