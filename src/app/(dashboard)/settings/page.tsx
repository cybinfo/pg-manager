"use client"

import { Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  User,
  Bell,
  Cog,
  ShieldCheck,
} from "lucide-react"
import { DetailHero } from "@/components/ui"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { useAuth } from "@/lib/auth"
import { useSettingsData } from "@/lib/hooks/useSettingsData"

import {
  ProfileSettings,
  NotificationSettings,
  SessionSettings,
} from "./_components"

const VALID_TABS = ["profile", "notifications", "security"] as const
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

  const setActiveTab = useCallback((tab: string) => {
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
    config,
    notificationSettings, setNotificationSettings,
  } = useSettingsData()

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "profile",       label: "Profile",       icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security",      label: "Security",      icon: ShieldCheck },
  ]

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <OwnerGuard>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Unified settings header panel */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="px-6 pt-6 pb-4">
              <DetailHero
                title="Settings"
                subtitle="Manage your account and preferences"
                backHref="/dashboard"
                icon={Cog}
                breadcrumbs={[{ label: "Settings" }]}
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

          <TabsContent value="profile">
            <ProfileSettings
              owner={owner}
              setOwner={(o) => setOwner(o)}
              userId={user?.id}
              profile={profile}
            />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings
              notificationSettings={notificationSettings}
              setNotificationSettings={setNotificationSettings}
              config={config}
              owner={owner}
            />
          </TabsContent>

          <TabsContent value="security">
            <SessionSettings />
          </TabsContent>
        </Tabs>
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
