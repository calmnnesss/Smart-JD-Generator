import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { fieldClass } from '../../components/ui/field'
import { cn } from '../../lib/cn'
import type { Supplement } from '../../types'

interface MissingInfoCardProps {
  items: string[]
  interactive: boolean
  onRegenerate: (supplements: Supplement[]) => void
}

/** 工作流给出的「仍需补充的信息」：逐项填写后带着补充信息重新生成 */
export function MissingInfoCard({ items, interactive, onRegenerate }: MissingInfoCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const filled = items.filter((item) => answers[item]?.trim())

  if (!items.length) {
    return (
      <p className="text-[15px] leading-7 text-zinc-800">
        这份底稿的信息已经比较完整，没有需要额外补充的内容。你可以直接复制使用，也可以调整信息后重新生成。
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[15px] leading-7 text-zinc-800">
        这份底稿还有 <span className="font-semibold">{items.length}</span> 处信息需要你确认。我不会凭空编造这些内容，补充后我会带着它们重新生成：
      </p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <label
            key={item}
            className={cn(
              'block rounded-xl border bg-white p-3 transition',
              answers[item]?.trim() ? 'border-violet-200 shadow-soft' : 'border-zinc-200/80',
            )}
          >
            <div className="mb-2 flex gap-2 text-sm text-zinc-800">
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-zinc-100 text-[11px] font-medium text-zinc-500">{index + 1}</span>
              <span className="leading-5">{item}</span>
            </div>
            <input
              value={answers[item] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [item]: e.target.value }))}
              disabled={!interactive}
              placeholder={interactive ? '补充说明（不确定可以留空）' : '—'}
              maxLength={500}
              className={cn(fieldClass, 'h-9 text-sm disabled:bg-zinc-50 disabled:text-zinc-400')}
            />
          </label>
        ))}
      </div>
      {interactive && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-zinc-400">补充内容会作为可信信息写入公司介绍</span>
          <Button
            variant="ai"
            disabled={!filled.length}
            onClick={() => onRegenerate(filled.map((item) => ({ item, answer: answers[item].trim() })))}
          >
            <RefreshCw className="size-4" />
            带着补充信息重新生成{filled.length ? `（${filled.length}）` : ''}
          </Button>
        </div>
      )}
    </div>
  )
}
