import { motion } from 'motion/react'
import { cn } from '../../lib/cn'
import { reveal, revealAt } from './motion'
import { Section, SectionHeading } from './SectionHeading'

const BASELINE =
  '把公司简介和招聘需求整段丢给一个通用大模型，让它一次性产出 JD，是最省事的做法。但给的信息不够填满 JD 的各个小节时，不够的部分它会用训练数据里见过的同类表述补上。合规素材不足时，不合规的素材就会补进来。'

const FAILURES = [
  { title: '编造业务细节', body: '听上去很具体，但在用户输入材料里查不到任何依据。' },
  { title: '扩写福利', body: '输入里没有的福利被补进来，已有的福利也被写得更慷慨。' },
  { title: '自行添加录用门槛', body: '学历、年限、证书之类的硬性要求，输入里没有，输出里却出现了。' },
  { title: '自行推断技术栈', body: '未指定技术栈时，模型会从岗位名称联想出一串具体的工具和框架。' },
  { title: '岗位范围被悄悄改窄', body: '模型挑了一个它更有话可说的子方向，招聘范围就此缩小，而没人察觉。' },
]

const KINDS = [
  { question: '公司是什么样的', kind: '事实', rule: '来自用户输入与网络检索', stage: '① 公司文化分析', level: 4 },
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

/** 问题：直接让通用大模型一次性写 JD 时反复出现的失效 */
function Failures() {
  return (
    <>
      <SectionHeading eyebrow="工作原理" title="直接让 AI 写 JD，幻觉难以控制" description={BASELINE} />
      <motion.p {...reveal} className="mt-12 text-xs text-zinc-500">
        在约束补齐之前的版本里，反复观察到这几类失效
      </motion.p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FAILURES.map((item, i) => (
          <motion.div key={item.title} {...revealAt(i, 0.06)} className="rounded-2xl border border-zinc-200/70 bg-white/55 p-4 backdrop-blur">
            <span className="font-mono text-[11px] text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-zinc-800">{item.title}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-zinc-500">{item.body}</p>
          </motion.div>
        ))}
      </div>
    </>
  )
}

/** 转折：难题不是写得更好，而是信息不足时停下来 */
function Turn() {
  return (
    <motion.div {...reveal} className="mx-auto my-20 max-w-3xl text-center sm:my-24">
      <span aria-hidden className="mx-auto mb-8 block h-12 w-px bg-linear-to-b from-transparent to-violet-400" />
      <p className="text-xl leading-9 font-medium tracking-tight text-balance text-zinc-900 sm:text-2xl sm:leading-10">
        所以真正的难题不是「让 AI 写得更好」，
        <br className="hidden sm:block" />
        而是让它在信息不足时<span className="ai-text">停下来</span>，而不是补满。
      </p>
      <p className="mt-4 text-[15px] leading-7 text-pretty text-zinc-600">
        有效的办法是换一个结构：把生成过程拆开，让每个环节只处理自己职责内的信息。
      </p>
    </motion.div>
  )
}

/** 方案：按信息性质拆成四个环节 */
function Stages() {
  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <motion.div {...reveal} className="max-w-2xl">
          <h3 className="text-2xl leading-tight font-semibold tracking-tight text-balance text-zinc-900 sm:text-[28px]">
            把「写一份 JD」拆成四个职责单一的环节
          </h3>
          <p className="mt-4 text-base leading-8 text-pretty text-zinc-600">
            受 CrewAI 多 Agent 编排的启发，每个环节只负责一类信息、遵守一套规则，上游整理好的结果是下游的主要依据。
          </p>
        </motion.div>
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
            <h4 className="mt-5 text-[17px] font-semibold tracking-tight text-zinc-900">{item.question}</h4>
            <p className="mt-2 text-sm text-zinc-600">{item.rule}</p>
            <div className="mt-auto pt-6 text-xs text-zinc-400">
              对应环节 <span className="ml-1 text-zinc-700">{item.stage}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  )
}

export function HowItWorks() {
  return (
    <Section id="how">
      <Failures />
      <Turn />
      <Stages />
    </Section>
  )
}
