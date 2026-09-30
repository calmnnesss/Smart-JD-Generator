import { motion } from 'motion/react'
import { cn } from '../../lib/cn'
import { revealAt } from './motion'
import { Section, SectionHeading } from './SectionHeading'

const KINDS = [
  { question: '公司是什么样的', kind: '事实', rule: '不能推断', stage: '① 公司文化分析', level: 4 },
  { question: '这个岗位需要什么人', kind: '推断', rule: '只限岗位能力', stage: '② 岗位需求提取', level: 3 },
  { question: '怎么写成文案', kind: '组织', rule: '只用上游给定的内容', stage: '③ 起草 JD', level: 2 },
  { question: '哪里写错了', kind: '检查', rule: '只能删改', stage: '④ 审校', level: 1 },
]

/** 四格权限条：越往后可动用的空间越小 */
function LevelMeter({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`权限 ${level} / 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={cn('h-1.5 w-5 rounded-full', i <= level ? 'bg-linear-to-r from-ai-indigo to-ai-violet' : 'bg-zinc-200')} />
      ))}
    </div>
  )
}

export function HowItWorks() {
  return (
    <Section id="how">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <SectionHeading
          eyebrow="工作原理"
          title="把「写一份 JD」拆成四个职责单一的环节"
          description="受 CrewAI 多 Agent 编排的启发，每个环节只能看到上一环交给它的东西。"
        />
        <motion.p {...revealAt(1)} className="self-end text-base leading-8 text-zinc-600">
          拆分的依据是信息性质的不同：公司是什么样的、这个岗位需要什么人、怎么写成文案、哪里写错了。这四类工作各有各的约束条件，拆开之后，每一环单独遵守一套规则。
        </motion.p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KINDS.map((item, i) => (
          <motion.div
            key={item.kind}
            {...revealAt(i, 0.08)}
            className="flex flex-col rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{item.kind}</span>
              <LevelMeter level={item.level} />
            </div>
            <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-zinc-900">{item.question}</h3>
            <p className="mt-2 text-sm text-zinc-600">{item.rule}</p>
            <div className="mt-auto pt-6 text-xs text-zinc-400">
              对应环节 <span className="ml-1 text-zinc-700">{item.stage}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
