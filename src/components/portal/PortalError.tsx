"use client"

/**
 * Shared Portal Error Boundary Component
 * Used by both the tenant and member self-service portals to display
 * a recovery page when an error is caught by the Next.js error boundary.
 */

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"
import { logger } from "@/lib/logger"
import { getNowISO } from "@/lib/date-helpers"

export interface PortalErrorProps {
  /** The error caught by the Next.js error boundary */
  error: Error & { digest?: string }
  /** Reset function provided by Next.js to retry rendering */
  reset: () => void
  /** Portal identifier used in log messages (e.g. "TenantPortal", "MemberPortal") */
  portalName: string
  /** URL for the home button (e.g. "/tenant", "/member") */
  homeHref: string
}

export function PortalError({
  error,
  reset,
  portalName,
  homeHref,
}: PortalErrorProps) {
  useEffect(() => {
    logger.error(`[${portalName}Error]`, {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: getNowISO(),
    })
  }, [error, portalName])

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
          An error occurred while loading this page. Please try again or
          return to the home page.
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

          <Link href={homeHref}>
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
