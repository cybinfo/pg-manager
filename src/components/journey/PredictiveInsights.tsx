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
import type { LucideIcon } from "lucide-react"
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
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">Recommendations</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
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
              className="w-full mt-2 text-muted-foreground"
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
      <div className="text-xs text-muted-foreground text-center">
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
  icon: LucideIcon
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
      ? "text-success"
      : trend === "declining"
      ? "text-destructive"
      : "text-muted-foreground"

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
          <h4 className="font-medium text-foreground">{title}</h4>
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
        <span className="text-muted-foreground text-sm mb-1">/ 100</span>
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
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Contributing factors:</p>
          <ul className="text-xs text-foreground space-y-0.5">
            {factors.slice(0, 2).map((factor, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-muted-foreground">•</span>
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
      color: "text-success",
      bg: "bg-success/5",
      border: "border-success/20",
      iconBg: "bg-success/10",
    },
    medium: {
      icon: Minus,
      label: "Medium Satisfaction",
      color: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/20",
      iconBg: "bg-warning/10",
    },
    low: {
      icon: AlertCircle,
      label: "Low Satisfaction",
      color: "text-destructive",
      bg: "bg-destructive/5",
      border: "border-destructive/20",
      iconBg: "bg-destructive/10",
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
          <h4 className="font-medium text-foreground">Satisfaction</h4>
          <p className={cn("text-sm font-semibold", c.color)}>{c.label}</p>
        </div>
      </div>

      {factors.length > 0 && (
        <div className="space-y-1">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="w-3 h-3 text-success" />
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
    <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Active Alerts</h3>
        <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
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
    low: { bg: "bg-muted", text: "text-foreground", icon: Info },
    medium: { bg: "bg-warning/10", text: "text-warning", icon: AlertCircle },
    high: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertTriangle },
    critical: { bg: "bg-destructive/15", text: "text-destructive", icon: Zap },
  }

  const config = severityConfig[alert.severity]
  const Icon = config.icon

  return (
    <div className={cn("rounded-lg p-3 flex items-start gap-3", config.bg)}>
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", config.text)}>{alert.title}</p>
        <p className="text-xs text-foreground mt-0.5">{alert.description}</p>
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
    high: { dot: "bg-destructive", text: "text-destructive" },
    medium: { dot: "bg-warning", text: "text-warning" },
    low: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
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
    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
      <div className="p-1.5 bg-card rounded-lg shadow-sm">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("w-2 h-2 rounded-full", priority.dot)} />
          <span className="text-xs text-muted-foreground capitalize">{recommendation.priority} priority</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{type.label}</span>
        </div>
        <p className="text-sm text-foreground">{recommendation.message}</p>
      </div>
      {recommendation.action_url && (
        <Link href={recommendation.action_url}>
          <Button variant="ghost" size="sm" className="shrink-0 text-xs text-primary">
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
        bg: "bg-success/5",
        border: "border-success/20",
        text: "text-success",
        scoreText: "text-success",
        progressBg: "bg-success/20",
        progressFill: "bg-success",
      }
    case "good":
      return {
        bg: "bg-primary/5",
        border: "border-primary/20",
        text: "text-primary",
        scoreText: "text-primary",
        progressBg: "bg-primary/20",
        progressFill: "bg-primary",
      }
    case "fair":
      return {
        bg: "bg-warning/5",
        border: "border-warning/20",
        text: "text-warning",
        scoreText: "text-warning",
        progressBg: "bg-warning/20",
        progressFill: "bg-warning",
      }
    case "poor":
    case "critical":
      return {
        bg: "bg-destructive/5",
        border: "border-destructive/20",
        text: "text-destructive",
        scoreText: "text-destructive",
        progressBg: "bg-destructive/20",
        progressFill: "bg-destructive",
      }
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        text: "text-muted-foreground",
        scoreText: "text-muted-foreground",
        progressBg: "bg-muted",
        progressFill: "bg-muted-foreground",
      }
  }
}

function getChurnColorScheme(level: string): ColorScheme {
  // For churn, lower is better (inverted colors)
  switch (level) {
    case "low":
      return {
        bg: "bg-success/5",
        border: "border-success/20",
        text: "text-success",
        scoreText: "text-success",
        progressBg: "bg-success/20",
        progressFill: "bg-success",
      }
    case "medium":
      return {
        bg: "bg-warning/5",
        border: "border-warning/20",
        text: "text-warning",
        scoreText: "text-warning",
        progressBg: "bg-warning/20",
        progressFill: "bg-warning",
      }
    case "high":
    case "critical":
      return {
        bg: "bg-destructive/5",
        border: "border-destructive/20",
        text: "text-destructive",
        scoreText: "text-destructive",
        progressBg: "bg-destructive/20",
        progressFill: "bg-destructive",
      }
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        text: "text-muted-foreground",
        scoreText: "text-muted-foreground",
        progressBg: "bg-muted",
        progressFill: "bg-muted-foreground",
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
    <div className={cn("bg-card rounded-lg border border-border p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          AI Insights
        </h4>
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Beta
        </span>
      </div>

      <div className="space-y-3">
        {/* Payment score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Payment</span>
          <div className="flex items-center gap-2">
            <div
              className="w-16 h-2 bg-muted rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={insights.payment_reliability_score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Payment reliability score: ${insights.payment_reliability_score} out of 100`}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  insights.payment_reliability_score >= 70 ? "bg-success" :
                  insights.payment_reliability_score >= 50 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${insights.payment_reliability_score}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-medium text-foreground w-8">
              {insights.payment_reliability_score}
            </span>
          </div>
        </div>

        {/* Churn risk */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Churn Risk</span>
          <span
            className={cn(
              "text-sm font-medium capitalize px-2 py-0.5 rounded",
              insights.churn_risk_level === "low" && "bg-success/10 text-success",
              insights.churn_risk_level === "medium" && "bg-warning/10 text-warning",
              (insights.churn_risk_level === "high" || insights.churn_risk_level === "critical") &&
                "bg-destructive/10 text-destructive"
            )}
          >
            {insights.churn_risk_level}
          </span>
        </div>

        {/* Active alerts count */}
        {insights.active_alerts.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-foreground">Active Alerts</span>
            <span className="text-sm font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">
              {insights.active_alerts.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PredictiveInsights
