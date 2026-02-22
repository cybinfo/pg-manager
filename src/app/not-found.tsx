"use client"

/**
 * Global 404 Not Found Page (ARCH-003)
 * Displayed when a user navigates to a non-existent route.
 */

import { Button } from "@/components/ui/button"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Page Not Found
        </h2>

        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button variant="default">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>

          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
