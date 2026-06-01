"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Bed,
  CreditCard,
  UtensilsCrossed,
  IndianRupee,
  Settings,
  Building2,
  Briefcase,
} from "lucide-react"
import { DetailHero, InfoCard } from "@/components/ui"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard, FeatureGuard } from "@/components/auth"
import { useCurrentContext } from "@/lib/auth"
import { useSettingsData } from "@/lib/hooks/useSettingsData"
import { createClient } from "@/lib/supabase/client"
import {
  RoomTypeSettings,
  BillingSettings,
  FoodSettings,
  ExpenseTypeSettings,
  DefaultSettings,
  ApprovalSettings,
} from "../settings/_components"

const VALID_TABS = ["overview", "room-types", "billing", "food", "expenses", "defaults"] as const
type TabId = typeof VALID_TABS[number]
const DEFAULT_TAB: TabId = "overview"

function isValidTab(tab: string | null): tab is TabId {
  return tab !== null && (VALID_TABS as readonly string[]).includes(tab)
}

function WorkspaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { context, workspaceName } = useCurrentContext()

  const tabParam = searchParams.get("tab")
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : DEFAULT_TAB

  const setActiveTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === DEFAULT_TAB) {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    const query = params.toString()
    router.replace(`/workspace${query ? `?${query}` : ""}`)
  }, [router, searchParams])

  const [businessCount, setBusinessCount] = useState<number>(0)
  const [entityCount, setEntityCount] = useState<number>(0)

  useEffect(() => {
    if (!context?.workspace_id) return
    const supabase = createClient()
    Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace_id),
      supabase.from("entities").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace_id),
    ]).then(([biz, ent]) => {
      setBusinessCount(biz.count ?? 0)
      setEntityCount(ent.count ?? 0)
    })
  }, [context?.workspace_id])

  const {
    loading,
    chargeTypes, setChargeTypes,
    expenseTypes, setExpenseTypes,
    config, setConfig,
    configForm, setConfigForm,
    autoBillingSettings, setAutoBillingSettings,
    propertyTypePricing,
    foodSettings, setFoodSettings,
    configurableRoomTypes, setConfigurableRoomTypes,
    billingCycleMode, setBillingCycleMode,
    utilityRates, setUtilityRates,
  } = useSettingsData()

  const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview",    label: "Overview",           icon: LayoutDashboard },
    { id: "room-types",  label: "Room Types",         icon: Bed },
    { id: "billing",     label: "Billing & Charges",  icon: CreditCard },
    { id: "food",        label: "Food & Meals",       icon: UtensilsCrossed },
    { id: "expenses",    label: "Expense Categories", icon: IndianRupee },
    { id: "defaults",    label: "Default Settings",   icon: Settings },
  ]

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <OwnerGuard>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="px-6 pt-6 pb-4">
              <DetailHero
                title={workspaceName || "My Workspace"}
                subtitle="Workspace identity and configuration"
                backHref="/dashboard"
                icon={LayoutDashboard}
                breadcrumbs={[{ label: "Workspace" }]}
              />
            </div>
            <TabsList className="h-auto bg-transparent border-t rounded-none p-0 gap-1 px-4 w-full justify-start flex-wrap py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-md px-3 py-1.5 gap-2 text-sm text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50 hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <InfoCard
                  label="Businesses"
                  value={String(businessCount)}
                  icon={Briefcase}
                />
                <InfoCard
                  label="Entities"
                  value={String(entityCount)}
                  icon={Building2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="room-types">
            <RoomTypeSettings
              configurableRoomTypes={configurableRoomTypes}
              setConfigurableRoomTypes={setConfigurableRoomTypes}
              config={config}
              setConfig={(c) => setConfig(c)}
            />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSettings
              chargeTypes={chargeTypes}
              setChargeTypes={setChargeTypes}
              utilityRates={utilityRates}
              setUtilityRates={setUtilityRates}
              autoBillingSettings={autoBillingSettings}
              setAutoBillingSettings={setAutoBillingSettings}
              billingCycleMode={billingCycleMode}
              setBillingCycleMode={setBillingCycleMode}
              configForm={configForm}
              config={config}
              setConfig={(c) => setConfig(c)}
              propertyTypePricing={propertyTypePricing}
            />
          </TabsContent>

          <TabsContent value="food">
            <FoodSettings
              foodSettings={foodSettings}
              setFoodSettings={setFoodSettings}
              configId={config?.id}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseTypeSettings
              expenseTypes={expenseTypes}
              setExpenseTypes={setExpenseTypes}
            />
          </TabsContent>

          <TabsContent value="defaults">
            <div className="space-y-6">
              <DefaultSettings
                configForm={configForm}
                setConfigForm={setConfigForm}
                config={config}
                setConfig={(c) => setConfig(c)}
              />
              <FeatureGuard module="approvals" feature="autoApproval">
                <ApprovalSettings />
              </FeatureGuard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </OwnerGuard>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="form" />}>
      <WorkspaceContent />
    </Suspense>
  )
}
