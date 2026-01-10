"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { getTenantJourney, getEventCategoryCounts } from "@/lib/services/journey.service"
import {
  TenantJourneyData,
  JourneyFilters as JourneyFiltersType,
  DEFAULT_JOURNEY_FILTERS,
  EventCategoryType,
} from "@/types/journey.types"

// Journey components
import { JourneyHeader } from "@/components/journey/JourneyHeader"
import { JourneyAnalytics } from "@/components/journey/JourneyAnalytics"
import { FinancialSummary } from "@/components/journey/FinancialSummary"
import { PredictiveInsights, CompactInsights } from "@/components/journey/PredictiveInsights"
import { JourneyFilters } from "@/components/journey/JourneyFilters"
import { Timeline } from "@/components/journey/Timeline"

// ============================================
// Journey Page
// ============================================

interface JourneyPageProps {
  params: Promise<{ id: string }>
}

export default function JourneyPage({ params }: JourneyPageProps) {
  const resolvedParams = use(params)
  const tenantId = resolvedParams.id

  return (
    <PermissionGuard permission="tenants.view">
      <JourneyPageContent tenantId={tenantId} />
    </PermissionGuard>
  )
}

// ============================================
// Journey Page Content
// ============================================

interface JourneyPageContentProps {
  tenantId: string
}

