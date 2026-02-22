/**
 * Validators - Re-export file for backward compatibility
 *
 * All validators have been moved to @/lib/validation/ modules.
 * This file re-exports everything so existing imports continue to work.
 *
 * New code should import from "@/lib/validation" directly.
 *
 * Note: We use "./validation/index" instead of "./validation" because
 * src/lib/validation.ts (Zod schema utilities) takes module resolution
 * priority over the src/lib/validation/ directory.
 */

export * from "./validation/index"
