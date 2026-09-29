import { ArrowLeft, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { fetchComposePreview } from '../../lib/api'
import { scoreBrief } from '../../lib/completeness'
import type { BriefDraft, ComposePreview, RoleMode } from '../../types'
import { CompletenessRing } from '../brief/CompletenessRing'
import { StepCard } from './StepShell'
import type { Studio } from './useStudio'

/** 调用后端拼接接口，展示最终会提交给工作流的内容；简报变化时通过 key 重新挂载 */
function ComposePreviewCard({ brief, mode }: { brief: BriefDraft; mode: RoleMode }) {
  const [preview, setPreview] = useState<ComposePreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchComposePreview(brief, mode)
      .then((data) => !cancelled && setPreview(data))
      .catch((e: unknown) => !cancelled && setError(e instanceof TypeError ? '无法连接到服务，请确认后端已启动' : String((e as Error).message)))
    return () => {
      cancelled = true
    }
  }, [brief, mode])

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
        <div className="mb-1 text-xs text-zinc-500">招聘需求</div>
        {preview ? (
          <p className="text-[15px] leading-7 font-medium text-zinc-900">{preview.hiring_needs}</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <div className="space-y-2 py-1">
            <div className="skeleton h-4 w-11/12 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        )}
      </div>
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 px-4 py-3.5 text-[13px] leading-6">
        <dt className="text-zinc-500">公司</dt>
        <dd className="text-zinc-800">{brief.company.name}</dd>
        <dt className="text-zinc-500">官网</dt>
        <dd className="truncate text-zinc-800">{preview?.company_domain ?? brief.company.domain}</dd>
        <dt className="text-zinc-500">公司介绍</dt>
        <dd className="line-clamp-3 text-zinc-800">{brief.company.description}</dd>
        <dt className="text-zinc-500">福利</dt>
        <dd className="text-zinc-800">{brief.benefits.join('、') || <span className="text-zinc-400">未填写</span>}</dd>
        <dt className="text-zinc-500">技术栈</dt>
        <dd className="text-zinc-800">{brief.tech_stack.join('、') || <span className="text-zinc-400">未指定</span>}</dd>
      </dl>
    </div>
  )
}

export function ConfirmStep({ studio }: { studio: Studio }) {
  const { state, dispatch, generate } = studio
  const { score, tips } = scoreBrief(state.brief)

  return (
    <StepCard
      title="确认并生成"
      description="以下是将提交给 JD 生成工作流的内容。生成时会读取官网、检索公开信息，并对初稿做一次审校。"
      footer={
        <>
          <Button variant="ghost" onClick={() => dispatch({ type: 'goto_step', step: 'extras' })} disabled={state.filling}>
            <ArrowLeft className="size-4" />
            上一步
          </Button>
          <Button variant="ai" size="lg" onClick={generate} disabled={state.filling}>
            <Sparkles className="size-4" />
            生成 JD
          </Button>
        </>
      }
    >
      <ComposePreviewCard key={JSON.stringify([state.brief, state.roleMode])} brief={state.brief} mode={state.roleMode} />
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
        <CompletenessRing score={score} size={40} />
        <div className="min-w-0 text-[13px] leading-6">
          <div className="font-medium text-zinc-800">信息完整度 {score}%</div>
          {tips.length ? (
            <ul className="text-zinc-500">
              {tips.slice(0, 3).map((tip) => (
                <li key={tip}>· {tip}</li>
              ))}
            </ul>
          ) : (
            <div className="text-zinc-500">信息很完整，可以开始生成了</div>
          )}
        </div>
      </div>
    </StepCard>
  )
}
