"use client"

import { Suspense } from "react"
import { ToggleLeft } from "lucide-react"
import { DetailHero } from "@/components/ui"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { FeatureSettings } from "../_components"

export default function FeaturesPage() {
  return (
    <OwnerGuard>
      <Suspense fallback={<PageSkeleton variant="form" />}>
        <div className="space-y-6">
          <DetailHero
            title="Feature Control Center"
            subtitle="Enable or disable modules and features per business. Disabling a module hides it from navigation — no data is deleted."
            backHref="/settings"
            backLabel="Back to Settings"
            icon={ToggleLeft}
            breadcrumbs={[
              { label: "Settings", href: "/settings" },
              { label: "Features" },
            ]}
          />
          <FeatureSettings />
        </div>
      </Suspense>
    </OwnerGuard>
  )
}
