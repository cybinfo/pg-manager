"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useCurrentContext, useAuth } from '@/lib/auth'
import { CONTEXT_TYPE_CONFIG } from '@/lib/auth/types'
import {
  ChevronDown,
  Check,
  Plus,
  Crown,
  Users,
  Home,
  Settings,
  Star,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ContextSwitcher() {
  const router = useRouter()
  const { context, contexts, switchContext, hasMultipleContexts } = useCurrentContext()
  const { setDefaultContext } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'owner': return <Crown className="h-4 w-4" />
      case 'staff': return <Users className="h-4 w-4" />
      case 'tenant': return <Home className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const handleSwitch = async (contextId: string) => {
    if (contextId === context?.context_id) return

    setSwitchingTo(contextId)
    setIsLoading(true)

    const success = await switchContext(contextId)

    if (success) {
      const targetContext = contexts.find(c => c.context_id === contextId)

      // Redirect based on context type
      if (targetContext?.context_type === 'tenant') {
        router.push('/tenant')
      } else {
        router.push('/dashboard')
      }

      toast.success(`Switched to ${targetContext?.workspace_name}`)
    } else {
      toast.error('Failed to switch context')
    }

    setIsLoading(false)
    setSwitchingTo(null)
  }

  const handleSetDefault = async (contextId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const success = await setDefaultContext(contextId)
    if (success) {
      toast.success('Default account updated')
    } else {
      toast.error('Failed to update default')
    }
  }

  if (!context) {
    return null
  }

  const config = CONTEXT_TYPE_CONFIG[context.context_type]

  // If only one context, show simple display
  if (!hasMultipleContexts) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
        <span className={cn("p-1 rounded", config.color)}>
          {getContextIcon(context.context_type)}
        </span>
        <div className="hidden sm:block">
          <div className="text-sm font-medium leading-none">{context.workspace_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {context.context_type === 'staff' ? context.role_name : config.label}
          </div>
        </div>
      </div>
    )
  }

  // Multiple contexts - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3" disabled={isLoading}>
          <span className={cn("p-1 rounded", config.color)}>
            {getContextIcon(context.context_type)}
          </span>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium leading-none">{context.workspace_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {context.context_type === 'staff' ? context.role_name : config.label}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch Account
        </DropdownMenuLabel>

        {contexts.map((ctx) => {
          const ctxConfig = CONTEXT_TYPE_CONFIG[ctx.context_type]
          const isCurrent = ctx.context_id === context.context_id
          const isSwitching = switchingTo === ctx.context_id

          return (
            <DropdownMenuItem
              key={ctx.context_id}
              onClick={() => handleSwitch(ctx.context_id)}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-3 py-3 cursor-pointer",
                isCurrent && "bg-primary/5"
              )}
            >
              <span className={cn("p-1.5 rounded", ctxConfig.color)}>
                {getContextIcon(ctx.context_type)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{ctx.workspace_name}</span>
                  {ctx.is_default && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ctx.context_type === 'staff' ? ctx.role_name : ctxConfig.label}
                </div>
              </div>

              {isSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : isCurrent ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <button
                  onClick={(e) => handleSetDefault(ctx.context_id, e)}
                  className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Set as default"
                >
                  <Star className="h-3 w-3 text-muted-foreground hover:text-amber-500" />
                </button>
              )}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push('/register')}
          className="gap-2 text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          Add New PG Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================
// Mobile Context Switcher
// ============================================

export function MobileContextSwitcher() {
  const { context, contexts, hasMultipleContexts } = useCurrentContext()

  if (!context || !hasMultipleContexts) {
    return null
  }

  const config = CONTEXT_TYPE_CONFIG[context.context_type]

  return (
    <div className="sm:hidden px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-2 text-sm">
        <span>{config.icon}</span>
        <span className="font-medium">{context.workspace_name}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground text-xs">
          {contexts.length} accounts
        </span>
      </div>
    </div>
  )
}
