const DEVICE_TRUST_KEY = "mk_device_trusted"
const TRUST_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface DeviceTrust {
  email: string
  expiresAt: number
}

export function isDeviceTrusted(email: string): boolean {
  try {
    const stored = localStorage.getItem(DEVICE_TRUST_KEY)
    if (!stored) return false
    const trust: DeviceTrust = JSON.parse(stored)
    if (trust.email !== email) return false
    if (Date.now() > trust.expiresAt) {
      localStorage.removeItem(DEVICE_TRUST_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function trustDevice(email: string): void {
  localStorage.setItem(
    DEVICE_TRUST_KEY,
    JSON.stringify({ email, expiresAt: Date.now() + TRUST_DURATION_MS })
  )
}

export function clearDeviceTrust(): void {
  localStorage.removeItem(DEVICE_TRUST_KEY)
}
