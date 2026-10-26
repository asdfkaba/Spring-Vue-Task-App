export const STATUS_OPTIONS = [
  { label: 'To do', value: 'TODO', severity: 'secondary', icon: 'pi pi-circle' },
  { label: 'In progress', value: 'IN_PROGRESS', severity: 'info', icon: 'pi pi-spinner' },
  { label: 'Done', value: 'DONE', severity: 'success', icon: 'pi pi-check-circle' },
]

export const PRIORITY_OPTIONS = [
  { label: 'Low', value: 1, severity: 'secondary', bar: 'bg-slate-300' },
  { label: 'Medium', value: 2, severity: 'warn', bar: 'bg-amber-400' },
  { label: 'High', value: 3, severity: 'danger', bar: 'bg-red-500' },
]

export function statusOf(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) ?? STATUS_OPTIONS[0]
}

export function priorityOf(value) {
  return PRIORITY_OPTIONS.find((p) => p.value === Number(value)) ?? null
}
