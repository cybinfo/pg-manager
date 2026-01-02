"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { useFeatures } from "@/lib/features/use-features"
import { FeatureFlagKey, FEATURE_FLAGS } from "@/lib/features"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleLeft, ArrowLeft, Settings } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"

interface FeatureGuardProps {
  feature: FeatureFlagKey
  children: ReactNode
  /** Custom title for the disabled message */
  title?: string
  /** Custom description for the disabled message */
  description?: string
}

/**
 * Page-level guard that blocks access when a feature is disabled.
 * Shows a "feature disabled" page with link to settings.
 *
 * Usage:
 * export default function ExpensesPage() {
 *   return (
 *     <FeatureGuard feature="expenses">
 *       <ExpensesContent />
 *     </FeatureGuard>
 *   )
 * }
 */
export function FeatureGuard({
  feature,
  children,
  title,
  description,
}: FeatureGuardProps) {
  const { isEnabled, loading } = useFeatures()

  if (loading) {
    return <PageLoading />
  }

  if (!isEnabled(feature)) {
    const config = FEATURE_FLAGS[feature]
    const featureName = title || config?.name || feature
    const featureDesc = description || config?.description || "This feature is currently disabled."

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <ToggleLeft className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Feature Disabled</h2>
                <p className="text-lg font-medium text-primary">{featureName}</p>
                <p className="text-sm text-muted-foreground">{featureDesc}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This feature has been disabled for your workspace. You can enable it in Settings.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Link href="/dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Go to Settings
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
