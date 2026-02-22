interface PrimarySelectorProps {
  checked: boolean
  onChange: () => void
  groupName: string
  disabled?: boolean
  label?: string
}

/**
 * Radio button selector for marking items as "Primary" in multi-entry lists.
 * Used in PhoneEntry, EmailEntry, GuardianEntry, and similar form components.
 */
export function PrimarySelector({
  checked,
  onChange,
  groupName,
  disabled,
  label = "Primary",
}: PrimarySelectorProps) {
  return (
    <label className="flex items-center gap-1 text-sm whitespace-nowrap">
      <input
        type="radio"
        name={groupName}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4"
        disabled={disabled}
      />
      {label}
    </label>
  )
}
