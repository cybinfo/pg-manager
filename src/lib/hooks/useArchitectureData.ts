"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { ArchProperty, ArchRoom } from "@/app/(dashboard)/architecture/_components"

interface Tenant {
  id: string
  name: string
  phone: string
  room_id: string
  check_in_date: string
}

interface UseArchitectureDataResult {
  loading: boolean
  properties: ArchProperty[]
  rooms: ArchRoom[]
  tenants: Tenant[]
}

export function useArchitectureData(): UseArchitectureDataResult {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<ArchProperty[]>([])
  const [rooms, setRooms] = useState<ArchRoom[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesResult, roomsResult, tenantsResult] = await Promise.all([
        supabase
          .from("entities")
          .select("id, name, address, rooms(id, total_beds, occupied_beds)")
          .eq("type", "pg")
          .order("name"),
        supabase
          .from("rooms")
          .select("id, room_number, room_type, floor, total_beds, occupied_beds, rent_amount, status, entity_id")
          .order("floor")
          .order("room_number"),
        supabase
          .from("tenants")
          .select("id, name, phone, room_id, check_in_date")
          .eq("status", "active"),
      ])

      if (cancelled) return

      if (propertiesResult.error) {
        logger.error("Architecture: error fetching properties", { detail: propertiesResult.error })
      } else {
        const transformed = (propertiesResult.data || []).map(
          (p: { id: string; name: string; address?: string | null; rooms: unknown }) => {
            const pRooms = Array.isArray(p.rooms) ? p.rooms : []
            return {
              id: p.id,
              name: p.name,
              address: p.address || "",
              total_rooms: pRooms.length,
              total_beds: pRooms.reduce((sum: number, r: { total_beds: number }) => sum + (r.total_beds || 0), 0),
              occupied_beds: pRooms.reduce((sum: number, r: { occupied_beds: number }) => sum + (r.occupied_beds || 0), 0),
            }
          }
        )
        setProperties(transformed)
      }

      if (!propertiesResult.error && !roomsResult.error) {
        setRooms(roomsResult.data || [])
      }

      if (!tenantsResult.error) {
        setTenants(tenantsResult.data || [])
      }

      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  return { loading, properties, rooms, tenants }
}
