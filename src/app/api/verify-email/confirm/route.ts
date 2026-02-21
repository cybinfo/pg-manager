import { NextRequest } from "next/server"
import { z } from "zod"
import { authLogger, extractErrorMeta } from "@/lib/logger"
import {
  apiSuccess,
  badRequest,
  internalError,
} from "@/lib/api-response"
import { transformJoin } from "@/lib/supabase/transforms"
import { withApiMiddleware, getAdminSupabaseClient } from "@/lib/api-middleware"

const ConfirmVerificationSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

type ConfirmVerificationBody = z.infer<typeof ConfirmVerificationSchema>

export async function POST(request: NextRequest) {
  return withApiMiddleware(request, {
    requireAuth: false,
    requireCsrf: true,
    limiter: "auth",
    bodySchema: ConfirmVerificationSchema,
  }, async (ctx) => {
    const { token } = ctx.body as ConfirmVerificationBody

    // Service role client for database operations (validated env vars)
    const supabaseAdmin = getAdminSupabaseClient()

    // Verify the token
    const { data, error } = await supabaseAdmin.rpc("verify_token", {
      p_token: token,
      p_type: "email",
    })

    if (error) {
      authLogger.error("Failed to verify token", extractErrorMeta(error))
      return internalError("Failed to verify token")
    }

    // The RPC returns a table, get the first row
    const result = transformJoin(data)

    if (!result?.success) {
      return badRequest(result?.message || "Invalid or expired token")
    }

    return apiSuccess(
      { email: result.value },
      { message: result.message }
    )
  })
}
