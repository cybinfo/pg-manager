import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BrandLogo } from "@/components/ui/brand-logo"
import { brandGradient } from "@/lib/design-tokens"

/**
 * AuthCardLayout Component
 *
 * Shared layout for auth pages (login, register, forgot-password, reset-password).
 * Provides consistent gradient background, centered card, logo, title/description,
 * and footer links.
 *
 * @example
 * <AuthCardLayout
 *   title="Welcome back"
 *   description="Enter your credentials to access your account"
 *   footerLinks={
 *     <p className="text-sm text-center text-muted-foreground">
 *       Don't have an account? <Link href="/register">Sign up</Link>
 *     </p>
 *   }
 * >
 *   <form>...</form>
 * </AuthCardLayout>
 */

interface AuthCardLayoutProps {
  /** Card title */
  title: string
  /** Card description */
  description: string
  /** Form content rendered inside CardContent */
  children: React.ReactNode
  /** Optional footer content (links, extra text) rendered inside CardFooter */
  footerContent?: React.ReactNode
  /** Optional extra content between title and form (e.g., invite banner) */
  headerExtra?: React.ReactNode
  /** Whether to add vertical padding (for register page). Default false */
  verticalPadding?: boolean
}

export function AuthCardLayout({
  title,
  description,
  children,
  footerContent,
  headerExtra,
  verticalPadding = false,
}: AuthCardLayoutProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${brandGradient.pageBg} px-4${verticalPadding ? " py-8" : ""}`}>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {headerExtra}
        </CardHeader>
        {children}
        {footerContent && (
          <CardFooter className="flex flex-col gap-4">
            {footerContent}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
