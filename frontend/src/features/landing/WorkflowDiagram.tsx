import { ArrowDown } from 'lucide-react'
import { motion } from 'motion/react'
import { Fragment } from 'react'
import { cn } from '../../lib/cn'
import { reveal, revealAt } from './motion'
import { Section, SectionHeading } from './SectionHeading'

interface Node {
  title: string
  detail: string
  rule?: string
  badge?: string
  kind: 'io' | 'retrieve' | 'stage' | 'output'
}

const NODES: Node[] = [
  { kind: 'io', title: '输入', detail: '公司信息 + 招聘需求，5 到 6 个字段' },
  { kind: 'retrieve', title: '自动检索', detail: '官网正文 + 公开信息（并行）', rule: '抓不到也不中断' },
  { kind: 'stage', title: '① 公司文化分析', detail: '提炼文化与卖点，逐条附原文出处', rule: '只引用，不推断' },
  { kind: 'stage', title: '② 岗位需求提取', detail: '推断职责、技能、经验、特质四组画像', rule: '仅岗位能力可推断' },
  { kind: 'stage', title: '③ 起草 JD', detail: '组织成七个小节的 markdown 正文', rule: '只组织上游给的内容' },
  { kind: 'stage', title: '④ 审校', detail: '按八项清单逐条检查', rule: '只删改，不重写', badge: '异构模型' },
  { kind: 'output', title: '输出', detail: 'JD 正文 · 补充建议', rule: '补充建议随 MCP 调用一并返回' },
]

function NodeCard({ node }: { node: Node }) {
  const output = node.kind === 'output'
  return (
    <div
      className={cn(
        'relative rounded-2xl px-5 py-4 text-center transition',
        output
          ? 'ai-border shadow-glow [--ai-fill:#f6f3ff]'
          : node.kind === 'stage'
            ? 'border border-zinc-200/80 bg-white shadow-soft'
            : 'border border-dashed border-zinc-300 bg-white/70',
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <span className={cn('text-[15px] font-semibold', output ? 'text-violet-800' : 'text-zinc-900')}>{node.title}</span>
        {node.badge && <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 text-[11px] leading-5 text-violet-700">{node.badge}</span>}
      </div>
      <p className={cn('mt-1 text-[13px] leading-6', output ? 'text-violet-700/80' : 'text-zinc-500')}>{node.detail}</p>
      {/* 移动端把约束放在节点内 */}
      {node.rule && <p className="mt-2 text-xs text-violet-600 lg:hidden">{node.rule}</p>}
    </div>
  )
}

export function WorkflowDiagram() {
  const rows = NODES.length * 2 - 1
  return (
    <Section id="workflow" className="border-y border-zinc-200/60 bg-white/50">
      <SectionHeading
        eyebrow="工作流架构"
        title="权限逐级收紧：越靠后的环节越不能新增内容"
        description="四个生成环节依次接力，每一环能动用的信息都由上一环锁定。"
      />

      <div className="mx-auto mt-14 grid max-w-4xl lg:grid-cols-[5rem_minmax(0,32rem)_minmax(0,1fr)] lg:gap-x-8">
        {/* 权限色带：自上而下逐渐变窄 */}
        <motion.div
          {...reveal}
          aria-hidden
          className="relative hidden lg:block"
          style={{ gridRow: `1 / span ${rows}` }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-violet-600">可新增内容</span>
          <div className="absolute inset-x-0 top-7 bottom-7 mx-auto w-12 bg-linear-to-b from-ai-indigo/45 via-ai-violet/25 to-ai-violet/10 [clip-path:polygon(0_0,100%_0,58%_100%,42%_100%)]" />
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-zinc-400">只能删</span>
        </motion.div>

        {NODES.map((node, i) => (
          <Fragment key={node.title}>
            <motion.div {...revealAt(i, 0.08)} className="lg:col-start-2">
              <NodeCard node={node} />
            </motion.div>
            <motion.div {...revealAt(i, 0.08)} className="hidden items-center lg:col-start-3 lg:flex">
              {node.rule && (
                <span className="flex items-center gap-3 text-[13px] text-zinc-500">
                  <span className="h-px w-6 bg-zinc-300" />
                  {node.rule}
                </span>
              )}
            </motion.div>
            {i < NODES.length - 1 && (
              <div className="flex justify-center py-1.5 lg:col-start-2" aria-hidden>
                <ArrowDown className="size-4 text-zinc-300" />
              </div>
            )}
            {i < NODES.length - 1 && <div className="hidden lg:col-start-3 lg:block" aria-hidden />}
          </Fragment>
        ))}
      </div>

      <motion.blockquote
        {...reveal}
        className="mx-auto mt-14 max-w-3xl border-l-2 border-violet-400 pl-5 text-base leading-8 text-zinc-600"
      >
        约束方向是单调收紧的：越靠后的环节能做的事越少，到最后一环只剩「删」这一个动作。
        <span className="text-zinc-900">控制幻觉靠的正是这个结构</span>：每一环能动用的信息都由上一环锁定。
      </motion.blockquote>
    </Section>
  )
}
