/**
 * API Download Helpers
 *
 * Centralized helpers for creating download responses in API routes.
 * Handles PDF, CSV, and other file type responses with proper headers.
 *
 * @example
 * import { createPDFResponse, createCSVResponse } from "@/lib/api-download-helpers"
 *
 * // In API route:
 * const pdfBytes = await generatePDF(data)
 * return createPDFResponse(pdfBytes, "receipt.pdf")
 */

import { sanitizeFilename } from "./format"

// ============================================================================
// TYPES
// ============================================================================

export type ContentDisposition = "attachment" | "inline"

interface DownloadResponseOptions {
  /** Content disposition (default: "attachment") */
  disposition?: ContentDisposition
  /** Additional headers */
  headers?: Record<string, string>
}

// ============================================================================
// PDF RESPONSE
// ============================================================================

/**
 * Create a PDF download response with proper headers
 *
 * @example
 * export async function GET() {
 *   const pdfBytes = await generateReceipt(data)
 *   return createPDFResponse(pdfBytes, "receipt-123.pdf")
 * }
 */
export function createPDFResponse(
  content: Uint8Array | ArrayBuffer | Buffer,
  filename: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)

  // Convert to Uint8Array if needed
  const bytes = content instanceof Uint8Array
    ? content
    : new Uint8Array(content)

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Content-Length": bytes.length.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// CSV RESPONSE
// ============================================================================

/**
 * Create a CSV download response with proper headers
 *
 * @example
 * export async function GET() {
 *   const csvContent = buildCSV(data, columns)
 *   return createCSVResponse(csvContent, "export.csv")
 * }
 */
export function createCSVResponse(
  content: string,
  filename: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)

  // Add BOM for Excel compatibility
  const contentWithBOM = "\uFEFF" + content

  return new Response(contentWithBOM, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// JSON RESPONSE
// ============================================================================

/**
 * Create a JSON download response with proper headers
 *
 * @example
 * export async function GET() {
 *   const data = await fetchExportData()
 *   return createJSONResponse(data, "backup.json")
 * }
 */
export function createJSONResponse(
  content: unknown,
  filename: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)
  const jsonString = JSON.stringify(content, null, 2)

  return new Response(jsonString, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// GENERIC FILE RESPONSE
// ============================================================================

/**
 * Create a generic file download response
 *
 * @example
 * return createFileResponse(content, "report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
 */
export function createFileResponse(
  content: Uint8Array | ArrayBuffer | string,
  filename: string,
  mimeType: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)

  const body = typeof content === "string"
    ? content
    : content instanceof Uint8Array
      ? content
      : new Uint8Array(content)

  const contentLength = typeof content === "string"
    ? new TextEncoder().encode(content).length
    : content instanceof Uint8Array
      ? content.length
      : content.byteLength

  return new Response(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Content-Length": contentLength.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// STREAMING RESPONSE
// ============================================================================

/**
 * Create a streaming download response for large files
 *
 * @example
 * const stream = createReadStream(filePath)
 * return createStreamingResponse(stream, "large-file.zip", "application/zip")
 */
export function createStreamingResponse(
  stream: ReadableStream,
  filename: string,
  mimeType: string,
  options: DownloadResponseOptions & { contentLength?: number } = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {}, contentLength } = options
  const safeFilename = sanitizeFilename(filename)

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    ...extraHeaders,
  }

  if (contentLength !== undefined) {
    headers["Content-Length"] = contentLength.toString()
  }

  return new Response(stream, {
    status: 200,
    headers,
  })
}
