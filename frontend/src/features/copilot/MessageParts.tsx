import { Pencil } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { AIOrb } from '../../components/ui/AIOrb'
import { cn } from '../../lib/cn'

export function TypingDots() {
  return (
    <span className="inline-flex h-7 items-center gap-1" aria-label="正在输入">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-violet-400/80"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  )
}

interface AiMessageProps {
  children?: ReactNode
  text?: string
  hint?: string
  label?: string
  /** 模拟「正在输入」后再显示文字 */
  typing?: boolean
  thinking?: boolean
}

export function AiMessage({ children, text, hint, label, typing = true, thinking }: AiMessageProps) {
  const [revealed, setRevealed] = useState(!typing)
  useEffect(() => {
    if (revealed) return
    const timer = window.setTimeout(() => setRevealed(true), 420)
    return () => window.clearTimeout(timer)
  }, [revealed])

  return (
    <div className="flex gap-3">
      <AIOrb size={28} thinking={thinking} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
        {!revealed ? (
          <TypingDots />
        ) : (
          <>
            {label && <div className="ai-text text-xs font-medium tracking-wide">{label}</div>}
            {text && <p className="text-[15px] leading-7 text-zinc-800">{text}</p>}
            {hint && <p className="text-[13px] leading-6 text-zinc-500">{hint}</p>}
            {children}
          </>
        )}
      </div>
    </div>
  )
}

interface UserMessageProps {
  text: string
  onEdit?: () => void
}

export function UserMessage({ text, onEdit }: UserMessageProps) {
  const long = text.length > 120
  return (
    <div className="group flex items-start justify-end gap-2 pl-10">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-900/5 hover:text-zinc-700 focus-visible:opacity-100"
        >
          <Pencil className="size-3" />
          修改
        </button>
      )}
      <div
        className={cn(
          'max-w-[34rem] rounded-2xl rounded-br-md border border-zinc-200/70 bg-white px-4 py-2.5 text-[15px] leading-7 whitespace-pre-wrap text-zinc-800 shadow-soft',
          long && 'line-clamp-4',
        )}
        title={long ? text : undefined}
      >
        {text}
      </div>
    </div>
  )
}
