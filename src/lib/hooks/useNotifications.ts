"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { getNowISO } from "@/lib/date-helpers"

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  action_url: string | null
  data: Record<string, unknown> | null
  read: boolean
  read_at: string | null
  created_at: string
}

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => void
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = useRef(createClient()).current

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) setNotifications(data as Notification[])
    setIsLoading(false)
  }, [user, supabase])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const markAsRead = useCallback(
    async (id: string) => {
      await supabase
        .from("notifications")
        .update({ read: true, read_at: getNowISO() })
        .eq("id", id)

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, read_at: getNowISO() } : n
        )
      )
    },
    [supabase]
  )

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    await supabase
      .from("notifications")
      .update({ read: true, read_at: getNowISO() })
      .eq("user_id", user.id)
      .eq("read", false)

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, read_at: getNowISO() }))
    )
  }, [user, supabase])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
