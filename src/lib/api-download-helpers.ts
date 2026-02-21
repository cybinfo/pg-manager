/**
 * @deprecated This module has been consolidated into `@/lib/download-utils`.
 * Import from `@/lib/download-utils` instead.
 *
 * This file re-exports everything for backwards compatibility and will be
 * removed in a future cleanup pass.
 */
export {
  createPDFResponse,
  createCSVResponse,
  createJSONResponse,
  createFileResponse,
  createStreamingResponse,
} from "./download-utils"

export type { ContentDisposition } from "./download-utils"
