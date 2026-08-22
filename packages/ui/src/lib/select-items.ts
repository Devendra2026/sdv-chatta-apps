import type { ReactNode } from "react"

/** Item metadata for Base UI Select — maps `value` to visible label in the trigger. */
export type SelectItemRecord = {
  value: string | null
  label: ReactNode
}

export function buildSelectItems<T>(
  entries: readonly T[],
  getValue: (entry: T) => string,
  getLabel: (entry: T) => ReactNode
): SelectItemRecord[] {
  return entries.map((entry) => ({
    value: getValue(entry),
    label: getLabel(entry),
  }))
}

export function buildStringSelectItems(
  options: readonly string[],
  formatLabel?: (value: string) => ReactNode
): SelectItemRecord[] {
  return options.map((option) => ({
    value: option,
    label: formatLabel ? formatLabel(option) : option,
  }))
}

export function prependSelectPlaceholder(
  placeholder: ReactNode,
  items: SelectItemRecord[]
): SelectItemRecord[] {
  return [{ value: null, label: placeholder }, ...items]
}
