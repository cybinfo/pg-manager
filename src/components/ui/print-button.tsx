"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PrintButtonProps {
  className?: string
  label?: string
}

export function PrintButton({ className, label = "Print" }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className={className}
    >
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}
