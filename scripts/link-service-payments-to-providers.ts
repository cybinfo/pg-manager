/**
 * Link service_payments to service_providers by matching provider_name.
 *
 * Payments imported from old system have provider_name set but provider_id = NULL.
 * This script matches denormalized provider_name → providers.name and sets provider_id.
 * Also increments total_jobs on each provider.
 *
 * Usage:
 *   npx tsx scripts/link-service-payments-to-providers.ts
 *
 * Safe to re-run — skips payments that already have provider_id set.
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  // 1. Load all active service providers
  const { data: providers, error: provErr } = await supabase
    .from("service_providers")
    .select("id, name, total_jobs")
    .is("deleted_at", null)

  if (provErr || !providers?.length) {
    console.error("No providers found:", provErr?.message || "empty")
    process.exit(1)
  }

  console.log(`Found ${providers.length} service providers:`)
  providers.forEach((p) => console.log(`  [${p.id}] ${p.name} (${p.total_jobs || 0} jobs)`))

  // Build case-insensitive name → provider map
  const providerMap = new Map<string, { id: string; total_jobs: number }>()
  providers.forEach((p) => {
    providerMap.set(p.name.toLowerCase().trim(), { id: p.id, total_jobs: p.total_jobs || 0 })
  })

  // 2. Load all service_payments without provider_id
  const { data: payments, error: payErr } = await supabase
    .from("service_payments")
    .select("id, provider_name, provider_id")
    .is("provider_id", null)
    .range(0, 99999)

  if (payErr) {
    console.error("Failed to load service payments:", payErr.message)
    process.exit(1)
  }

  console.log(`\nService payments without provider_id: ${payments?.length || 0}`)

  if (!payments?.length) {
    console.log("Nothing to link — all payments already have provider_id.")
    return
  }

  // 3. Match and update
  let linked = 0
  let unmatched = 0
  const unmatchedNames = new Set<string>()
  const jobCountByProvider = new Map<string, number>()

  for (const payment of payments) {
    const key = (payment.provider_name || "").toLowerCase().trim()
    const provider = providerMap.get(key)

    if (!provider) {
      unmatched++
      if (payment.provider_name) unmatchedNames.add(payment.provider_name)
      continue
    }

    const { error } = await supabase
      .from("service_payments")
      .update({ provider_id: provider.id })
      .eq("id", payment.id)

    if (error) {
      console.error(`Failed to update payment ${payment.id}:`, error.message)
    } else {
      linked++
      jobCountByProvider.set(provider.id, (jobCountByProvider.get(provider.id) || 0) + 1)
    }
  }

  // 4. Update total_jobs on providers
  if (jobCountByProvider.size > 0) {
    console.log(`\nUpdating total_jobs on ${jobCountByProvider.size} providers...`)
    for (const [providerId, newJobs] of jobCountByProvider.entries()) {
      const current = providerMap.get(
        providers.find((p) => p.id === providerId)?.name.toLowerCase().trim() || ""
      )
      const updatedTotal = (current?.total_jobs || 0) + newJobs

      const { error } = await supabase
        .from("service_providers")
        .update({ total_jobs: updatedTotal })
        .eq("id", providerId)

      if (error) {
        console.error(`Failed to update total_jobs for provider ${providerId}:`, error.message)
      } else {
        const providerName = providers.find((p) => p.id === providerId)?.name
        console.log(`  ${providerName}: total_jobs = ${updatedTotal}`)
      }
    }
  }

  console.log(`\nResults:`)
  console.log(`  Linked:    ${linked}`)
  console.log(`  Unmatched: ${unmatched}`)

  if (unmatchedNames.size > 0) {
    console.log(`\nUnmatched provider names (check spelling):`)
    unmatchedNames.forEach((name) => console.log(`  "${name}"`))
  }

  console.log("\nDone.")
}

run().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
