import { Check, Copy } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useCopied } from '../../lib/useCopied'

interface CopyButtonProps {
  text: string
  label?: string
  tone?: 'light' | 'dark'
  className?: string
}

export function CopyButton({ text, label = '复制', tone = 'light', className }: CopyButtonProps) {
  const { copied, copy } = useCopied()
  const done = copied === 'value'
  return (
    <button
      type="button"
      onClick={() => copy('value', text)}
      aria-label={done ? '已复制' : label}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs transition focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none',
        tone === 'dark' ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900',
        className,
      )}
    >
      {done ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {done ? '已复制' : label}
    </button>
  )
}
