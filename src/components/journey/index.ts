/**
 * Journey Components - Barrel Export
 *
 * Tenant lifecycle journey tracking components including:
 * - Timeline visualization
 * - Analytics cards
 * - Predictive insights
 * - Financial summary
 */

// Core components
export { Timeline, MiniTimeline } from "./Timeline"
export { TimelineEvent, CompactTimelineEvent } from "./TimelineEvent"
export { EventIcon, CategoryBadge, StatusDot } from "./EventIcon"

// Page components
export { JourneyHeader, CompactHeader } from "./JourneyHeader"
export { JourneyAnalytics, DetailedAnalytics } from "./JourneyAnalytics"
export { FinancialSummary, CompactFinancialCard } from "./FinancialSummary"
export { PredictiveInsights, CompactInsights } from "./PredictiveInsights"
export { JourneyFilters, CompactFilters } from "./JourneyFilters"
