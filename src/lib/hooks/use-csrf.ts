"use client"

import { useCallback } from "react"
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf"

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === CSRF_COOKIE_NAME && value) {
      try {
        const decoded = atob(value)
        const data = JSON.parse(decoded)
        if (data.token && data.expires > Date.now()) {
          return data.token
        }
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Hook to get CSRF token and helpers for protected API calls
 */
export function useCsrf() {
  const getToken = useCallback(() => getCsrfToken(), [])

  /**
   * Make a fetch request with CSRF token automatically included
   */
  const secureFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = getCsrfToken()

      const headers = new Headers(options.headers)
      if (token) {
        headers.set(CSRF_HEADER_NAME, token)
      }

      return fetch(url, {
        ...options,
        headers,
      })
    },
    []
  )

  /**
   * Make a POST request with CSRF token and JSON body
   */
  const securePost = useCallback(
    async <T>(url: string, data: T): Promise<Response> => {
      const token = getCsrfToken()

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (token) {
        headers[CSRF_HEADER_NAME] = token
      }

      return fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })
    },
    []
  )

  return {
    getToken,
    secureFetch,
    securePost,
  }
}

/**
 * Standalone function to get CSRF token (for non-hook usage)
 */
export { getCsrfToken }

/**
 * Standalone function to make secure fetch requests
 */
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getCsrfToken()

  const headers = new Headers(options.headers)
  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
