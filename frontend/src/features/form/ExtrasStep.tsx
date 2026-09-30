import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import { useTechGroups } from '../../lib/serverInfo'
import { Field, MultiChips, SelectBox } from './controls'
import { BENEFIT_OPTIONS } from './options'
import { StepCard } from './StepShell'
import type { Studio } from './useStudio'

function TechGroupNote({ studio }: { studio: Studio }) {
  const { tech, brief } = studio.state
  const title = brief.role.title.trim()
  if (tech.loading) return <span className="shimmer-text text-xs">AI 正在判断「{title}」适合的标签组…</span>
  if (!title) return <span className="text-xs text-zinc-400">未填写岗位名称，可手动选择标签组</span>
  if (tech.engine === 'llm')
    return (
      <span className="flex items-center gap-1 text-xs text-zinc-500">
        <Sparkles className="size-3 text-violet-500" />由 AI 根据「{tech.forTitle}」推荐
      </span>
    )
  if (tech.engine === 'rules') return <span className="text-xs text-zinc-500">按岗位名称关键词匹配</span>
  if (tech.engine === 'manual') return <span className="text-xs text-zinc-500">已手动选择</span>
  return null
}

export function ExtrasStep({ studio }: { studio: Studio }) {
  const { state, dispatch, ensureTechGroup } = studio
  const { benefits, tech_stack, role } = state.brief
  const groups = useTechGroups()
  const group = groups?.find((g) => g.id === state.tech.group) ?? groups?.find((g) => g.id === 'general')

  // 进入这一步或岗位名称变化后，判断岗位对应的标签组
  useEffect(() => {
    ensureTechGroup()
  }, [ensureTechGroup, role.title, state.tech.forTitle, state.tech.loading])

  return (
    <StepCard
      title="福利与技术栈"
      description="这两项都会被逐字写进 JD，不做改写或扩充；都可以留空。"
      footer={
        <>
          <Button variant="ghost" onClick={() => dispatch({ type: 'goto_step', step: 'role' })} disabled={state.filling}>
            <ArrowLeft className="size-4" />
            上一步
          </Button>
          <Button variant="primary" onClick={() => dispatch({ type: 'goto_step', step: 'confirm' })} disabled={state.filling}>
            下一步
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <Field
        label="岗位福利"
        badge={benefits.length ? undefined : 'optional'}
        hint="留空时 JD 不会出现福利部分。注意措辞：「弹性工作」和「弹性工作制」的承诺强度不同。"
      >
        <MultiChips
          options={BENEFIT_OPTIONS}
          value={benefits}
          onChange={(items) => dispatch({ type: 'set_list', key: 'benefits', items })}
          customPlaceholder="添加其他福利，回车确认"
        />
      </Field>
      <Field
        label="技术栈与方法"
        badge={tech_stack.length ? undefined : 'optional'}
        hint="只会使用这里选定的名称；留空时技术要求会写成不依赖具体选型的能力描述。"
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs text-zinc-500">标签组</span>
          <SelectBox
            value={group?.id ?? ''}
            options={(groups ?? []).map((g) => g.id)}
            labels={Object.fromEntries((groups ?? []).map((g) => [g.id, g.label]))}
            placeholder="加载中…"
            onChange={(id) => dispatch({ type: 'set_tech_group', group: id })}
            size="sm"
            className="w-44"
          />
          <TechGroupNote studio={studio} />
        </div>
        {group && !state.tech.loading ? (
          <MultiChips
            options={group.tags}
            value={tech_stack}
            onChange={(items) => dispatch({ type: 'set_list', key: 'tech_stack', items })}
            customPlaceholder="添加其他技术或方法，回车确认"
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {[64, 88, 72, 96, 60, 80].map((w, i) => (
              <div key={i} className="skeleton h-8 rounded-full" style={{ width: w }} />
            ))}
          </div>
        )}
      </Field>
    </StepCard>
  )
}
