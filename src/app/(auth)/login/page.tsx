"use client"

import { useState, Suspense, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getSession } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ContextPicker } from "@/components/auth/context-picker"
import { ContextWithDetails } from "@/lib/auth/types"

type LoginStep = 'credentials' | 'context-picker'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")
  const inviteToken = searchParams.get("invite")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [contexts, setContexts] = useState<ContextWithDetails[]>([])
  const [userName, setUserName] = useState<string>('')

  const supabase = createClient()
  const mountedRef = useRef(true)

  // Check for existing session on mount using centralized session handling
  useEffect(() => {
    mountedRef.current = true

    const checkSession = async () => {
      // Use centralized session check
      const sessionResult = await getSession()

      if (sessionResult.error) {
        // Session check failed - this is expected for non-logged in users
        console.log('[Login] No existing session:', sessionResult.error.message)
        return
      }

      if (!sessionResult.session?.user) {
        return
      }

      if (!mountedRef.current) return

      const user = sessionResult.session.user

      // User already logged in, fetch contexts
      const { data: userContexts, error: contextError } = await supabase.rpc('get_user_contexts', {
        p_user_id: user.id
      })

      if (contextError) {
        console.error('[Login] Error fetching contexts:', contextError)
        // Redirect to dashboard anyway - it will handle setup
        router.push('/dashboard')
        return
      }

      if (!mountedRef.current) return

      if (userContexts && userContexts.length > 0) {
        if (userContexts.length === 1) {
          // Single context - redirect directly
          handleContextSelect(userContexts[0].context_id, false)
        } else {
          // Multiple contexts - show picker
          setContexts(userContexts)
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '')
          setStep('context-picker')
        }
      } else {
        // No contexts - redirect to dashboard (will handle setup)
        router.push('/dashboard')
      }
    }
    checkSession()

    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (!data.user) {
        toast.error("Login failed")
        return
      }

      // Fetch user contexts
      const { data: userContexts, error: ctxError } = await supabase.rpc('get_user_contexts', {
        p_user_id: data.user.id
      })

      if (ctxError) {
        console.error('Error fetching contexts:', ctxError)
        // Fallback to old behavior
        toast.success("Welcome back!")
        router.push(redirectTo || '/dashboard')
        router.refresh()
        return
      }

      const contextsArray = (userContexts || []) as ContextWithDetails[]

      if (contextsArray.length === 0) {
        // No contexts - likely a new owner, redirect to setup or dashboard
        toast.success("Welcome back!")
        router.push(redirectTo || '/dashboard')
        // Don't use router.refresh() - it causes full page reload and remount issues
      } else if (contextsArray.length === 1) {
        // Single context - log switch and redirect
        await handleContextSelect(contextsArray[0].context_id, false)
      } else {
        // Multiple contexts - show picker
        setContexts(contextsArray)
        setUserName(data.user.user_metadata?.name || data.user.email?.split('@')[0] || '')
        setStep('context-picker')
        toast.success("Welcome back!")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleContextSelect = async (contextId: string, remember: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Log the context switch
      await supabase.rpc('switch_context', {
        p_user_id: user.id,
        p_to_context_id: contextId,
        p_from_context_id: null,
      })

      // Store in localStorage
      localStorage.setItem('currentContextId', contextId)

      if (remember) {
        // Set as default context
        await supabase.rpc('set_default_context', {
          p_user_id: user.id,
          p_context_id: contextId,
        })
      }

      // Determine redirect based on context type
      const selectedContext = contexts.find(c => c.context_id === contextId)

      if (selectedContext?.context_type === 'tenant') {
        router.push('/tenant')
      } else if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.push('/dashboard')
      }
      // Don't use router.refresh() - it causes full page reload and remount issues
    } catch (error) {
      console.error('Error selecting context:', error)
      toast.error('Failed to select account')
    }
  }

  // Show context picker
  if (step === 'context-picker') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">ManageKar</span>
            </Link>
          </div>

          <ContextPicker
            contexts={contexts}
            onSelect={handleContextSelect}
            userName={userName}
          />

          <p className="text-center text-sm text-muted-foreground mt-4">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setStep('credentials')
                setContexts([])
              }}
              className="text-primary hover:underline"
            >
              Sign in with a different account
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Show login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">ManageKar</span>
            </Link>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
          {inviteToken && (
            <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg">
              Sign in to accept your invitation
            </div>
          )}
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up free
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
