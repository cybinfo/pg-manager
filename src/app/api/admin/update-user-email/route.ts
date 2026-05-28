import { NextRequest } from "next/server"
import { z } from "zod"
import { apiSuccess, apiError, forbidden, badRequest, internalError } from "@/lib/api-response"
import { withApiMiddleware, getAdminSupabaseClient } from "@/lib/api-middleware"
import { updateUserEmail } from "@/lib/services/user.service"

const UpdateUserEmailSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  newEmail: z.string().email("Invalid email format"),
  tenantId: z.string().uuid("Invalid tenant ID format").optional(),
})

type UpdateUserEmailBody = z.infer<typeof UpdateUserEmailSchema>

export async function POST(request: NextRequest) {
  return withApiMiddleware(request, {
    requireAuth: true,
    requireCsrf: true,
    limiter: "sensitive",
    bodySchema: UpdateUserEmailSchema,
  }, async (ctx) => {
    const { userId, newEmail, tenantId } = ctx.body as UpdateUserEmailBody
    const supabaseAdmin = getAdminSupabaseClient()

    try {
      const result = await updateUserEmail(supabaseAdmin, {
        requestingUserId: ctx.user.id,
        targetUserId: userId,
        newEmail,
        tenantId,
      })
      return apiSuccess(
        { loginEmailUpdated: result.loginEmailUpdated },
        { message: result.message }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error"
      const code = (err as { code?: string }).code

      if (message.includes("permission") || message.includes("Only platform admins")) {
        return forbidden(message)
      }
      if (message.includes("Invalid email") || message.includes("disposable")) {
        return badRequest(message)
      }
      if (code === "CONFLICT") {
        return apiError("CONFLICT", message, { status: 409 })
      }
      return internalError(message)
    }
  })
}
