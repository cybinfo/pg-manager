"use client"
import { ModuleError } from "@/components/ui/module-error"
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} module="Library Plans" backHref="/entity-plans" />
}
