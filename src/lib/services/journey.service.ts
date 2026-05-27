/**
 * Journey Service
 *
 * Aggregates tenant lifecycle data from multiple tables into a unified
 * journey timeline with analytics and predictive insights.
 *
 * Architecture:
 * - Parallel queries for optimal performance
 * - Event normalization layer for consistent output
 * - Uses transformJoin for Supabase JOIN handling
 */

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { logger, extractErrorMeta } from "@/lib/logger"
import {
  TenantJourneyData,
  GetTenantJourneyOptions,
  createDefaultAnalytics,
  createDefaultFinancialSummary,
  createDefaultInsights,
} from "@/types/journey.types"
import {
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
} from "./types"
import { getNowISO } from "@/lib/date-helpers"
import { TenantRecord } from "./journey/types"
import { fetchAndNormalizeEvents } from "./journey/fetchers"
import {
  calculateAnalytics,
  calculateFinancialSummary,
  calculatePredictiveInsights,
  findLinkedVisitors,
} from "./journey/analytics"

export { getEventCategoryCounts } from "./journey/analytics"

const journeyLogger = logger.child("journey")

export async function getTenantJourney(
  options: GetTenantJourneyOptions
): Promise<ServiceResult<TenantJourneyData>> {
  const {
    tenant_id,
    workspace_id: _workspace_id,
    events_limit = 50,
    events_offset = 0,
    event_categories,
    date_from,
    date_to,
    include_analytics = true,
    include_financial = true,
    include_insights = true,
    include_visitors = true,
  } = options

  try {
    const supabase = createClient()

    // Step 1: Fetch base tenant data
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .select(`
        id, name, status, phone, email, photo_url, check_in_date,
        notice_date, expected_exit_date, monthly_rent,
        security_deposit, security_deposit_paid, advance_amount, advance_balance,
        agreement_signed, police_verification_status, phone_numbers,
        property:properties(id, name, address),
        room:rooms(id, room_number, room_type)
      `)
      .eq("id", tenant_id)
      .single()

    if (tenantError || !tenantData) {
      return createErrorResult(
        createServiceError(ERROR_CODES.NOT_FOUND, "Tenant not found", { tenant_id })
      )
    }

    const tenant = {
      ...tenantData,
      property: transformJoin(tenantData.property),
      room: transformJoin(tenantData.room),
    } as unknown as TenantRecord

    // Step 2: Execute parallel data fetches
    const [
      eventsResult,
      analyticsResult,
      financialResult,
      visitorsResult,
    ] = await Promise.all([
      fetchAndNormalizeEvents(supabase, tenant_id, {
        limit: events_limit,
        offset: events_offset,
        categories: event_categories,
        date_from,
        date_to,
      }),
      include_analytics ? calculateAnalytics(supabase, tenant_id, tenant) : Promise.resolve(createDefaultAnalytics()),
      include_financial ? calculateFinancialSummary(supabase, tenant_id, tenant) : Promise.resolve(createDefaultFinancialSummary()),
      include_visitors ? findLinkedVisitors(supabase, tenant_id, tenant) : Promise.resolve({ linked: [], preTenant: [] }),
    ])

    // Step 3: Calculate predictive insights (depends on analytics)
    const insightsResult = include_insights
      ? calculatePredictiveInsights(tenant, analyticsResult, financialResult)
      : createDefaultInsights()

    return createSuccessResult({
      tenant_id,
      tenant_name: tenant.name,
      tenant_status: tenant.status,
      tenant_photo_url: tenant.photo_url,
      check_in_date: tenant.check_in_date,
      property: tenant.property || undefined,
      room: tenant.room || undefined,
      events: eventsResult.events,
      total_events: eventsResult.total,
      has_more_events: eventsResult.total > events_offset + events_limit,
      analytics: analyticsResult,
      financial: financialResult,
      insights: insightsResult,
      linked_visitors: visitorsResult.linked,
      pre_tenant_visits: visitorsResult.preTenant,
      generated_at: getNowISO(),
    })
  } catch (error) {
    journeyLogger.error("Error fetching tenant journey", extractErrorMeta(error))
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to fetch tenant journey", { error })
    )
  }
}
