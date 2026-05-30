export interface DeviceInfo {
  device_type: "desktop" | "mobile" | "tablet"
  browser: string
  os: string
}

export function parseUserAgent(ua: string): DeviceInfo {
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua)
  const isMobile = !isTablet && /Mobile|iPhone|Android|BlackBerry|IEMobile/i.test(ua)
  const device_type = isTablet ? "tablet" : isMobile ? "mobile" : "desktop"

  let browser = "Unknown"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/OPR\//i.test(ua)) browser = "Opera"
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari"
  else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer"

  let os = "Unknown"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) os = "macOS"
  else if (/iPhone|iPad/i.test(ua)) os = "iOS"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/Linux/i.test(ua)) os = "Linux"

  return { device_type, browser, os }
}

export function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return ""
  try {
    let fp = localStorage.getItem("session_fp")
    if (!fp) {
      fp = crypto.randomUUID()
      localStorage.setItem("session_fp", fp)
    }
    return fp
  } catch {
    return crypto.randomUUID()
  }
}
