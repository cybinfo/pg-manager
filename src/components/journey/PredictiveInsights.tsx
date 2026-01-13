"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PredictiveInsights as PredictiveInsightsType, RiskAlert, Recommendation } from "@/types/journey.types"

// ============================================
// Predictive Insights Component
// ============================================

interface PredictiveInsightsProps {
  insights: PredictiveInsightsType
  className?: string
}

export function PredictiveInsights({ insights, className }: PredictiveInsightsProps) {
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)

  const displayRecommendations = showAllRecommendations
    ? insights.recommendations
    : insights.recommendations.slice(0, 2)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Score Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Payment Reliability Score */}
        <ScoreCard
          title="Payment Reliability"
          score={insights.payment_reliability_score}
          level={insights.payment_reliability_level}
          trend={insights.payment_reliability_trend}
          icon={TrendingUp}
          colorScheme={getPaymentColorScheme(insights.payment_reliability_level)}
        />

        {/* Churn Risk Score */}
        <ScoreCard
          title="Churn Risk"
          score={insights.churn_risk_score}
          level={insights.churn_risk_level}
          factors={insights.churn_risk_factors}
          icon={AlertTriangle}
          colorScheme={getChurnColorScheme(insights.churn_risk_level)}
          invertScore
        />

        {/* Satisfaction Level */}
        <SatisfactionCard
          level={insights.satisfaction_level}
          factors={insights.satisfaction_factors}
        />
      </div>

      {/* Active Alerts */}
      {insights.active_alerts.length > 0 && (
        <AlertsSection alerts={insights.active_alerts} />
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">Recommendations</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {insights.recommendations.length}
            </span>
          </div>

          <div className="space-y-2">
            {displayRecommendations.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>

          {insights.recommendations.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllRecommendations(!showAllRecommendations)}
              className="w-full mt-2 text-slate-500"
            >
              {showAllRecommendations ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show {insights.recommendations.length - 2} More
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Confidence indicator */}
      <div className="text-xs text-slate-500 text-center">
        <Info className="w-3 h-3 inline mr-1" />
        Insights based on {insights.data_points_analyzed} data points •{" "}
        <span className="capitalize">{insights.confidence} confidence</span>
      </div>
    </div>
  )
}

// ============================================
// Score Card Component
// ============================================

interface ScoreCardProps {
  title: string
  score: number
  level: string
  trend?: "improving" | "stable" | "declining"
  factors?: string[]
  icon: any
  colorScheme: ColorScheme
  invertScore?: boolean
}

interface ColorScheme {
  bg: string
  border: string
  text: string
  scoreText: string
  progressBg: string
  progressFill: string
}

function ScoreCard({
  title,
  score,
  level,
  trend,
  factors,
  icon: Icon,
  colorScheme,
  invertScore = false,
}: ScoreCardProps) {
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus
  const trendColor =
    trend === "improving"
      ? "text-emerald-500"
      : trend === "declining"
      ? "text-rose-500"
      : "text-slate-400"

  // For churn risk, lower is better
  const displayScore = invertScore ? 100 - score : score

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        colorScheme.bg,
        colorScheme.border
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", colorScheme.text)} />
          <h4 className="font-medium text-slate-700">{title}</h4>
        </div>
        {trend && (
          <TrendIcon className={cn("w-4 h-4", trendColor)} />
        )}
      </div>

      {/* Score display */}
      <div className="flex items-end gap-2 mb-2">
        <span className={cn("text-3xl font-bold", colorScheme.scoreText)}>
          {score}
        </span>
        <span className="text-slate-500 text-sm mb-1">/ 100</span>
      </div>

      {/* Progress bar */}
      <div
        className={cn("h-2 rounded-full", colorScheme.progressBg)}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title} score: ${score} out of 100`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorScheme.progressFill)}
          style={{ width: `${score}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Level label */}
      <p className={cn("text-sm mt-2 font-medium capitalize", colorScheme.text)}>
        {level}
      </p>

      {/* Factors (if any) */}
      {factors && factors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <p className="text-xs text-slate-500 mb-1">Contributing factors:</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            {factors.slice(0, 2).map((factor, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-slate-400">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================
// Satisfaction Card
// ============================================

interface SatisfactionCardProps {
  level: "high" | "medium" | "low"
  factors: string[]
}

function SatisfactionCard({ level, factors }: SatisfactionCardProps) {
  const config = {
    high: {
      icon: CheckCircle,
      label: "High Satisfaction",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100",
    },
    medium: {
      icon: Minus,
      label: "Medium Satisfaction",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
    },
    low: {
      icon: AlertCircle,
      label: "Low Satisfaction",
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
      iconBg: "bg-rose-100",
    },
  }

  const c = config[level]
  const Icon = c.icon

  return (
    <div className={cn("rounded-xl border p-4", c.bg, c.border)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-2 rounded-lg", c.iconBg)}>
          <Icon className={cn("w-5 h-5", c.color)} />
        </div>
        <div>
          <h4 className="font-medium text-slate-700">Satisfaction</h4>
          <p className={cn("text-sm font-semibold", c.color)}>{c.label}</p>
        </div>
      </div>

      {factors.length > 0 && (
        <div className="space-y-1">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              {factor}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Alerts Section
// ============================================

interface AlertsSectionProps {
  alerts: RiskAlert[]
}

function AlertsSection({ alerts }: AlertsSectionProps) {
  return (
    <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
        <h3 className="font-semibold text-rose-700">Active Alerts</h3>
        <span className="text-xs text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )
}

// ============================================
// Alert Card
// ============================================

interface AlertCardProps {
  alert: RiskAlert
}

function AlertCard({ alert }: AlertCardProps) {
  const severityConfig = {
    low: { bg: "bg-slate-100", text: "text-slate-700", icon: Info },
    medium: { bg: "bg-amber-100", text: "text-amber-700", icon: AlertCircle },
    high: { bg: "bg-rose-100", text: "text-rose-700", icon: AlertTriangle },
    critical: { bg: "bg-rose-200", text: "text-rose-800", icon: Zap },
  }

  const config = severityConfig[alert.severity]
  const Icon = config.icon

  return (
    <div className={cn("rounded-lg p-3 flex items-start gap-3", config.bg)}>
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", config.text)}>{alert.title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{alert.description}</p>
      </div>
      {alert.action_url && (
        <Link href={alert.action_url}>
          <Button variant="outline" size="sm" className="shrink-0 text-xs">
            Take Action
          </Button>
        </Link>
      )}
    </div>
  )
}

// ============================================
// Recommendation Card
// ============================================

interface RecommendationCardProps {
  recommendation: Recommendation
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const priorityConfig = {
    high: { dot: "bg-rose-500", text: "text-rose-600" },
    medium: { dot: "bg-amber-500", text: "text-amber-600" },
    low: { dot: "bg-slate-400", text: "text-slate-500" },
  }

  const typeConfig = {
    retention: { icon: Shield, label: "Retention" },
    collection: { icon: TrendingUp, label: "Collection" },
    engagement: { icon: Lightbulb, label: "Engagement" },
    verification: { icon: CheckCircle, label: "Verification" },
    general: { icon: Info, label: "General" },
  }

  const priority = priorityConfig[recommendation.priority]
  const type = typeConfig[recommendation.type]
  const Icon = type.icon

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
      <div className="p-1.5 bg-white rounded-lg shadow-sm">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("w-2 h-2 rounded-full", priority.dot)} />
          <span className="text-xs text-slate-500 capitalize">{recommendation.priority} priority</span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">{type.label}</span>
        </div>
        <p className="text-sm text-slate-700">{recommendation.message}</p>
      </div>
      {recommendation.action_url && (
        <Link href={recommendation.action_url}>
          <Button variant="ghost" size="sm" className="shrink-0 text-xs text-teal-600">
            Action
          </Button>
        </Link>
      )}
    </div>
  )
}

// ============================================
// Color Scheme Helpers
// ============================================

function getPaymentColorScheme(level: string): ColorScheme {
  switch (level) {
    case "excellent":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-600",
        scoreText: "text-emerald-600",
        progressBg: "bg-emerald-200",
        progressFill: "bg-emerald-500",
      }
    case "good":
      return {
        bg: "bg-teal-50",
        border: "border-teal-200",
        text: "text-teal-600",
        scoreText: "text-teal-600",
        progressBg: "bg-teal-200",
        progressFill: "bg-teal-500",
      }
    case "fair":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-600",
        scoreText: "text-amber-600",
        progressBg: "bg-amber-200",
        progressFill: "bg-amber-500",
      }
    case "poor":
    case "critical":
      return {
        bg: "bg-rose-50",
        border: "border-rose-200",
        text: "text-rose-600",
        scoreText: "text-rose-600",
        progressBg: "bg-rose-200",
        progressFill: "bg-rose-500",
      }
    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-600",
        scoreText: "text-slate-600",
        progressBg: "bg-slate-200",
        progressFill: "bg-slate-500",
      }
  }
}

function getChurnColorScheme(level: string): ColorScheme {
  // For churn, lower is better (inverted colors)
  switch (level) {
    case "low":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-600",
        scoreText: "text-emerald-600",
        progressBg: "bg-emerald-200",
        progressFill: "bg-emerald-500",
      }
    case "medium":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-600",
        scoreText: "text-amber-600",
        progressBg: "bg-amber-200",
        progressFill: "bg-amber-500",
      }
    case "high":
    case "critical":
      return {
        bg: "bg-rose-50",
        border: "border-rose-200",
        text: "text-rose-600",
        scoreText: "text-rose-600",
        progressBg: "bg-rose-200",
        progressFill: "bg-rose-500",
      }
    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-600",
        scoreText: "text-slate-600",
        progressBg: "bg-slate-200",
        progressFill: "bg-slate-500",
      }
  }
}

// ============================================
// Compact Insights (for sidebar)
// ============================================

interface CompactInsightsProps {
  insights: PredictiveInsightsType
  className?: string
}

export function CompactInsights({ insights, className }: CompactInsightsProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-slate-200 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900 flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-500" />
          AI Insights
        </h4>
        <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
          Beta
        </span>
      </div>

      <div className="space-y-3">
        {/* Payment score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Payment</span>
          <div className="flex items-center gap-2">
            <div
              className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={insights.payment_reliability_score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Payment reliability score: ${insights.payment_reliability_score} out of 100`}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  insights.payment_reliability_score >= 70 ? "bg-emerald-500" :
                  insights.payment_reliability_score >= 50 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${insights.payment_reliability_score}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-medium text-slate-900 w-8">
              {insights.payment_reliability_score}
            </span>
          </div>
        </div>

        {/* Churn risk */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Churn Risk</span>
          <span
            className={cn(
              "text-sm font-medium capitalize px-2 py-0.5 rounded",
              insights.churn_risk_level === "low" && "bg-emerald-100 text-emerald-700",
              insights.churn_risk_level === "medium" && "bg-amber-100 text-amber-700",
              (insights.churn_risk_level === "high" || insights.churn_risk_level === "critical") &&
                "bg-rose-100 text-rose-700"
            )}
          >
            {insights.churn_risk_level}
          </span>
        </div>

        {/* Active alerts count */}
        {insights.active_alerts.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-600">Active Alerts</span>
            <span className="text-sm font-medium text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
              {insights.active_alerts.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PredictiveInsights
