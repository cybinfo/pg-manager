"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

export function DataTableLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export function DataTableError({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      {children}
    </div>
  )
}

export function DataTableEmpty({ children }: { children?: React.ReactNode }) {
  return (
    <div className="py-12">
      {children || (
        <p className="text-center text-muted-foreground">No data found</p>
      )}
    </div>
  )
}
