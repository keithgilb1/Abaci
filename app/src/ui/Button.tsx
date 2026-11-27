import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'filled' | 'ghost' | 'chip' | 'link'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `filled` is the primary action (Navy pill). `ghost` is secondary (Cornflower outline).
   * `chip` is a suggestion the user can pick. `link` is an inline text action such as "Show table".
   */
  variant?: ButtonVariant
  /** `sm` tightens the padding for buttons that sit inside a card header. */
  size?: 'md' | 'sm'
}

/** Pill button. The two radii in the system are 12px for cards and 9999px for anything you press. */
export function Button({ variant = 'filled', size = 'md', type = 'button', className, ...rest }: ButtonProps) {
  return <button type={type} data-variant={variant} data-size={size} className={['ab-btn', className].filter(Boolean).join(' ')} {...rest} />
}
