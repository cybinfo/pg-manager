"use client"

import { useCountUp } from "@/lib/hooks/useCountUp"
import { formatNumber } from "@/lib/format"

interface AnimatedNumberProps {
  /** The target number to animate to */
  value: number
  /** Animation duration in milliseconds (default: 500) */
  duration?: number
  /** Text to display before the number (e.g., currency symbol) */
  prefix?: string
  /** Text to display after the number (e.g., unit) */
  suffix?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a number with a smooth count-up animation.
 * Uses Indian number formatting (en-IN locale).
 * Respects `prefers-reduced-motion` accessibility setting.
 *
 * @example
 * <AnimatedNumber value={1234} prefix="₹" />
 * // Animates from 0 to ₹1,234
 */
export function AnimatedNumber({
  value,
  duration = 500,
  prefix,
  suffix,
  className,
}: AnimatedNumberProps) {
  const count = useCountUp(value, { duration })
  return (
    <span className={className}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  )
}
