"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ModuleErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  module: string
  backHref: string
}

export function ModuleError({ error, reset, module, backHref }: ModuleErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[40vh] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Failed to load {module}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          An error occurred. Try refreshing or go back.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded mb-4 text-left break-all">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Try Again
          </Button>
          <Link href={backHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
