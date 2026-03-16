/**
 * DataTable Column Factories
 *
 * Reusable column factories to reduce duplication across list pages.
 * Each factory creates a Column<T> with common patterns.
 *
 * @example
 * import { createAvatarNameColumn, createCurrencyColumn } from "@/lib/columns/factories"
 *
 * const columns: Column<Tenant>[] = [
 *   createAvatarNameColumn<Tenant>({
 *     getName: (t) => t.person?.name || t.name,
 *     getPhotoUrl: (t) => t.person?.photo_url || t.photo_url,
 *     getSubtitle: (t) => t.phone,
 *   }),
 *   createCurrencyColumn<Tenant>("monthly_rent", "Rent"),
 * ]
 */

import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { Avatar } from "@/components/ui/avatar"
import { PropertyLink, RoomLink, TenantLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate, formatDateTime, formatTimeAgo } from "@/lib/format"
import { getStatusInfo } from "@/lib/status-config"
import { brandGradient } from "@/lib/design-tokens"

// ============================================================================
// TYPES
// ============================================================================

type EntityType = Parameters<typeof getStatusInfo>[0]

// ============================================================================
// AVATAR + NAME COLUMN
// ============================================================================

interface AvatarNameColumnConfig<T> {
  key?: string
  header?: string
  getName: (item: T) => string
  getPhotoUrl?: (item: T) => string | null | undefined
  getSubtitle?: (item: T) => string | null | undefined
  sortKey?: string
  avatarClassName?: string
}

/**
 * Creates an avatar + name column with optional subtitle
 * Used in: tenants, staff, payments, refunds, visitors, people
 */
export function createAvatarNameColumn<T>(
  config: AvatarNameColumnConfig<T>
): Column<T> {
  const {
    key = "name",
    header = "Name",
    getName,
    getPhotoUrl,
    getSubtitle,
    sortKey,
    avatarClassName = `${brandGradient.solid} text-white shrink-0`,
  } = config

  return {
    key,
    header,
    width: "primary",
    sortable: true,
    sortKey,
    render: (item: T) => {
      const name = getName(item)
      const photoUrl = getPhotoUrl?.(item)
      const subtitle = getSubtitle?.(item)

      return (
        <div className="flex items-center gap-3">
          <Avatar
            name={name}
            src={photoUrl || undefined}
            size="sm"
            className={avatarClassName}
          />
          <div className="min-w-0">
            <div className="font-medium truncate">{name}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
      )
    },
  }
}

// ============================================================================
// CURRENCY COLUMN
// ============================================================================

interface CurrencyColumnOptions {
  key?: string
  sortable?: boolean
  hideOnMobile?: boolean
  colorClass?: string
  getSubtext?: <T>(item: T) => string | null | undefined
}

/**
 * Creates a currency-formatted column
 * Used in: payments, bills, expenses, refunds, tenants
 */
export function createCurrencyColumn<T>(
  valueKey: keyof T,
  header: string,
  options: CurrencyColumnOptions = {}
): Column<T> {
  const {
    key = valueKey as string,
    sortable = true,
    hideOnMobile = false,
    colorClass = "font-medium tabular-nums",
    getSubtext,
  } = options

  return {
    key,
    header,
    width: "amount",
    sortable,
    sortType: "number",
    hideOnMobile,
    render: (item: T) => {
      const value = Number(item[valueKey] || 0)
      const subtext = getSubtext?.<T>(item)

      return (
        <div className="text-right">
          <span className={colorClass}>{formatCurrency(value)}</span>
          {subtext && (
            <div className="text-xs text-muted-foreground">{subtext}</div>
          )}
        </div>
      )
    },
  }
}

// ============================================================================
// DATE COLUMN
// ============================================================================

type DateFormat = "date" | "datetime" | "timeAgo"

interface DateColumnOptions {
  key?: string
  format?: DateFormat
  sortable?: boolean
  hideOnMobile?: boolean
}

/**
 * Creates a date-formatted column
 * Used in: tenants, payments, complaints, bills, visitors
 */
export function createDateColumn<T>(
  dateKey: keyof T,
  header: string,
  options: DateColumnOptions = {}
): Column<T> {
  const {
    key = dateKey as string,
    format = "date",
    sortable = true,
    hideOnMobile = false,
  } = options

  const formatters: Record<DateFormat, (date: string) => string> = {
    date: formatDate,
    datetime: formatDateTime,
    timeAgo: formatTimeAgo,
  }

  return {
    key,
    header,
    width: "date",
    sortable,
    sortType: "date",
    hideOnMobile,
    render: (item: T) => {
      const dateValue = item[dateKey] as string | null
      if (!dateValue) return <span>—</span>
      return <span>{formatters[format](dateValue)}</span>
    },
  }
}

