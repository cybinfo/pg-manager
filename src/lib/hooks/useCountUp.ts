"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Hook that animates a number counting up from 0 (or previous value) to the target.
 * Uses requestAnimationFrame for smooth 60fps animation with ease-out-cubic easing.
 *
 * Respects `prefers-reduced-motion` - returns the final value immediately when
 * the user has requested reduced motion.
 *
 * @param end - The target number to count up to
 * @param options.duration - Animation duration in ms (default: 500)
 * @returns The current animated number value
 *
 * @example
 * const count = useCountUp(42, { duration: 500 })
 * return <span>{count}</span>
 */
export function useCountUp(
  end: number,
  options?: { duration?: number }
): number {
  const duration = options?.duration ?? 500
  const [count, setCount] = useState(0)
  const prevEnd = useRef(0)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (motionQuery.matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(end)
      prevEnd.current = end
      return
    }

    const start = prevEnd.current
    prevEnd.current = end

    if (end === start) return

    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)

      setCount(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration])

  return count
}
