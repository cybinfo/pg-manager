/**
 * Contact Information Constants
 *
 * Centralized contact info used across public pages, emails, and PDFs.
 * Import from here instead of hardcoding values.
 *
 * @example
 * import { CONTACT } from "@/lib/constants/contact"
 *
 * const mailtoLink = `mailto:${CONTACT.SUPPORT_EMAIL}`
 * const whatsappLink = CONTACT.WHATSAPP_URL
 */

export const CONTACT = {
  SUPPORT_EMAIL: "support@managekar.com",
  PRIVACY_EMAIL: "privacy@managekar.com",
  LEGAL_EMAIL: "legal@managekar.com",
  PHONE: "+91 78274 74789",
  PHONE_RAW: "917827474789",
  APP_URL: "https://managekar.com",
  WHATSAPP_URL: "https://wa.me/917827474789",
  APP_NAME: "ManageKar",
} as const