function JourneyPageContent({ tenantId }: JourneyPageContentProps) {
  const router = useRouter()
  const { user } = useAuth()

  // State
  const [journey, setJourney] = useState<TenantJourneyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<JourneyFiltersType>(DEFAULT_JOURNEY_FILTERS)
  const [eventCounts, setEventCounts] = useState<Partial<Record<EventCategoryType, number>>>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Fetch journey data
  const fetchJourney = useCallback(async (resetEvents = true) => {
    if (!user) return

    try {
      if (resetEvents) {
        setLoading(true)
      }

      const result = await getTenantJourney({
        tenant_id: tenantId,
        workspace_id: user.id,
        events_limit: 30,
        events_offset: 0,
        event_categories: filters.categories.length > 0 ? filters.categories : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      })

      if (result.success && result.data) {
        setJourney(result.data)
        setError(null)
      } else {
        setError(result.error?.message || "Failed to load journey")
      }

      // Fetch event counts for filters
      const counts = await getEventCategoryCounts(tenantId)
      setEventCounts(counts)
    } catch (err) {
      console.error("[JourneyPage] Error fetching journey:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [tenantId, user, filters.categories, filters.date_from, filters.date_to])

  // Initial load
  useEffect(() => {
    fetchJourney()
  }, [fetchJourney])

  // Load more events
  const loadMoreEvents = useCallback(async () => {
    if (!user || !journey || loadingMore) return

    setLoadingMore(true)
    try {
      const result = await getTenantJourney({
        tenant_id: tenantId,
        workspace_id: user.id,
        events_limit: 30,
        events_offset: journey.events.length,
        event_categories: filters.categories.length > 0 ? filters.categories : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        include_analytics: false,
        include_financial: false,
        include_insights: false,
        include_visitors: false,
      })

      if (result.success && result.data) {
        setJourney(prev => prev ? {
          ...prev,
          events: [...prev.events, ...result.data!.events],
          has_more_events: result.data!.has_more_events,
        } : null)
      }
    } catch (err) {
      console.error("[JourneyPage] Error loading more events:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [tenantId, user, journey, filters, loadingMore])

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: JourneyFiltersType) => {
    setFilters(newFilters)
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_JOURNEY_FILTERS)
  }, [])

  // Export PDF
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/journey-report`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `journey-report-${journey?.tenant_name?.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error("Failed to export PDF")
      }
    } catch (err) {
      console.error("[JourneyPage] Error exporting PDF:", err)
    } finally {
      setExporting(false)
    }
  }, [tenantId, journey?.tenant_name])

  // Filter events by search query
  const filteredEvents = journey?.events.filter(event => {
    if (!filters.search_query) return true
    const query = filters.search_query.toLowerCase()
    return (
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query)
    )
  }) || []

  // Loading state
  if (loading) {
    return <PageLoader message="Loading tenant journey..." />
  }

  // Error state
  if (error || !journey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {error || "Journey not found"}
          </h2>
          <p className="text-slate-500 mb-4">
            Unable to load the tenant journey. Please try again.
          </p>
          <button
            onClick={() => fetchJourney()}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <JourneyHeader
        journey={journey}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Analytics Cards */}
      <JourneyAnalytics analytics={journey.analytics} />

      {/* Predictive Insights */}
      <PredictiveInsights insights={journey.insights} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline Column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <JourneyFilters
            filters={filters}
            onChange={handleFilterChange}
            onClear={clearFilters}
            eventCounts={eventCounts}
            totalEvents={journey.total_events}
            loading={loading}
            onRefresh={() => fetchJourney()}
          />

          {/* Timeline */}
          <Timeline
            events={filteredEvents}
            loading={false}
            hasMore={journey.has_more_events}
            onLoadMore={loadMoreEvents}
            loadingMore={loadingMore}
            groupByDate={true}
            emptyTitle="No events found"
            emptyDescription={
              filters.categories.length > 0 || filters.search_query
                ? "Try adjusting your filters"
                : "Events will appear here as the tenant's journey progresses."
            }
          />
        </div>

        {/* Sidebar Column (1/3) */}
        <div className="space-y-4">
          {/* Financial Summary */}
          <FinancialSummary
            financial={journey.financial}
            tenantId={tenantId}
            defaultExpanded={false}
          />

          {/* Pre-tenant visits */}
          {journey.pre_tenant_visits && journey.pre_tenant_visits.length > 0 && (
            <PreTenantVisitsCard visits={journey.pre_tenant_visits} />
          )}

          {/* Linked visitors */}
          {journey.linked_visitors && journey.linked_visitors.length > 0 && (
            <LinkedVisitorsCard visitors={journey.linked_visitors} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Pre-Tenant Visits Card
// ============================================

import { PreTenantVisit, LinkedVisitor } from "@/types/journey.types"

interface PreTenantVisitsCardProps {
  visits: PreTenantVisit[]
}

function PreTenantVisitsCard({ visits }: PreTenantVisitsCardProps) {
  return (
    <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
      <h3 className="font-semibold text-violet-800 mb-3">
        Before Joining
      </h3>
      <p className="text-sm text-violet-600 mb-3">
        This tenant visited the property before registering
      </p>
      <div className="space-y-2">
        {visits.map((visit, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-3 text-sm"
          >
            <p className="font-medium text-slate-900">
              Visited {visit.visited_tenant_name}
            </p>
            <p className="text-slate-500">
              {new Date(visit.visit_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" • "}
              {visit.days_before_joining} days before joining
            </p>
            {visit.property_name && (
              <p className="text-slate-400 text-xs mt-1">
                at {visit.property_name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Linked Visitors Card
// ============================================

interface LinkedVisitorsCardProps {
  visitors: LinkedVisitor[]
}

function LinkedVisitorsCard({ visitors }: LinkedVisitorsCardProps) {
  const displayVisitors = visitors.slice(0, 5)
  const hasMore = visitors.length > 5

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-3 flex items-center justify-between">
        Recent Visitors
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {visitors.length}
        </span>
      </h3>
      <div className="space-y-2">
        {displayVisitors.map((visitor, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0"
          >
            <div>
              <p className="font-medium text-slate-900">{visitor.visitor_name}</p>
              <p className="text-xs text-slate-500">{visitor.relationship}</p>
            </div>
            <span className="text-xs text-slate-400">
              {new Date(visitor.visit_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        ))}
        {hasMore && (
          <p className="text-xs text-teal-600 text-center pt-2">
            +{visitors.length - 5} more visitors
          </p>
        )}
      </div>
    </div>
  )
}
