/**
 * Reports Components
 * Shared report infrastructure for PG and Library reports
 */

// Pre-existing extracted components
export { KPICard } from "./kpi-card"
export { RevenueTrendChart } from "./revenue-trend-chart"
export { DuesAgingCard } from "./dues-aging-card"
export { QuickInsights } from "./quick-insights"
export { SummaryStatCard } from "./summary-stat-card"

// Shared report infrastructure
export { ReportChartCard } from "./ReportChartCard"
export { PaymentMethodsChart } from "./PaymentMethodsChart"
export { ReportPageHeader } from "./ReportPageHeader"
export { StatusBreakdownCard } from "./StatusBreakdownCard"
export { useReportDateRange } from "./useReportDateRange"
export {
  CHART_COLORS,
  MONTH_NAMES,
  DAY_NAMES,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  getDefaultDateRange,
  calculateGrowth,
  buildPaymentMethodBreakdown,
  buildMonthlyTrend,
  exportCSV,
} from "./report-utils"
