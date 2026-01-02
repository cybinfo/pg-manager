"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateIndianMobile, formatIndianMobile } from "@/lib/validators"
import { cn } from "@/lib/utils"
import { CheckCircle, XCircle, Phone } from "lucide-react"

interface PhoneInputProps {
  value: string
  onChange: (value: string, isValid: boolean) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  showValidation?: boolean
  className?: string
  id?: string
}

/**
 * Indian Phone Number Input with real-time validation
 * Accepts various formats and normalizes to +91XXXXXXXXXX
 */
export function PhoneInput({
  value,
  onChange,
  label = "Phone Number",
  placeholder = "Enter 10-digit mobile number",
  required = false,
  disabled = false,
  showValidation = true,
  className,
  id = "phone",
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [validation, setValidation] = useState<{
    isValid: boolean
    error: string | null
  }>({ isValid: false, error: null })
  const [touched, setTouched] = useState(false)

  // Validate on value change
  useEffect(() => {
    if (displayValue) {
      const result = validateIndianMobile(displayValue)
      setValidation({ isValid: result.isValid, error: result.error })
      // Pass normalized value to parent
      onChange(result.normalized || displayValue, result.isValid)
    } else {
      setValidation({ isValid: false, error: required ? "Phone number is required" : null })
      onChange("", false)
    }
  }, [displayValue, required])

  // Format on blur
  const handleBlur = () => {
    setTouched(true)
    const result = validateIndianMobile(displayValue)
    if (result.isValid && result.normalized) {
      setDisplayValue(formatIndianMobile(result.normalized))
    }
  }

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
    // Allow only digits, spaces, dashes, dots, and + for country code
    val = val.replace(/[^\d\s\-\.\+]/g, '')
    setDisplayValue(val)
  }

  const showError = touched && validation.error && showValidation

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type="tel"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10",
            showError && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {showValidation && touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : displayValue ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : null}
          </div>
        )}
      </div>
      {showError && (
        <p className="text-xs text-destructive">{validation.error}</p>
      )}
      {!showError && showValidation && touched && validation.isValid && (
        <p className="text-xs text-green-600">Valid Indian mobile number</p>
      )}
    </div>
  )
}

/**
 * Simple phone input without validation UI
 * Just normalizes the number
 */
export function SimplePhoneInput({
  value,
  onChange,
  placeholder = "+91 XXXXX XXXXX",
  disabled = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d\s\-\.\+]/g, '')
    onChange(val)
  }

  const handleBlur = () => {
    const result = validateIndianMobile(value)
    if (result.isValid && result.normalized) {
      onChange(result.normalized)
    }
  }

  return (
    <Input
      type="tel"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}
