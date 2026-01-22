/**
 * Workflow Engine Tests
 * Tests for workflow execution helpers and types
 */

import {
  createWorkflowContext,
  executeStep,
  WorkflowDefinition,
} from "@/lib/services/workflow.engine"
import {
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
  ServiceResult,
} from "@/lib/services/types"

describe("Workflow Engine", () => {
  describe("createWorkflowContext", () => {
    it("creates a context with all required fields", () => {
      const context = createWorkflowContext(
        "test_workflow",
        "actor-123",
        "owner",
        "workspace-456"
      )

      expect(context.workflow_type).toBe("test_workflow")
      expect(context.actor_id).toBe("actor-123")
      expect(context.actor_type).toBe("owner")
      expect(context.workspace_id).toBe("workspace-456")
      expect(context.steps).toEqual([])
      expect(context.metadata).toEqual({})
    })

    it("generates unique workflow IDs", () => {
      const context1 = createWorkflowContext("test", "a", "owner", "w")
      const context2 = createWorkflowContext("test", "a", "owner", "w")

      expect(context1.workflow_id).not.toBe(context2.workflow_id)
    })

    it("includes workflow ID prefix", () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      expect(context.workflow_id).toMatch(/^wf_/)
    })

    it("includes provided metadata", () => {
      const context = createWorkflowContext(
        "test",
        "a",
        "owner",
        "w",
        { custom: "data", foo: "bar" }
      )

      expect(context.metadata).toEqual({ custom: "data", foo: "bar" })
    })

    it("sets started_at to current time", () => {
      const before = new Date()
      const context = createWorkflowContext("test", "a", "owner", "w")
      const after = new Date()

      expect(context.started_at.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(context.started_at.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe("executeStep", () => {
    it("executes a successful step", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      const result = await executeStep(context, "test_step", async () => {
        return createSuccessResult({ value: 42 })
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ value: 42 })
      expect(context.steps).toHaveLength(1)
      expect(context.steps[0].name).toBe("test_step")
      expect(context.steps[0].status).toBe("completed")
    })

    it("handles step failure", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      const result = await executeStep(context, "failing_step", async () => {
        return createErrorResult(
          createServiceError(ERROR_CODES.VALIDATION_ERROR, "Test error")
        )
      })

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe("Test error")
      expect(context.steps).toHaveLength(1)
      expect(context.steps[0].status).toBe("failed")
    })

    it("handles exceptions in step executor", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      const result = await executeStep(context, "throwing_step", async () => {
        throw new Error("Unexpected error")
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ERROR_CODES.WORKFLOW_STEP_FAILED)
      expect(context.steps[0].status).toBe("failed")
    })

    it("records step timing", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      await executeStep(context, "timed_step", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return createSuccessResult({ done: true })
      })

      const step = context.steps[0]
      expect(step.started_at).toBeDefined()
      expect(step.completed_at).toBeDefined()
      expect(step.completed_at!.getTime()).toBeGreaterThanOrEqual(step.started_at!.getTime())
    })

    it("assigns incremental step IDs", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      await executeStep(context, "step_1", async () => createSuccessResult(1))
      await executeStep(context, "step_2", async () => createSuccessResult(2))
      await executeStep(context, "step_3", async () => createSuccessResult(3))

      expect(context.steps[0].id).toBe("step_1")
      expect(context.steps[1].id).toBe("step_2")
      expect(context.steps[2].id).toBe("step_3")
    })

    it("stores step result on success", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      await executeStep(context, "result_step", async () => {
        return createSuccessResult({ key: "value", count: 5 })
      })

      expect(context.steps[0].result).toEqual({ key: "value", count: 5 })
    })

    it("stores error on failure", async () => {
      const context = createWorkflowContext("test", "a", "owner", "w")

      await executeStep(context, "error_step", async () => {
        return createErrorResult(
          createServiceError(ERROR_CODES.NOT_FOUND, "Not found", { id: "123" })
        )
      })

      expect(context.steps[0].error).toBeDefined()
      expect(context.steps[0].error?.code).toBe(ERROR_CODES.NOT_FOUND)
    })
  })

  describe("ServiceResult helpers", () => {
    describe("createSuccessResult", () => {
      it("creates a success result with data", () => {
        const result = createSuccessResult({ foo: "bar" })

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ foo: "bar" })
        expect(result.error).toBeUndefined()
      })

      it("creates a success result with null data", () => {
        const result = createSuccessResult(null)

        expect(result.success).toBe(true)
        expect(result.data).toBeNull()
      })
    })

    describe("createErrorResult", () => {
      it("creates an error result with error object", () => {
        const error = createServiceError(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input"
        )
        const result = createErrorResult(error)

        expect(result.success).toBe(false)
        expect(result.error).toBe(error)
        expect(result.data).toBeUndefined()
      })
    })

    describe("createServiceError", () => {
      it("creates an error with code and message", () => {
        const error = createServiceError(
          ERROR_CODES.PERMISSION_DENIED,
          "Access denied"
        )

        expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED)
        expect(error.message).toBe("Access denied")
      })

      it("includes optional details", () => {
        const error = createServiceError(
          ERROR_CODES.VALIDATION_ERROR,
          "Validation failed",
          { field: "email", reason: "invalid format" }
        )

        expect(error.details).toEqual({ field: "email", reason: "invalid format" })
      })

      it("includes original error when provided", () => {
        const originalError = new Error("Original")
        const error = createServiceError(
          ERROR_CODES.UNKNOWN_ERROR,
          "Wrapped error",
          undefined,
          originalError
        )

        expect(error.originalError).toBe(originalError)
      })
    })
  })

  describe("ERROR_CODES", () => {
    it("has unique error codes", () => {
      const codes = Object.values(ERROR_CODES)
      const uniqueCodes = new Set(codes)

      expect(codes.length).toBe(uniqueCodes.size)
    })

    it("includes standard error types", () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBeDefined()
      expect(ERROR_CODES.NOT_FOUND).toBeDefined()
      expect(ERROR_CODES.PERMISSION_DENIED).toBeDefined()
      expect(ERROR_CODES.DUPLICATE_ENTRY).toBeDefined()
      expect(ERROR_CODES.UNKNOWN_ERROR).toBeDefined()
    })

    it("includes workflow-specific error types", () => {
      expect(ERROR_CODES.WORKFLOW_STEP_FAILED).toBeDefined()
      expect(ERROR_CODES.ROOM_AT_CAPACITY).toBeDefined()
    })
  })
})
