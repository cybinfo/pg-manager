/**
 * Centralized Design Tokens
 *
 * Use these constants throughout the application for consistent styling.
 * Never hardcode colors, spacing, or other design values directly in components.
 */

// ============================================
// BRAND GRADIENTS
// Centralized gradient strings — import these instead of hardcoding teal/emerald gradients.
// ============================================
export const brandGradient = {
  /** Solid brand gradient (radial direction) for icons, avatars, containers */
  solid: "bg-gradient-to-br from-teal-500 to-emerald-500",
  /** Horizontal brand gradient for headers, progress bars, section backgrounds */
  horizontal: "bg-gradient-to-r from-teal-500 to-emerald-500",
  /** Auth/page background — light teal/emerald wash with dark mode support */
  pageBg: "bg-gradient-to-br from-teal-50 via-background to-emerald-50 dark:from-teal-950 dark:via-background dark:to-emerald-950",
  /** Active nav item styling */
  navActive: "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20",
  /** Gradient text (for brand name, headings) */
  text: "bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent",
  /** Button gradient with hover states */
  button: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600",
  /** Gradient direction values only (no bg-gradient prefix) — for configs that compose their own prefix */
  values: "from-teal-500 to-emerald-500",
  /** Member/library portal gradient values — purple/indigo distinguishes library from PG */
  memberValues: "from-purple-500 to-indigo-500",
  /** Member/library portal solid gradient (full class) */
  memberSolid: "bg-gradient-to-r from-purple-500 to-indigo-500",
  /** Brand shadow accent */
  shadow: "shadow-teal-500/20",
  /** Larger brand shadow accent */
  shadowLg: "shadow-teal-500/25",
} as const

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
    tenant: brandGradient.values,   // gradient
    property: brandGradient.values, // gradient
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
