import { useEffect, useState } from 'react'
import { fetchComposePreview } from '../../lib/api'
import { scoreBrief } from '../../lib/completeness'
import type { BriefDraft, ComposePreview, Route } from '../../types'
import { CompletenessRing } from '../brief/CompletenessRing'
import type { StepId } from './script'

interface ConfirmCardProps {
  brief: BriefDraft
  route: Route | null
  onEdit?: (stepId: StepId) => void
}

/** 调用薄后端的拼接接口，把最终会交给工作流的招聘需求展示给用户确认 */
export function ConfirmCard({ brief: liveBrief, route, onEdit }: ConfirmCardProps) {
  // 以挂载时的简报为准，后续修改会生成新的确认卡片
  const [brief] = useState(liveBrief)
  const [preview, setPreview] = useState<ComposePreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchComposePreview(brief, route)
      .then((data) => !cancelled && setPreview(data))
      .catch((e: unknown) => !cancelled && setError(e instanceof TypeError ? '无法连接到服务，请确认后端已启动' : String((e as Error).message)))
    return () => {
      cancelled = true
    }
  }, [brief, route])

  const { score, tips } = scoreBrief(brief)

  return (
    <div className="space-y-3">
      <p className="text-[15px] leading-7 text-zinc-800">信息收集完毕，我把招聘需求整理成了这样：</p>
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft">
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1.5 text-xs text-zinc-500">招聘需求</div>
            {preview ? (
              <p className="text-[15px] leading-7 font-medium text-zinc-900">{preview.hiring_needs}</p>
            ) : error ? (
              <div className="text-sm text-rose-600">
                {error}
                {error.includes('官网') && onEdit && (
                  <button type="button" onClick={() => onEdit('company_domain')} className="ml-2 underline underline-offset-2">
                    修改官网
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="skeleton h-4 w-11/12 rounded" />
                <div className="skeleton h-4 w-2/3 rounded" />
              </div>
            )}
          </div>
          {preview && (
            <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-zinc-500">公司</dt>
              <dd className="text-zinc-800">{brief.company.name}</dd>
              <dt className="text-zinc-500">官网</dt>
              <dd className="truncate text-zinc-800">{preview.company_domain}</dd>
              <dt className="text-zinc-500">福利</dt>
              <dd className="text-zinc-800">{preview.specific_benefits || <span className="text-zinc-400">未填写</span>}</dd>
              <dt className="text-zinc-500">技术栈</dt>
              <dd className="text-zinc-800">{preview.tech_stack || <span className="text-zinc-400">未指定</span>}</dd>
            </dl>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3">
          <CompletenessRing score={score} size={36} />
          <div className="min-w-0 text-[13px] leading-5">
            <div className="font-medium text-zinc-800">信息完整度 {score}%</div>
            <div className="truncate text-zinc-500">{tips[0] ?? '信息很完整，可以开始生成了'}</div>
          </div>
        </div>
      </div>
      <p className="text-[13px] text-zinc-500">确认无误就可以开始生成了，过程中你能看到每一步的进展。</p>
    </div>
  )
}