// ============================================================================
// STATUS COLUMN
// ============================================================================

interface StatusColumnOptions {
  key?: string
  header?: string
  sortable?: boolean
}

/**
 * Creates a status dot column using centralized status config
 * Used in: tenants, complaints, visitors, approvals, refunds, exit-clearance
 */
export function createStatusColumn<T>(
  statusKey: keyof T,
  entityType: EntityType,
  options: StatusColumnOptions = {}
): Column<T> {
  const {
    key = statusKey as string,
    header = "Status",
    sortable = true,
  } = options

  return {
    key,
    header,
    width: "status",
    sortable,
    render: (item: T) => {
      const statusValue = item[statusKey] as string
      const info = getStatusInfo(entityType, statusValue)
      return <StatusDot status={info.status} label={info.label} />
    },
  }
}

// ============================================================================
// BADGE COLUMN
// ============================================================================

interface BadgeColumnConfig<T> {
  key: string
  header: string
  getLabel: (item: T) => string
  getVariant?: (item: T) => "default" | "success" | "warning" | "error" | "muted"
  hideOnMobile?: boolean
  sortable?: boolean
}

/**
 * Creates a badge column
 * Used in: payments (method), complaints (priority), visitors (type)
 */
export function createBadgeColumn<T>(config: BadgeColumnConfig<T>): Column<T> {
  const {
    key,
    header,
    getLabel,
    getVariant = () => "default",
    hideOnMobile = false,
    sortable = true,
  } = config

  return {
    key,
    header,
    width: "badge",
    hideOnMobile,
    sortable,
    render: (item: T) => (
      <TableBadge variant={getVariant(item)}>{getLabel(item)}</TableBadge>
    ),
  }
}

// ============================================================================
// PROPERTY/ROOM COLUMN
// ============================================================================

interface PropertyRoomColumnOptions {
  showRoom?: boolean
  showAsLinks?: boolean
  header?: string
}

interface WithPropertyRoom {
  property?: { id: string; name: string } | null
  room?: { id: string; room_number: string } | null
}

/**
 * Creates a property (and optionally room) column
 * Used in: tenants, complaints, visitors, payments
 */
export function createPropertyRoomColumn<T extends WithPropertyRoom>(
  options: PropertyRoomColumnOptions = {}
): Column<T> {
  const { showRoom = true, showAsLinks = false, header = "Property" } = options

  return {
    key: "property",
    header: showRoom ? `${header} / Room` : header,
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    render: (item: T) => (
      <div className="text-sm min-w-0">
        {showAsLinks && item.property ? (
          <PropertyLink id={item.property.id} name={item.property.name} size="sm" />
        ) : (
          <div className="truncate">{item.property?.name || "—"}</div>
        )}
        {showRoom && (
          showAsLinks && item.room ? (
            <div>
              <RoomLink id={item.room.id} roomNumber={item.room.room_number} size="sm" />
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">
              Room {item.room?.room_number || "—"}
            </div>
          )
        )}
      </div>
    ),
  }
}

// ============================================================================
// TENANT LINK COLUMN
// ============================================================================

interface TenantColumnOptions {
  showPhone?: boolean
  showProperty?: boolean
}

interface WithTenant {
  tenant?: { id: string; name: string; phone?: string } | null
  property?: { id: string; name: string } | null
}

/**
 * Creates a tenant link column with optional phone/property
 * Used in: payments, bills, complaints, refunds
 */
export function createTenantColumn<T extends WithTenant>(
  options: TenantColumnOptions = {}
): Column<T> {
  const { showPhone = true, showProperty = false } = options

  return {
    key: "tenant",
    header: "Tenant",
    width: "primary",
    sortable: true,
    sortKey: "tenant.name",
    render: (item: T) => (
      <div className="min-w-0">
        {item.tenant ? (
          <TenantLink id={item.tenant.id} name={item.tenant.name} showIcon={false} />
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        )}
        {showPhone && item.tenant?.phone && (
          <div className="text-xs text-muted-foreground">{item.tenant.phone}</div>
        )}
        {showProperty && item.property && (
          <div>
            <PropertyLink id={item.property.id} name={item.property.name} size="sm" />
          </div>
        )}
      </div>
    ),
  }
}

// ============================================================================
// ACTIONS COLUMN
// ============================================================================

interface ActionsColumnConfig<T> {
  renderActions: (item: T) => React.ReactNode
}

/**
 * Creates an actions column (for buttons, icons, etc.)
 * Used in: payments (WhatsApp), complaints (assign), etc.
 */
export function createActionsColumn<T>(config: ActionsColumnConfig<T>): Column<T> {
  return {
    key: "actions",
    header: "",
    width: "actions",
    render: (item: T) => (
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {config.renderActions(item)}
      </div>
    ),
  }
}
