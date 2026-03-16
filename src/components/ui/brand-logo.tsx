import Link from "next/link"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { brandGradient } from "@/lib/design-tokens"

/**
 * BrandLogo Component
 *
 * Centralized ManageKar brand logo used across auth pages, public pages,
 * and the dashboard sidebar. Replaces 15+ duplicate logo patterns.
 *
 * @example
 * <BrandLogo />                          // Default md size, links to "/"
 * <BrandLogo size="sm" />                // Small variant (nav bars)
 * <BrandLogo size="lg" />                // Large variant (hero sections)
 * <BrandLogo hideText />                 // Icon only
 * <BrandLogo linkTo="/dashboard" />      // Custom link target
 * <BrandLogo linkTo={null} />            // No link wrapper
 */

type BrandLogoSize = "sm" | "md" | "lg"

interface BrandLogoProps {
  /** Size variant: sm (nav), md (default), lg (hero/auth) */
  size?: BrandLogoSize
  /** Hide the text, show only the icon */
  hideText?: boolean
  /** Link target. Pass null to render without a Link wrapper. Defaults to "/" */
  linkTo?: string | null
  /** Additional CSS classes for the outer wrapper */
  className?: string
}

const sizeConfig: Record<BrandLogoSize, {
  icon: string
  iconInner: string
  text: string
  gap: string
}> = {
  sm: {
    icon: "h-9 w-9",
    iconInner: "h-5 w-5",
    text: "text-xl",
    gap: "gap-2",
  },
  md: {
    icon: "h-10 w-10",
    iconInner: "h-6 w-6",
    text: "text-2xl",
    gap: "gap-2",
  },
  lg: {
    icon: "h-12 w-12",
    iconInner: "h-6 w-6",
    text: "text-2xl",
    gap: "gap-2",
  },
}

export function BrandLogo({
  size = "md",
  hideText = false,
  linkTo = "/",
  className,
}: BrandLogoProps) {
  const config = sizeConfig[size]

  const content = (
    <span className={cn("flex items-center", config.gap, className)}>
      <span
        className={cn(
          config.icon,
          `${brandGradient.solid} rounded-xl flex items-center justify-center shadow-md`
        )}
      >
        <Building2 className={cn(config.iconInner, "text-white")} />
      </span>
      {!hideText && (
        <span
          className={cn(
            config.text,
            `font-bold ${brandGradient.text}`
          )}
        >
          ManageKar
        </span>
      )}
    </span>
  )

  if (linkTo === null) {
    return content
  }

  return (
    <Link href={linkTo} className="flex items-center">
      {content}
    </Link>
  )
}
