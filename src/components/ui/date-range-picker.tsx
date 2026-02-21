"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Calendar, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DateRange {
  from: Date
  to: Date
  label?: string
}

export interface DateRangePreset {
  label: string
  getValue: () => DateRange
}

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange) => void
  className?: string
  presets?: DateRangePreset[]
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    label: "Today",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start, to: now, label: "Today" }
    },
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { from: start, to: now, label: "Last 7 days" }
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return { from: start, to: now, label: "Last 30 days" }
    },
  },
  {
    label: "This month",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start, to: now, label: "This month" }
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: start, to: end, label: "Last month" }
    },
  },
  {
    label: "Last 3 months",
    getValue: () => {
      const now = new Date()
      const start = new Date(now)
      start.setMonth(start.getMonth() - 3)
      return { from: start, to: now, label: "Last 3 months" }
    },
  },
  {
    label: "This year",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return { from: start, to: now, label: "This year" }
    },
  },
]

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function toInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function DateRangePicker({ value, onChange, className, presets }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const activePresets = presets || DEFAULT_PRESETS

  // Local state for custom date inputs
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  // Sync custom inputs when value changes
  useEffect(() => {
    if (value) {
      setCustomFrom(toInputValue(value.from))
      setCustomTo(toInputValue(value.to))
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setShowCustom(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        setShowCustom(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open])

  const handlePresetClick = useCallback(
    (preset: DateRangePreset) => {
      const range = preset.getValue()
      onChange(range)
      setShowCustom(false)
      setOpen(false)
    },
    [onChange]
  )

  const handleCustomApply = useCallback(() => {
    if (!customFrom || !customTo) return

    const from = fromInputValue(customFrom)
    const to = fromInputValue(customTo)

    if (from > to) return

    onChange({ from, to, label: "Custom" })
    setOpen(false)
    setShowCustom(false)
  }, [customFrom, customTo, onChange])

  const displayLabel = useMemo(() => {
    if (!value) return "Select date range"
    if (value.label && value.label !== "Custom") return value.label
    return `${formatDate(value.from)} - ${formatDate(value.to)}`
  }, [value])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="justify-between gap-2 min-w-[200px] font-normal"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-input rounded-lg shadow-lg min-w-[320px] sm:min-w-[480px]">
          <div className="flex flex-col sm:flex-row">
            {/* Presets Column */}
            <div className="border-b sm:border-b-0 sm:border-r border-input p-2 sm:w-[180px] shrink-0">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
                Presets
              </p>
              <div className="space-y-0.5">
                {activePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      value?.label === preset.label && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    showCustom && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Custom Range Panel */}
            <div className="p-4 flex-1">
              {showCustom ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Custom Date Range</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        From
                      </label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        To
                      </label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                      />
                    </div>
                  </div>
                  {customFrom && customTo && fromInputValue(customFrom) > fromInputValue(customTo) && (
                    <p className="text-xs text-destructive">
                      Start date must be before end date
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCustom(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCustomApply}
                      disabled={
                        !customFrom ||
                        !customTo ||
                        fromInputValue(customFrom) > fromInputValue(customTo)
                      }
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[120px] text-sm text-muted-foreground">
                  {value ? (
                    <div className="text-center space-y-1">
                      <p className="font-medium text-foreground">{value.label || "Custom"}</p>
                      <p>
                        {formatDate(value.from)} - {formatDate(value.to)}
                      </p>
                    </div>
                  ) : (
                    <p>Select a preset or choose custom range</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
