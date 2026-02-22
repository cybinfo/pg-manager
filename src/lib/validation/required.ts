type FieldValue = string | number | boolean | null | undefined

/**
 * Check if a value is considered "filled"
 */
function isFilled(value: FieldValue): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return !isNaN(value)
  if (typeof value === "boolean") return true
  return false
}

/**
 * Validate that all required fields are filled
 *
 * @example
 * const result = validateRequired(
 *   { name: "John", email: "", phone: "123" },
 *   ["name", "email"]
 * )
 * if (!result.isValid) {
 *   toast.error(result.error) // "email is required"
 * }
 */
export function validateRequired<T extends Record<string, FieldValue>>(
  data: T,
  requiredFields: (keyof T)[],
  options: { errorMessage?: string; fieldLabels?: Record<keyof T, string> } = {}
): { isValid: boolean; error: string | null; missingFields: (keyof T)[] } {
  const { errorMessage, fieldLabels } = options
  const missing: (keyof T)[] = []

  for (const field of requiredFields) {
    if (!isFilled(data[field])) {
      missing.push(field)
    }
  }

  if (missing.length > 0) {
    const error =
      errorMessage ||
      (missing.length === 1
        ? `${fieldLabels?.[missing[0]] || String(missing[0])} is required`
        : "Please fill in all required fields")

    return { isValid: false, error, missingFields: missing }
  }

  return { isValid: true, error: null, missingFields: [] }
}

/**
 * Simple check if all required fields are present
 *
 * @example
 * if (!hasRequiredFields(formData, ["name", "email"])) {
 *   toast.error("Please fill in all required fields")
 *   return
 * }
 */
export function hasRequiredFields<T extends Record<string, FieldValue>>(
  data: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every((field) => isFilled(data[field]))
}
