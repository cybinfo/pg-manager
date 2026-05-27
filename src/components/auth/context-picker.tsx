"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ContextWithDetails, CONTEXT_TYPE_CONFIG } from '@/lib/auth/types'
import { Building2, Crown, Users, Home, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatTimeAgo } from '@/lib/format'

interface ContextPickerProps {
  contexts: ContextWithDetails[]
  onSelect: (contextId: string, remember: boolean) => Promise<void>
  userName?: string
}

export function ContextPicker({ contexts, onSelect, userName }: ContextPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [remember, setRemember] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSelect = async (contextId: string) => {
    setSelectedId(contextId)
    setIsLoading(true)
    await onSelect(contextId, remember)
    setIsLoading(false)
  }

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'owner': return <Crown className="h-5 w-5" />
      case 'staff': return <Users className="h-5 w-5" />
      case 'tenant': return <Home className="h-5 w-5" />
      default: return <Building2 className="h-5 w-5" />
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose Your Account</CardTitle>
        <CardDescription>
          {userName ? `Welcome back, ${userName}!` : 'Welcome back!'} Select how you&apos;d like to continue:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {contexts.map((ctx) => {
          const config = CONTEXT_TYPE_CONFIG[ctx.context_type]
          const isSelected = selectedId === ctx.context_id

          return (
            <button
              key={ctx.context_id}
              onClick={() => handleSelect(ctx.context_id)}
              disabled={isLoading}
              className={cn(
                "w-full p-4 rounded-lg border-2 transition-all text-left",
                "hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected && "border-primary bg-primary/5",
                !isSelected && "border-muted",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  config.color
                )}>
                  {getContextIcon(ctx.context_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{ctx.workspace_name}</h3>
                    {ctx.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      config.color
                    )}>
                      {config.label}
                    </span>
                    {ctx.role_name && ctx.context_type === 'staff' && (
                      <span className="text-xs text-muted-foreground">
                        {ctx.role_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{ctx.last_accessed_at ? formatTimeAgo(ctx.last_accessed_at) : 'Never accessed'}</span>
                  </div>
                </div>

                <div className="flex items-center">
                  {isLoading && isSelected ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <ChevronRight className={cn(
                      "h-5 w-5 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                  )}
                </div>
              </div>
            </button>
          )
        })}

        <div className="flex items-center gap-2 pt-4 border-t">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked === true)}
          />
          <label
            htmlFor="remember"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Remember my choice for this device
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Compact Context Picker (for dialogs)
// ============================================

interface CompactContextPickerProps {
  contexts: ContextWithDetails[]
  currentContextId: string | null
  onSelect: (contextId: string) => void
}

export function CompactContextPicker({ contexts, currentContextId, onSelect }: CompactContextPickerProps) {
  return (
    <div className="space-y-1">
      {contexts.map((ctx) => {
        const config = CONTEXT_TYPE_CONFIG[ctx.context_type]
        const isSelected = currentContextId === ctx.context_id

        return (
          <button
            key={ctx.context_id}
            onClick={() => onSelect(ctx.context_id)}
            className={cn(
              "w-full p-3 rounded-lg flex items-center gap-3 transition-colors",
              "hover:bg-muted",
              isSelected && "bg-primary/10"
            )}
          >
            <span className="text-lg">{config.icon}</span>
            <div className="flex-1 text-left">
              <div className="font-medium text-sm">{ctx.workspace_name}</div>
              <div className="text-xs text-muted-foreground">
                {ctx.context_type === 'staff' ? ctx.role_name : config.label}
              </div>
            </div>
            {isSelected && (
              <span className="text-xs text-primary font-medium">Current</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
