"use client"

import { useState } from "react"
import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCurrentContext } from "@/lib/auth"

interface ConfigureDialogProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function ConfigureDialog({ title, description, children }: ConfigureDialogProps) {
  const [open, setOpen] = useState(false)
  const { isOwner } = useCurrentContext()

  if (!isOwner) return null

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4 mr-2" />
        Configure
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </DialogHeader>
          <div className="mt-2">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
