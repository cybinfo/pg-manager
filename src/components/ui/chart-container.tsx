"use client"

import { useEffect, useState, ReactNode } from "react"
import { ResponsiveContainer } from "recharts"

interface ChartContainerProps {
  children: ReactNode
  height?: number | string
  minHeight?: number
  className?: string
}

/**
 * Chart wrapper that prevents dimension warnings from Recharts.
 * Delays rendering until after mount when parent dimensions are available.
 */
export function ChartContainer({
  children,
  height = 192,
  minHeight = 150,
  className = "",
}: ChartContainerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Small delay to ensure parent layout is complete
    const timer = requestAnimationFrame(() => {
      setMounted(true)
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, minHeight }}
      >
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={className} style={{ height, minHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}
