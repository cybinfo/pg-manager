import { Users, Search, Wrench, User, type LucideIcon } from "lucide-react"
import type { VisitorType } from "@/types/visitors.types"

export const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: "bg-info/10 text-info border-info/20",
  enquiry: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  service_provider: "bg-warning/10 text-warning border-warning/20",
  general: "bg-muted text-foreground border-border",
}

export const VISITOR_TYPE_ICONS: Record<VisitorType, LucideIcon> = {
  tenant_visitor: Users,
  enquiry: Search,
  service_provider: Wrench,
  general: User,
}
