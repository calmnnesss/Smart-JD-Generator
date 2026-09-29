import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'ai' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-soft disabled:bg-zinc-300 disabled:shadow-none',
  // 主 CTA：深色底 + 渐变光晕
  ai: 'isolate bg-zinc-900 text-white shadow-glow hover:bg-zinc-800 disabled:bg-zinc-300 disabled:shadow-none before:absolute before:-inset-px before:-z-10 before:rounded-[inherit] before:bg-linear-to-r before:from-ai-indigo before:via-ai-violet before:to-ai-cyan before:opacity-0 before:blur-md before:transition-opacity hover:before:opacity-60 disabled:before:hidden',
  secondary:
    'border border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 disabled:text-zinc-400',
  ghost: 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 disabled:text-zinc-300',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-2xl px-6 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all duration-200 select-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none active:scale-[0.98] disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
