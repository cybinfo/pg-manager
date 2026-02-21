"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface QuickActionLinkProps {
  /** Link destination */
  href: string
  /** Icon for the action */
  icon: LucideIcon
  /** Action title */
  title: string
  /** Action description */
  description: string
  /** Tailwind bg class for the icon background, e.g. "bg-emerald-50" */
  bgColor: string
  /** Tailwind text color class for the icon, e.g. "text-emerald-600" */
  iconColor: string
}

export function QuickActionLink({
  href,
  icon: Icon,
  title,
  description,
  bgColor,
  iconColor,
}: QuickActionLinkProps) {
  return (
    <Link href={href} className="block">
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${bgColor} rounded-lg`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}
