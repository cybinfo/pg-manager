"use client"

import { useSettingsData } from "@/lib/hooks/useSettingsData"
import { RoomTypeSettings } from "@/app/(dashboard)/settings/_components"
import { PageSkeleton } from "@/components/ui/loading"

export function RoomTypePanel() {
  const {
    loading,
    config, setConfig,
    configurableRoomTypes, setConfigurableRoomTypes,
  } = useSettingsData()

  if (loading) return <PageSkeleton variant="form" />

  return (
    <RoomTypeSettings
      configurableRoomTypes={configurableRoomTypes}
      setConfigurableRoomTypes={setConfigurableRoomTypes}
      config={config}
      setConfig={(c) => setConfig(c)}
    />
  )
}
