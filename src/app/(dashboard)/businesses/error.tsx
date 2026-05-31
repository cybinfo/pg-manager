"use client"

import { ModuleError } from "@/components/ui/module-error"

export default function BusinessesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ModuleError error={error} reset={reset} module="Businesses" backHref="/businesses" />
}
