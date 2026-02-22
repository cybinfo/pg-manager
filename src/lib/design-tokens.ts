/**
 * Centralized Design Tokens
 *
 * Use these constants throughout the application for consistent styling.
 * Never hardcode colors, spacing, or other design values directly in components.
 */

// ============================================
// COLORS
// ============================================
export const colors = {
  // Brand colors
  brand: {
    primary: "teal",      // Main brand color
    secondary: "emerald", // Secondary brand color
    accent: "amber",      // Accent/CTA color
  },

  // Semantic colors (use these in components)
  semantic: {
    success: "emerald",
    warning: "amber",
    error: "rose",
    info: "blue",
    muted: "slate",
  },

  // Status-specific colors
  status: {
    active: "emerald",
    inactive: "slate",
    pending: "amber",
    overdue: "rose",
    paid: "emerald",
    partial: "amber",
  },

  // Entity-specific icon backgrounds
  entity: {
    tenant: "from-teal-500 to-emerald-500",   // gradient
    property: "from-teal-500 to-emerald-500", // gradient
    room: "violet-100",
    payment: "emerald-100",
    bill: "blue-100",
    expense: "rose-100",
    meter: "yellow-100",
    visitor: "green-100",
    notice: "blue-100",
    complaint: "orange-100",
    staff: "primary/10",
  },
} as const

// ============================================
// TAILWIND CLASS MAPPINGS
// Use these for consistent component styling
// ============================================
export const statusColors = {
  success: {
    bg: "bg-success/10",
    text: "text-success",
    dot: "bg-success",
    border: "border-success/20",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    dot: "bg-warning",
    border: "border-warning/20",
  },
  error: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    dot: "bg-destructive",
    border: "border-destructive/20",
  },
  info: {
    bg: "bg-info/10",
    text: "text-info",
    dot: "bg-info",
    border: "border-info/20",
  },
  muted: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    border: "border-border",
  },
} as const

// ============================================
// SPACING
// ============================================
export const spacing = {
  // Page layout
  page: {
    padding: "p-4 md:p-6",
    gap: "space-y-6",
  },

  // Card/Section spacing
  section: {
    padding: "p-4 md:p-6",
    gap: "space-y-4",
  },

  // List item spacing
  listItem: {
    padding: "px-4 py-3",
    gap: "gap-4",
  },

  // Form spacing
  form: {
    gap: "space-y-4",
    fieldGap: "space-y-2",
  },

  // Grid gaps
  grid: {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  },
} as const

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  // Page titles
  pageTitle: "text-2xl font-bold tracking-tight",
  pageDescription: "text-sm text-muted-foreground",

  // Section titles
  sectionTitle: "text-lg font-semibold",
  sectionDescription: "text-sm text-muted-foreground",

  // Card titles
  cardTitle: "font-medium",
  cardDescription: "text-sm text-muted-foreground",

  // Labels
  label: "text-sm font-medium",
  labelMuted: "text-xs text-muted-foreground",

  // Data display
  value: "font-semibold tabular-nums",
  valueLarge: "text-2xl font-bold tabular-nums",
  currency: "font-semibold tabular-nums",

  // Table
  tableHeader: "text-xs font-medium text-muted-foreground uppercase tracking-wider",
  tableCell: "text-sm",
} as const

// ============================================
// BORDERS & RADIUS
// ============================================
export const borders = {
  radius: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full",
  },

  style: {
    default: "border",
    card: "border shadow-sm",
    input: "border border-input",
  },
} as const

// ============================================
// SHADOWS
// ============================================
export const shadows = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  card: "shadow-sm",
  dropdown: "shadow-lg",
} as const

// ============================================
// ANIMATIONS
// ============================================
export const animations = {
  // Transitions
  transition: {
    default: "transition-colors",
    all: "transition-all",
    fast: "transition-colors duration-150",
    slow: "transition-all duration-300",
  },

  // Hover states
  hover: {
    lift: "hover:-translate-y-0.5 hover:shadow-md",
    scale: "hover:scale-105",
    bg: "hover:bg-muted",
    bgAccent: "hover:bg-accent",
  },

  // Loading
  spin: "animate-spin",
  pulse: "animate-pulse",
} as const

// ============================================
// COMPONENT PRESETS
// Use these for consistent component styling
// ============================================
export const presets = {
  // Card styles
  card: {
    base: "bg-card rounded-xl border shadow-sm",
    interactive: "bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer",
    elevated: "bg-card rounded-xl shadow-md",
  },

  // Button icon containers
  iconContainer: {
    sm: "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
    md: "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
    lg: "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
    round: "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
    roundMd: "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
  },

  // Avatar styles
  avatar: {
    sm: "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
    md: "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
    lg: "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold",
  },

  // Badge styles
  badge: {
    base: "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
  },

  // Empty state
  emptyState: {
    container: "flex flex-col items-center py-8",
    icon: "h-12 w-12 text-muted-foreground/50 mb-4",
    title: "text-lg font-medium mb-2",
    description: "text-muted-foreground text-center mb-4",
  },

  // Loading state
  loading: {
    container: "flex items-center justify-center h-64",
    icon: "h-8 w-8 animate-spin text-primary",
  },

  // Table row
  tableRow: {
    base: "px-4 py-3 transition-colors",
    clickable: "px-4 py-3 transition-colors cursor-pointer hover:bg-muted",
  },

  // Metrics bar
  metricsBar: {
    container: "grid grid-cols-2 md:grid-cols-4 gap-4",
    item: "flex items-center gap-3 p-4 bg-card rounded-xl border shadow-sm",
  },
} as const

// ============================================
// ICON SIZES
// ============================================
export const iconSizes = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const

// ============================================
// Z-INDEX LAYERS
// Uses CSS custom properties defined in globals.css:
//   --z-dropdown: 40   (dropdowns, popovers, tooltips)
//   --z-sticky: 45     (sticky headers, sidebars)
//   --z-modal: 50      (modals, overlays, mobile nav)
//   --z-dialog: 100    (command palette, shortcuts dialog)
//   --z-lightbox: 150  (image lightbox, cropper)
//   --z-toast: 200     (toast notifications)
// ============================================
export const zIndex = {
  dropdown: "z-[var(--z-dropdown)]",
  sticky: "z-[var(--z-sticky)]",
  modal: "z-[var(--z-modal)]",
  dialog: "z-[var(--z-dialog)]",
  lightbox: "z-[var(--z-lightbox)]",
  toast: "z-[var(--z-toast)]",
  overlay: "z-40",
  header: "z-30",
  sidebar: "z-20",
} as const
