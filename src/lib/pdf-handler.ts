/**
 * PDF Generation Handler
 *
 * Centralized handler for PDF receipt generation routes.
 * Extracts the common pattern: rate limiting, UUID validation, auth,
 * access control, owner data fetch, PDF render, and response.
 *
 * @example
 * export async function GET(request, { params }) {
 *   return handlePdfGeneration(request, params, MY_PDF_CONFIG)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createContentDisposition, sanitizeFilename } from "@/lib/format"
import { apiLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import {
  apiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  internalError,
  ErrorCodes,
} from "@/lib/api-response"
import { checkStaffPermission } from "@/lib/supabase/auth-helpers"
import { isValidUUID } from "@/lib/validators"
import { apiLogger, extractErrorMeta } from "@/lib/logger"
import type { SupabaseClient, User } from "@supabase/supabase-js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface OwnerData {
  name?: string
  phone?: string
  email?: string
  business_name?: string
}

export interface PdfRouteConfig<TReceiptData> {
  /** Table to query (e.g. "payments", "library_payments") */
  table: string
  /** Supabase select query with joins */
  select: string
  /** Permission string for staff access check (e.g. "payments.view") */
  permission: string
  /** Filename prefix for the downloaded PDF (e.g. "receipt", "library-receipt") */
  filenamePrefix: string
  /** Optional: check if the authenticated user is the end-user for this payment */
  checkEndUserAccess?: (payment: AnyRecord, user: User) => boolean
  /** Build receipt data from fetched payment and owner */
  buildReceiptData: (payment: AnyRecord, owner: OwnerData | null) => TReceiptData
  /** Render the PDF React element from receipt data */
  renderPdf: (data: TReceiptData) => React.ReactElement
}

/**
 * Handle a PDF generation GET request with standard security checks.
 *
 * Flow: rate limit -> UUID validation -> auth -> fetch payment ->
 *       access control (owner/staff/end-user) -> fetch owner -> render PDF
 */
export async function handlePdfGeneration<TReceiptData>(
  request: NextRequest,
  params: Promise<{ id: string }>,
  config: PdfRouteConfig<TReceiptData>
): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await apiLimiter.check(clientId)

    if (!rateLimitResult.success) {
      return apiError(ErrorCodes.TOO_MANY_REQUESTS, "Rate limit exceeded. Please try again later.", {
        status: 429,
        details: { retryAfter: rateLimitResult.retryAfter },
        headers: rateLimitHeaders(rateLimitResult),
      })
    }

    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return badRequest("Invalid payment ID format")
    }

    const supabase: SupabaseClient = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorized()
    }

    // Fetch payment with related data
    const { data: payment, error: paymentError } = await supabase
      .from(config.table)
      .select(config.select)
      .eq("id", id)
      .single()

    if (paymentError || !payment) {
      return notFound("Payment not found")
    }

    // Cast to AnyRecord since Supabase can't infer schema from dynamic table name
    const record = payment as AnyRecord

    // Access control: owner, end-user, or authorized staff
    const isOwner = record.owner_id === user.id
    const isEndUser = config.checkEndUserAccess?.(record, user) ?? false

    let isAuthorizedStaff = false
    if (!isOwner && !isEndUser) {
      isAuthorizedStaff = await checkStaffPermission(
        supabase,
        user.id,
        record.workspace_id,
        config.permission
      )
    }

    if (!isOwner && !isEndUser && !isAuthorizedStaff) {
      return forbidden("Access denied")
    }

    // Fetch owner details
    const { data: owner } = await supabase
      .from("owners")
      .select("name, phone, email, business_name")
      .eq("id", record.owner_id)
      .single()

    // Build receipt data and render PDF
    const receiptData = config.buildReceiptData(record, owner)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = config.renderPdf(receiptData) as any
    const pdfBuffer = await renderToBuffer(pdfElement)

    // Generate filename from receipt data
    const receiptNumber =
      (receiptData as AnyRecord).receiptNumber || `${config.filenamePrefix}-${String(id).slice(0, 8)}`
    const safeReceiptNumber = sanitizeFilename(String(receiptNumber))

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": createContentDisposition(`${config.filenamePrefix}-${safeReceiptNumber}.pdf`),
      },
    })
  } catch (error) {
    apiLogger.error("Error generating PDF", extractErrorMeta(error))
    return internalError("Failed to generate PDF")
  }
}
