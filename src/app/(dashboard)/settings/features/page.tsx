"use client"

import { Suspense } from "react"
import { ToggleLeft } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { FeatureSettings } from "../_components"

export default function FeaturesPage() {
  return (
    <OwnerGuard>
      <Suspense fallback={<PageSkeleton variant="form" />}>
        <div className="space-y-6">
          <PageHeader
            title="Feature Control Center"
            description="Enable or disable modules and features per business. Disabling a module hides it from navigation — no data is deleted."
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
