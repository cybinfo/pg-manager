"use client"

import { ModuleError } from "@/components/ui/module-error"

export default function LocationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ModuleError error={error} reset={reset} module="Locations" backHref="/locations" />
}
