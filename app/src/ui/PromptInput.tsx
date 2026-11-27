import { Button } from './Button'

export interface PromptInputProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  /** Accessible name for the text field. */
  label?: string
  /** While busy the button is disabled and shows `busyLabel`. */
  busy?: boolean
  submitLabel?: string
  busyLabel?: string
}

/** The Ask Abaci question box: a white pill with a filled submit button. */
export function PromptInput({ value, onValueChange, onSubmit, placeholder, label = 'Question', busy, submitLabel = 'Ask', busyLabel = 'Thinking…' }: PromptInputProps) {
  return (
    <form className="ab-prompt" role="search" onSubmit={e => { e.preventDefault(); if (value.trim() && !busy) onSubmit(value) }}>
      <input value={value} onChange={e => onValueChange(e.target.value)} placeholder={placeholder} aria-label={label} />
      <Button type="submit" disabled={busy || !value.trim()} aria-busy={busy || undefined}>{busy ? busyLabel : submitLabel}</Button>
    </form>
  )
}
