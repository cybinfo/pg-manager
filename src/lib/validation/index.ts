/**
 * Validation Module
 *
 * Re-exports all validators from their respective modules.
 * Import from "@/lib/validation" or "@/lib/validators" (backward compat).
 */

// Phone validators (re-exported from @/lib/phone for backward compatibility)
export { validatePhone as validateIndianMobile, formatNormalizedPhone as formatIndianMobile } from "../phone"

export { validateEmail } from "./email"
export { validatePAN, validateAadhaar, validatePincode, validateGST, validateUUID, isValidUUID } from "./document"
export { validateDateRange, validateDate } from "./date"
export { validateAmount, validatePositiveAmount, validateNonNegativeAmount, validatePercentage } from "./amount"
export { validatePassword, validatePasswordMatch } from "./password"
export { validateRequired, hasRequiredFields } from "./required"
export {
  requiredField, requiredSelect, requiredAmount, optionalAmount,
  requiredDate, requiredPhone, optionalEmail, requiredPositiveInt,
} from "./field-validators"
