export const PRIORITY_OPTIONS = [
  { label: 'Low', value: 1, severity: 'secondary' },
  { label: 'Medium', value: 2, severity: 'warn' },
  { label: 'High', value: 3, severity: 'danger' },
]

export function priorityOf(value) {
  return PRIORITY_OPTIONS.find((p) => p.value === Number(value)) ?? null
}

// Used for tasks in a column without its own color.
export const DEFAULT_COLUMN_COLOR = '#cbd5e1'

// Suggestions in the column dialog; any other #rrggbb color can be picked too.
export const COLUMN_COLOR_PRESETS = [
  '#64748b',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]
