"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
  icon?: React.ReactNode
}

interface ComboboxProps {
  /** Array of options to display */
  options: ComboboxOption[]
  /** Currently selected value */
  value?: string
  /** Callback when value changes */
  onValueChange?: (value: string) => void
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Text to show when no results found */
  emptyText?: string
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Additional class names */
  className?: string
  /** Width of the popover (default: same as trigger) */
  popoverWidth?: "trigger" | "auto" | string
  /** Allow clearing the selection */
  clearable?: boolean
}

/**
 * Searchable dropdown combobox component.
 * Use this instead of regular Select for better UX with many options.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  loading = false,
  className,
  popoverWidth = "trigger",
  clearable = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  const handleSelect = (currentValue: string) => {
    if (clearable && currentValue === value) {
      onValueChange?.("")
    } else {
      onValueChange?.(currentValue)
    }
    setOpen(false)
  }

  const popoverWidthClass =
    popoverWidth === "trigger"
      ? "w-[--radix-popover-trigger-width]"
      : popoverWidth === "auto"
      ? "w-auto min-w-[200px]"
      : popoverWidth

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              {selectedOption.icon}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", popoverWidthClass)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Search by label
                  onSelect={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {option.icon}
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground block truncate">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ===========================================
// Multi-select Combobox
// ===========================================

interface MultiComboboxProps {
  /** Array of options to display */
  options: ComboboxOption[]
  /** Currently selected values */
  value?: string[]
  /** Callback when values change */
  onValueChange?: (values: string[]) => void
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Text to show when no results found */
  emptyText?: string
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Additional class names */
  className?: string
  /** Maximum items to select */
  maxItems?: number
}

/**
 * Multi-select searchable combobox.
 * Allows selecting multiple options with search.
 */
export function MultiCombobox({
  options,
  value = [],
  onValueChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  loading = false,
  className,
  maxItems,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter((option) => value.includes(option.value))
  const isMaxReached = maxItems !== undefined && value.length >= maxItems

  const handleSelect = (optionValue: string) => {
    const isSelected = value.includes(optionValue)
    if (isSelected) {
      onValueChange?.(value.filter((v) => v !== optionValue))
    } else if (!isMaxReached) {
      onValueChange?.([...value, optionValue])
    }
  }

  const displayText =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            selectedOptions.length === 0 && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            displayText
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value)
                const isDisabled =
                  option.disabled || (!isSelected && isMaxReached)

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    disabled={isDisabled}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {option.icon}
                      <div className="flex-1 min-w-0">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ===========================================
// Async Combobox (for server-side search)
// ===========================================

interface AsyncComboboxProps<T> {
  /** Function to fetch options based on search query */
  fetchOptions: (query: string) => Promise<T[]>
  /** Transform fetched data to ComboboxOption format */
  getOptionLabel: (item: T) => string
  getOptionValue: (item: T) => string
  getOptionDescription?: (item: T) => string | undefined
  /** Currently selected value */
  value?: string
  /** Callback when value changes */
  onValueChange?: (value: string, item?: T) => void
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Text to show when no results found */
  emptyText?: string
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Minimum characters before searching (default: 1) */
  minChars?: number
}

/**
 * Async searchable combobox for server-side search.
 * Fetches options dynamically as user types.
 */
export function AsyncCombobox<T>({
  fetchOptions,
  getOptionLabel,
  getOptionValue,
  getOptionDescription,
  value,
  onValueChange,
  placeholder = "Search...",
  searchPlaceholder = "Type to search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  debounceMs = 300,
  minChars = 1,
}: AsyncComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<T[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  // Debounced search
  React.useEffect(() => {
    if (query.length < minChars) {
      setOptions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await fetchOptions(query)
        setOptions(results)
      } catch (error) {
        console.error("Error fetching options:", error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchOptions, debounceMs, minChars])

  const handleSelect = (item: T) => {
    const itemValue = getOptionValue(item)
    setSelectedItem(item)
    onValueChange?.(itemValue, item)
    setOpen(false)
    setQuery("")
  }

  const displayText = selectedItem
    ? getOptionLabel(selectedItem)
    : value
    ? value
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && !selectedItem && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {displayText}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : query.length < minChars ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least {minChars} character{minChars > 1 ? "s" : ""} to search
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((item) => {
                  const itemValue = getOptionValue(item)
                  const itemLabel = getOptionLabel(item)
                  const itemDesc = getOptionDescription?.(item)

                  return (
                    <CommandItem
                      key={itemValue}
                      value={itemLabel}
                      onSelect={() => handleSelect(item)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === itemValue ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="truncate">{itemLabel}</span>
                        {itemDesc && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {itemDesc}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
