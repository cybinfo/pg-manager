"use client"

import { PortalError } from "@/components/portal"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MemberPortalError({ error, reset }: ErrorPageProps) {
  return (
    <PortalError
      error={error}
      reset={reset}
      portalName="MemberPortal"
      homeHref="/member"
    />
  )
}
