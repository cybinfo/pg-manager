"use client"

import { Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Settings,
  User,
  CreditCard,
  Bell,
  IndianRupee,
  Cog,
  Bed,
  UtensilsCrossed,
  ToggleLeft
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { useAuth } from "@/lib/auth"
import { useSettingsData } from "@/lib/hooks/useSettingsData"

import {
  ProfileSettings,
  RoomTypeSettings,
  BillingSettings,
  FoodSettings,
  ExpenseTypeSettings,
  NotificationSettings,
  FeatureSettings,
  DefaultSettings,
  ApprovalSettings,
} from "./_components"
import { FeatureGuard } from "@/components/auth"

const VALID_TABS = ["profile", "room-types", "billing", "food", "expenses", "notifications", "features", "defaults"] as const
type TabId = typeof VALID_TABS[number]

const DEFAULT_TAB: TabId = "profile"

function isValidTab(tab: string | null): tab is TabId {
  return tab !== null && (VALID_TABS as readonly string[]).includes(tab)
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()

  const tabParam = searchParams.get("tab")
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : DEFAULT_TAB

  const setActiveTab = useCallback((tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === DEFAULT_TAB) {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    const query = params.toString()
    router.replace(`/settings${query ? `?${query}` : ""}`)
  }, [router, searchParams])

  const {
    loading,
    owner, setOwner,
    chargeTypes, setChargeTypes,
    expenseTypes, setExpenseTypes,
    config, setConfig,
    configForm, setConfigForm,
    notificationSettings, setNotificationSettings,
    autoBillingSettings, setAutoBillingSettings,
    propertyTypePricing,
    foodSettings, setFoodSettings,
    configurableRoomTypes, setConfigurableRoomTypes,
    billingCycleMode, setBillingCycleMode,
    utilityRates, setUtilityRates,
  } = useSettingsData()

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "room-types", label: "Room Types", icon: Bed },
    { id: "billing", label: "Billing & Charges", icon: CreditCard },
    { id: "food", label: "Food & Meals", icon: UtensilsCrossed },
    { id: "expenses", label: "Expense Categories", icon: IndianRupee },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "features", label: "Features", icon: ToggleLeft },
    { id: "defaults", label: "Default Settings", icon: Settings },
  ]

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <OwnerGuard>
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        icon={Cog}
        breadcrumbs={[{ label: "Settings" }]}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <ProfileSettings
          owner={owner}
          setOwner={(o) => setOwner(o)}
          userId={user?.id}
          profile={profile}
        />
      )}

      {/* Room Types Tab */}
      {activeTab === "room-types" && (
        <RoomTypeSettings
          configurableRoomTypes={configurableRoomTypes}
          setConfigurableRoomTypes={setConfigurableRoomTypes}
          config={config}
          setConfig={(c) => setConfig(c)}
        />
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
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
      )}

      {/* Food Tab */}
      {activeTab === "food" && (
        <FoodSettings
          foodSettings={foodSettings}
          setFoodSettings={setFoodSettings}
          configId={config?.id}
        />
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <ExpenseTypeSettings
          expenseTypes={expenseTypes}
          setExpenseTypes={setExpenseTypes}
        />
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <NotificationSettings
          notificationSettings={notificationSettings}
          setNotificationSettings={setNotificationSettings}
          config={config}
          owner={owner}
        />
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <FeatureSettings />
      )}

      {/* Defaults Tab */}
      {activeTab === "defaults" && (
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
      )}
    </div>
    </OwnerGuard>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="form" />}>
      <SettingsContent />
    </Suspense>
  )
}
