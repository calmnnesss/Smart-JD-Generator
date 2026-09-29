import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field, MultiChips } from './controls'
import { BENEFIT_OPTIONS, techSuggestions } from './options'
import { StepCard } from './StepShell'
import type { Studio } from './useStudio'

export function ExtrasStep({ studio }: { studio: Studio }) {
  const { state, dispatch } = studio
  const { benefits, tech_stack, role } = state.brief

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
        hint={
          <>
            只会使用这里选定的名称；留空时技术要求会写成不依赖具体选型的能力描述。
            {role.title && <span className="text-zinc-400">（推荐基于「{role.title}」）</span>}
          </>
        }
      >
        <MultiChips
          options={techSuggestions(role.title)}
          value={tech_stack}
          onChange={(items) => dispatch({ type: 'set_list', key: 'tech_stack', items })}
          customPlaceholder="添加其他技术，回车确认"
        />
      </Field>
    </StepCard>
  )
}
