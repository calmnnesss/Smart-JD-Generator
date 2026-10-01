import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

export function Chip({ selected, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none active:scale-[0.97]',
        selected
          ? 'ai-border text-violet-700 [--ai-fill:var(--color-violet-50)]'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
        className,
      )}
      {...props}
    >
      {selected && <Check className="size-3.5" strokeWidth={2.5} />}
      {children}
    </button>
  )
}

/** 只读标签（识别状态、简报里的福利等） */
export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'ai'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs leading-5',
        tone === 'ai' ? 'ai-border text-violet-700 [--ai-fill:var(--color-violet-50)]' : 'bg-zinc-100 text-zinc-700',
        className,
      )}
    >
      {children}
    </span>
  )
}
