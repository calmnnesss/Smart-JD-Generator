import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { normalizeUrl } from '../../lib/url'
import { Field, TextareaField, TextField, UrlField } from './controls'
import { hasErrors, stepIssues } from './fields'
import { StepCard } from './StepShell'
import type { Studio } from './useStudio'

export function CompanyStep({ studio }: { studio: Studio }) {
  const { state, dispatch, fillSample } = studio
  const { company } = state.brief
  const [showErrors, setShowErrors] = useState(false)
  const issues = stepIssues(state.brief, 'company')
  const errors = showErrors ? issues.errors : {}
  const patch = (p: Partial<typeof company>) => dispatch({ type: 'patch_company', patch: p })

  const next = () => {
    if (hasErrors(issues)) {
      setShowErrors(true)
      return
    }
    patch({ domain: normalizeUrl(company.domain) })
    dispatch({ type: 'goto_step', step: 'role' })
  }

  return (
    <StepCard
      title="这次为哪家公司招人？"
      description="公司信息是 JD 生成时可信度最高的来源，只填写确定属实的内容。"
      action={
        <Button size="sm" onClick={fillSample} disabled={state.filling}>
          <Sparkles className="size-3.5 text-violet-500" />
          用示例填充
        </Button>
      }
      footer={
        <>
          <span className="text-xs text-zinc-400">带 * 为必填</span>
          <Button variant="primary" onClick={next} disabled={state.filling}>
            下一步
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <Field label="公司名称" required hint="填写工商注册名或通用简称" error={errors.name}>
        <TextField value={company.name} onChange={(name) => patch({ name })} placeholder="例如：恒生电子" autoFocus invalid={!!errors.name} />
      </Field>
      <Field label="官网" required error={undefined}>
        <UrlField value={company.domain} onChange={(domain) => patch({ domain })} error={errors.domain} />
      </Field>
      <Field label="公司介绍" required hint="一到三段即可。这里的错误会被带进最终 JD，不确定的内容不要写。" error={errors.description}>
        <TextareaField
          value={company.description}
          onChange={(description) => patch({ description })}
          placeholder="主营业务、主要客户、成立时间与总部、近期投入方向、团队特点……"
          tips={['主营业务', '主要客户', '成立时间与总部', '近期投入方向', '团队协作特点']}
          invalid={!!errors.description}
          shortBelow={60}
        />
      </Field>
    </StepCard>
  )
}
