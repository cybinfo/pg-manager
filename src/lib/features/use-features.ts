"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentContext, useAuth } from "@/lib/auth"
import type { ModuleKey, WorkspaceModuleConfig } from './types'
import { isModuleEnabled as checkModule, isFeatureEnabled as checkFeature, isOldFlatFormat, migrateOldFlagsToModuleConfig } from './checks'
import { logger, extractErrorMeta } from "@/lib/logger"

const featureLogger = logger.child("features")

const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  config: WorkspaceModuleConfig
  timestamp: number
}
const cache = new Map<string, CacheEntry>() // key = workspace_id

let fetchPromises = new Map<string, Promise<WorkspaceModuleConfig>>() // key = workspace_id

const cacheListeners = new Set<() => void>()

function isCacheValid(workspaceId: string): boolean {
  const entry = cache.get(workspaceId)
  if (!entry) return false
  return Date.now() - entry.timestamp < CACHE_TTL_MS
}

export function invalidateFeatureCache(workspaceId?: string): void {
  if (workspaceId) {
    cache.delete(workspaceId)
    fetchPromises.delete(workspaceId)
  } else {
    cache.clear()
    fetchPromises.clear()
  }
  cacheListeners.forEach((fn) => fn())
}

async function fetchModuleConfig(workspaceId: string): Promise<WorkspaceModuleConfig> {
  if (isCacheValid(workspaceId)) {
    return cache.get(workspaceId)!.config
  }

  const existing = fetchPromises.get(workspaceId)
  if (existing) return existing

  const promise = (async (): Promise<WorkspaceModuleConfig> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("workspaces")
      .select("module_config")
      .eq("id", workspaceId)
      .single()

    if (error || !data) {
      return {}
    }

    let config = data.module_config as WorkspaceModuleConfig | Record<string, boolean> | null

    // Auto-migrate if old flat format is detected
    if (isOldFlatFormat(config)) {
      config = migrateOldFlagsToModuleConfig(config)
    }

    const resolved = (config ?? {}) as WorkspaceModuleConfig

    cache.set(workspaceId, { config: resolved, timestamp: Date.now() })
    fetchPromises.delete(workspaceId)

    return resolved
  })()

  fetchPromises.set(workspaceId, promise)

  try {
    return await promise
  } catch (err) {
    fetchPromises.delete(workspaceId)
    featureLogger.error("Error fetching module config", extractErrorMeta(err))
    return {}
  }
}

/**
 * Hook to check module and feature flags for the current workspace.
 *
 * Usage:
 *   const { isModuleEnabled, isFeatureEnabled, loading } = useFeatures()
 *   if (isModuleEnabled("expenses")) { ... }
 *   if (isFeatureEnabled("billing", "autoBilling")) { ... }
 */
export function useFeatures() {
  const { context } = useCurrentContext()
  const workspaceId = context?.workspace_id ?? null

  const [moduleConfig, setModuleConfig] = useState<WorkspaceModuleConfig>(() =>
    workspaceId ? (cache.get(workspaceId)?.config ?? {}) : {}
  )
  const [loading, setLoading] = useState(
    !workspaceId || !isCacheValid(workspaceId)
  )

  const fetch = useCallback(async () => {
    if (!workspaceId) {
      setModuleConfig({})
      setLoading(false)
      return
    }
    try {
      const config = await fetchModuleConfig(workspaceId)
      setModuleConfig(config)
    } catch (err) {
      featureLogger.error("useFeatures fetch error", extractErrorMeta(err))
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    cacheListeners.add(fetch)
    return () => { cacheListeners.delete(fetch) }
  }, [fetch])

  return {
    moduleConfig,
    loading,
    isModuleEnabled: (module: ModuleKey) => checkModule(moduleConfig, module),
    isFeatureEnabled: (module: ModuleKey, feature: string) =>
      checkFeature(moduleConfig, module, feature),
    /** @deprecated use isModuleEnabled instead */
    isEnabled: (module: ModuleKey) => checkModule(moduleConfig, module),
  }
}

// ============================================================================
// Settings Hook — reads/writes module_config per workspace
// ============================================================================

export interface WorkspaceInfo {
  id: string
  name: string
  business_type: string
  module_config: WorkspaceModuleConfig
}

export function useFeatureManagement() {
  const { context } = useCurrentContext()
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [configs, setConfigs] = useState<Map<string, WorkspaceModuleConfig>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        if (!user) return

        const supabase = createClient()
        const { data, error } = await supabase
          .from("workspaces")
          .select("id, name, business_type, module_config")
          .eq("owner_user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })

        if (error || !data) return

        const ws: WorkspaceInfo[] = data.map((w: Record<string, unknown>) => ({
          id: w.id,
          name: w.name,
          business_type: w.business_type ?? 'other',
          module_config: (isOldFlatFormat(w.module_config)
            ? migrateOldFlagsToModuleConfig(w.module_config as Record<string, boolean>)
            : (w.module_config ?? {})) as WorkspaceModuleConfig,
        }))

        setWorkspaces(ws)

        const cfgMap = new Map<string, WorkspaceModuleConfig>()
        for (const w of ws) cfgMap.set(w.id, w.module_config)
        setConfigs(cfgMap)

        // Default-select the active context's workspace, or first workspace
        const activeId = context?.workspace_id
        const toSelect = activeId && ws.find((w) => w.id === activeId)
          ? activeId
          : ws[0]?.id ?? null
        setSelectedWorkspaceId(toSelect)
      } catch (err) {
        featureLogger.error("useFeatureManagement load error", extractErrorMeta(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [context?.workspace_id, user])

  const selectedConfig = selectedWorkspaceId
    ? (configs.get(selectedWorkspaceId) ?? {})
    : {}

  const setConfig = (workspaceId: string, config: WorkspaceModuleConfig) => {
    setConfigs((prev) => new Map(prev).set(workspaceId, config))
  }

  const saveConfig = async (workspaceId: string): Promise<boolean> => {
    const config = configs.get(workspaceId)
    if (!config) return false

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("workspaces")
        .update({ module_config: config })
        .eq("id", workspaceId)

      if (error) throw error

      invalidateFeatureCache(workspaceId)
      return true
    } catch (err) {
      featureLogger.error("useFeatureManagement save error", extractErrorMeta(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedConfig,
    configs,
    setConfig,
    saveConfig,
    loading,
    saving,
  }
}
