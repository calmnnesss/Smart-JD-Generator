import { Check, Copy, Download, FileText } from 'lucide-react'
import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { markdownToPlain } from '../../lib/markdown'
import type { Run } from '../../types'

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(key)
    window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1600)
  }
  return { copied, copy }
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function JdMarkdown({ markdown, streaming }: { markdown: string; streaming?: boolean }) {
  return (
    <div
      className={cn(
        'prose max-w-none text-[14.5px] prose-zinc',
        'prose-headings:tracking-tight prose-headings:text-zinc-900',
        'prose-h1:mb-4 prose-h1:text-[22px] prose-h1:leading-8 prose-h1:font-semibold',
        'prose-h2:mt-7 prose-h2:mb-2.5 prose-h2:text-[15px] prose-h2:font-semibold',
        'prose-p:my-2.5 prose-p:leading-7 prose-p:text-zinc-700',
        'prose-li:my-1 prose-li:leading-7 prose-li:text-zinc-700 prose-ol:pl-5 prose-ul:pl-5',
        'prose-strong:font-medium prose-strong:text-zinc-900 prose-li:marker:text-zinc-400',
        streaming && '[&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:inline-block [&>*:last-child]:after:h-4 [&>*:last-child]:after:w-[2px] [&>*:last-child]:after:animate-caret [&>*:last-child]:after:bg-violet-500 [&>*:last-child]:after:align-middle [&>*:last-child]:after:content-[""]',
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="flex items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-linear-to-b from-ai-indigo to-ai-violet" />
              {children}
            </h2>
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}

function DraftingSkeleton() {
  return (
    <div className="space-y-6" aria-label="AI 正在撰写">
      <div className="skeleton h-6 w-2/3 rounded-md" />
      {[5, 4, 6].map((lines, block) => (
        <div key={block} className="space-y-2.5">
          <div className="skeleton h-4 w-28 rounded" />
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="skeleton h-3.5 rounded" style={{ width: `${92 - ((i * 17 + block * 11) % 30)}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

interface JdDocumentProps {
  run: Run
  companyName: string
  className?: string
}

/** JD 文档：markdown 排版 + 复制 / 下载 */
export function JdDocument({ run, companyName, className }: JdDocumentProps) {
  const { copied, copy } = useCopied()
  const markdown = run.result?.jd_markdown ?? run.delta
  const ready = !!run.result

  return (
    <article className={cn('overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-float', className)}>
      <div className="h-px bg-linear-to-r from-transparent via-violet-400/60 to-transparent" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
        <span className="text-xs text-zinc-500">
          {run.status === 'running' ? <span className="shimmer-text">正在撰写…</span> : ready ? 'JD 底稿' : run.status === 'stopped' ? '已停止' : '未完成'}
        </span>
        {ready && (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" onClick={() => copy('md', markdown)}>
              {copied === 'md' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied === 'md' ? '已复制' : 'Markdown'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => copy('text', markdownToPlain(markdown))}>
              {copied === 'text' ? <Check className="size-3.5 text-emerald-600" /> : <FileText className="size-3.5" />}
              {copied === 'text' ? '已复制' : '纯文本'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => download(`${companyName || 'JD'}-招聘启事.md`, markdown)} aria-label="下载 Markdown">
              <Download className="size-3.5" />
            </Button>
          </div>
        )}
      </header>
      <div className="px-6 py-7 sm:px-10 sm:py-9">
        {markdown ? (
          <JdMarkdown markdown={markdown} streaming={run.status === 'running'} />
        ) : run.status === 'running' ? (
          <DraftingSkeleton />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-400">没有生成内容</p>
        )}
      </div>
    </article>
  )
}
