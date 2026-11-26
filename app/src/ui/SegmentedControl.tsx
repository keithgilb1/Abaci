import { ToggleGroup } from 'radix-ui'

export interface SegmentOption { value: string; label?: string; disabled?: boolean }

interface Common {
  options: SegmentOption[]
  /** Accessible name for the group, e.g. "Grades approved". */
  label: string
  disabled?: boolean
}
interface Multiple extends Common {
  /** `multiple` lets any number of segments be on, like the grade filter in the Policy Lab. */
  type: 'multiple'
  value: string[]
  onValueChange: (value: string[]) => void
}
interface Single extends Common {
  /** `single` keeps exactly one segment on. */
  type: 'single'
  value: string
  onValueChange: (value: string) => void
}
export type SegmentedControlProps = Multiple | Single

/**
 * Segmented toggle on a Fog pill track, built on Radix ToggleGroup.
 * Arrow keys move focus; Space or Enter toggles. Each segment reports its pressed state.
 */
export function SegmentedControl(props: SegmentedControlProps) {
  const items = props.options.map(o => (
    <ToggleGroup.Item key={o.value} value={o.value} className="ab-seg-item" disabled={o.disabled} aria-label={o.label ?? o.value}>
      {o.label ?? o.value}
    </ToggleGroup.Item>
  ))
  if (props.type === 'multiple') {
    // Keep the caller's option order whatever order the user clicked in.
    const order = (v: string[]) => props.options.map(o => o.value).filter(x => v.includes(x))
    return (
      <ToggleGroup.Root type="multiple" className="ab-seg" aria-label={props.label} disabled={props.disabled}
        value={props.value} onValueChange={v => props.onValueChange(order(v))}>{items}</ToggleGroup.Root>
    )
  }
  return (
    <ToggleGroup.Root type="single" className="ab-seg" aria-label={props.label} disabled={props.disabled}
      value={props.value} onValueChange={v => { if (v) props.onValueChange(v) }}>{items}</ToggleGroup.Root>
  )
}
