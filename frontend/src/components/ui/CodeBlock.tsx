import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CopyButton } from './CopyButton'

/** 极简 JSON 高亮：键名、字符串、数字 / 布尔值分色，其余保持默认 */
function highlightJson(code: string): ReactNode[] {
  const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null|-?\d+(?:\.\d+)?)\b/g
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(code.slice(last, index))
    if (match[1] && match[2]) {
      nodes.push(<span key={index} className="text-violet-300">{match[1]}</span>, match[2])
    } else if (match[1]) {
      nodes.push(<span key={index} className="text-zinc-200">{match[1]}</span>)
    } else {
      nodes.push(<span key={index} className="text-sky-300">{match[3]}</span>)
    }
    last = index + match[0].length
  }
  nodes.push(code.slice(last))
  return nodes
}

interface CodeBlockProps {
  code: string
  language?: 'json' | 'bash' | 'text'
  title?: string
  /** 长行自动换行（默认横向滚动） */
  wrap?: boolean
  className?: string
}

export function CodeBlock({ code, language = 'text', title, wrap = false, className }: CodeBlockProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-white/5 py-1 pr-1.5 pl-3.5">
        <span className="font-mono text-[11px] tracking-wide text-zinc-500">{title ?? language}</span>
        <CopyButton text={code} tone="dark" />
      </div>
      <pre className={cn('overflow-auto px-4 py-3.5 font-mono text-[12.5px] leading-6 text-zinc-400', wrap && 'break-words whitespace-pre-wrap')}>
        <code>{language === 'json' ? highlightJson(code) : <span className="text-zinc-200">{code}</span>}</code>
      </pre>
    </div>
  )
}
