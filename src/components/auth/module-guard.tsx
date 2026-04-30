"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { useFeatures } from "@/lib/features/use-features"
import type { ModuleKey } from "@/lib/features"
import { MODULE_MAP } from "@/lib/features"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleLeft, ArrowLeft, Settings } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"

interface ModuleGuardProps {
  module: ModuleKey
  children: ReactNode
  /** Override the displayed module name */
  title?: string
  /** Override the displayed description */
  description?: string
}

/**
 * Page-level guard that blocks access when a module is disabled.
 * Shows a "module disabled" page with a link to the Feature Control Center.
 *
 * Usage:
 *   <ModuleGuard module="expenses">
 *     <ExpensesContent />
 *   </ModuleGuard>
 */
export function ModuleGuard({ module, children, title, description }: ModuleGuardProps) {
  const { isModuleEnabled, loading } = useFeatures()

  if (loading) return <PageLoading />

  if (!isModuleEnabled(module)) {
    const def = MODULE_MAP.get(module)
    const moduleName = title ?? def?.name ?? module
    const moduleDesc = description ?? def?.description ?? "This module is currently disabled."

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <ToggleLeft className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Module Disabled</h2>
                <p className="text-lg font-medium text-primary">{moduleName}</p>
                <p className="text-sm text-muted-foreground">{moduleDesc}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This module has been disabled for your workspace. Enable it in the Feature Control Center.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Link href="/dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Link href="/settings/features">
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Feature Control Center
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
