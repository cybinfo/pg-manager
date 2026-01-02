"use client"

import { createContext, useContext, ReactNode } from "react"

// Demo mode configuration
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

// Demo owner credentials (for display only)
export const DEMO_CREDENTIALS = {
  email: "demo@managekar.com",
  password: "demo123",
}

// Demo mode context
interface DemoModeContextType {
  isDemoMode: boolean
  canPerformAction: (action: DemoAction) => boolean
  getDemoMessage: (action: DemoAction) => string
}

export type DemoAction =
  | "delete_tenant"
  | "delete_property"
  | "delete_room"
  | "delete_payment"
  | "delete_bill"
  | "delete_staff"
  | "send_email"
  | "send_whatsapp"
  | "export_data"
  | "change_settings"

// Actions that are blocked in demo mode
const BLOCKED_ACTIONS: DemoAction[] = [
  "delete_tenant",
  "delete_property",
  "delete_room",
  "delete_payment",
  "delete_bill",
  "delete_staff",
  "send_email",
  "send_whatsapp",
  "export_data",
]

// Messages for blocked actions
const ACTION_MESSAGES: Record<DemoAction, string> = {
  delete_tenant: "Deleting tenants is disabled in demo mode",
  delete_property: "Deleting properties is disabled in demo mode",
  delete_room: "Deleting rooms is disabled in demo mode",
  delete_payment: "Deleting payments is disabled in demo mode",
  delete_bill: "Deleting bills is disabled in demo mode",
  delete_staff: "Deleting staff is disabled in demo mode",
  send_email: "Email sending is disabled in demo mode",
  send_whatsapp: "WhatsApp messaging is disabled in demo mode",
  export_data: "Data export is disabled in demo mode",
  change_settings: "Settings can be changed but will reset on refresh",
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: DEMO_MODE,
  canPerformAction: () => true,
  getDemoMessage: () => "",
})

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const canPerformAction = (action: DemoAction): boolean => {
    if (!DEMO_MODE) return true
    return !BLOCKED_ACTIONS.includes(action)
  }

  const getDemoMessage = (action: DemoAction): string => {
    return ACTION_MESSAGES[action] || "This action is disabled in demo mode"
  }

  return (
    <DemoModeContext.Provider value={{ isDemoMode: DEMO_MODE, canPerformAction, getDemoMessage }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  return useContext(DemoModeContext)
}

// Utility to mask sensitive data in demo mode
export function maskData(data: string, type: "phone" | "email" | "name" | "address"): string {
  if (!DEMO_MODE) return data
  if (!data) return data

  switch (type) {
    case "phone":
      // Show first 4 and last 2 digits: +91 98XX XXX X10
      if (data.length >= 10) {
        return data.slice(0, 6) + "XX XXX X" + data.slice(-2)
      }
      return "XXXX XXXX XX"

    case "email":
      // Show first 2 chars and domain: de***@example.com
      const [localPart, domain] = data.split("@")
      if (localPart && domain) {
        return localPart.slice(0, 2) + "***@" + domain
      }
      return "***@***.com"

    case "name":
      // Show first name only: John D.
      const parts = data.split(" ")
      if (parts.length > 1) {
        return parts[0] + " " + parts[1].charAt(0) + "."
      }
      return data.charAt(0) + "***"

    case "address":
      // Show only city/area: ***, Bangalore
      const addressParts = data.split(",")
      if (addressParts.length > 1) {
        return "***," + addressParts.slice(-1)[0]
      }
      return "***"

    default:
      return data
  }
}

// Check if email/WhatsApp should be sent
export function shouldSendNotification(): boolean {
  return !DEMO_MODE
}

// Demo watermark component
export function DemoWatermark() {
  if (!DEMO_MODE) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="bg-amber-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Demo Mode</span>
        </div>
        <p className="text-xs text-amber-100 mt-1">Data shown is for demonstration only</p>
      </div>
    </div>
  )
}

// Demo banner for top of dashboard
export function DemoBanner() {
  if (!DEMO_MODE) return null

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 text-center text-sm">
      <span className="font-medium">Demo Mode Active</span>
      <span className="mx-2">|</span>
      <span>Some features are restricted. Data resets periodically.</span>
      <span className="mx-2">|</span>
      <a href="/register" className="underline hover:no-underline">
        Sign up for full access
      </a>
    </div>
  )
}
