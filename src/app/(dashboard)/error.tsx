"use client"

/**
 * Dashboard Error Boundary
 * Catches errors within the dashboard route group and displays a
 * contextual recovery page with navigation back to the dashboard home.
 */

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react"
import Link from "next/link"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[DashboardError]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>

        <p className="text-muted-foreground mb-6">
          An error occurred while loading this page. You can try again or
          return to the dashboard.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-4 bg-card border rounded-lg text-left">
            <p className="text-sm font-mono text-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <Link href="/dashboard">
            <Button variant="outline">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
