import { Slider as RSlider } from 'radix-ui'
import { useId } from 'react'
import { Field } from './Field'

export interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** The value as people read it ("No floor", "41%", "+250 bps"). Also used as aria-valuetext. */
  display: string
  onValueChange: (value: number) => void
  disabled?: boolean
}

/**
 * Pill slider built on Radix Slider: Navy thumb, Electric Blue active track.
 * Arrow keys step, Page Up/Down jump, Home/End go to the ends.
 */
export function Slider({ label, value, min, max, step = 1, display, onValueChange, disabled }: SliderProps) {
  const id = useId()
  return (
    <Field label={label} display={display} id={id}>
      <RSlider.Root className="ab-slider" min={min} max={max} step={step} value={[value]} disabled={disabled}
        onValueChange={([v]) => onValueChange(v)} aria-labelledby={id}>
        <RSlider.Track className="ab-slider-track"><RSlider.Range className="ab-slider-range" /></RSlider.Track>
        <RSlider.Thumb className="ab-slider-thumb" aria-labelledby={id} aria-valuetext={display} />
      </RSlider.Root>
    </Field>
  )
}
