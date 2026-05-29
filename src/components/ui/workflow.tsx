"use client"

import React from "react"
import { Check, Lock, Loader2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowStepDef {
  id: number
  label: string
  icon: React.ElementType
}

// ─── WorkflowStepper ─────────────────────────────────────────────────────────

interface WorkflowStepperProps {
  steps: WorkflowStepDef[]
  currentStep: number
  className?: string
}

export function WorkflowStepper({ steps, currentStep, className }: WorkflowStepperProps) {
  return (
    <div className={cn("flex items-start gap-0", className)}>
      {steps.map((step, i) => {
        const done = step.id < currentStep
        const active = step.id === currentStep
        const locked = step.id > currentStep

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                  done && "bg-success border-success text-white",
                  active && "bg-primary border-primary text-white shadow-md shadow-primary/25",
                  locked && "bg-muted border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={cn(
                  "text-xs mt-1.5 font-medium whitespace-nowrap",
                  active && "text-primary",
                  done && "text-success",
                  locked && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-5 transition-colors",
                  step.id < currentStep ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── WorkflowStepCard ─────────────────────────────────────────────────────────

interface WorkflowStepCardProps {
  stepNum: number
  title: string
  description: string
  icon: React.ElementType
  currentStep: number
  isLocked?: boolean
  onEdit?: () => void
  completedSummary?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function WorkflowStepCard({
  stepNum,
  title,
  description,
  icon: Icon,
  currentStep,
  isLocked = false,
  onEdit,
  completedSummary,
  children,
  className,
}: WorkflowStepCardProps) {
  const isActive = stepNum === currentStep
  const isComplete = stepNum < currentStep && !isLocked

  // Collapsed completed state
  if (isComplete) {
    return (
      <div className={cn("border border-success/30 bg-success/5 rounded-xl p-5", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center flex-shrink-0">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{title}</p>
              {completedSummary && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{completedSummary}</div>
              )}
            </div>
          </div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs flex-shrink-0 ml-2">
              Edit
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Locked future state
  if (isLocked || (!isActive && stepNum > currentStep)) {
    return (
      <div className={cn("border border-dashed rounded-xl p-5 opacity-40 select-none", className)}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    )
  }

  // Active / expanded state
  return (
    <div className={cn("border-2 border-primary/30 bg-card rounded-xl overflow-hidden", className)}>
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-primary/5">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── WorkflowHeader ───────────────────────────────────────────────────────────

interface WorkflowHeaderProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  iconClassName?: string
  onBack?: () => void
  backLabel?: string
  badge?: React.ReactNode
  sideContent?: React.ReactNode
}

export function WorkflowHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  onBack,
  backLabel = "Back",
  badge,
  sideContent,
}: WorkflowHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3 transition-colors"
          >
            ← {backLabel}
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg", iconClassName || "bg-primary/10")}>
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            {badge && <div className="mt-1">{badge}</div>}
          </div>
        </div>
      </div>
      {sideContent && <div className="flex-shrink-0">{sideContent}</div>}
    </div>
  )
}

// ─── WorkflowContinueButton ───────────────────────────────────────────────────

interface WorkflowContinueButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
  disabledReason?: string
  className?: string
}

export function WorkflowContinueButton({
  onClick,
  disabled,
  loading,
  label = "Save & Continue",
  disabledReason,
  className,
}: WorkflowContinueButtonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Button className="w-full" onClick={onClick} disabled={disabled || loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {disabled && disabledReason ? disabledReason : label}
        {!disabled && !loading && <ChevronRight className="ml-2 h-4 w-4" />}
      </Button>
      {disabled && disabledReason && (
        <p className="text-xs text-muted-foreground text-center">{disabledReason}</p>
      )}
    </div>
  )
}
