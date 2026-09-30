export type HireType = '校招' | '社招' | '实习'
/** 岗位需求的描述方式：一句话识别 / 逐项引导 */
export type RoleMode = 'quick' | 'guided'

export interface BriefDraft {
  company: { name: string; domain: string; description: string }
  role: {
    title: string
    scene: string
    /** 工作地点，可多选；「远程」作为一个选项 */
    locations: string[]
    hire_type: HireType | ''
    cohort: string
    experience: string
    level: string
    extra: string
  }
  benefits: string[]
  tech_stack: string[]
}

export interface StageInfo {
  id: string
  label: string
}

export type StageStatus = 'pending' | 'running' | 'done' | 'skipped'

export interface JdResult {
  jd_markdown: string
  missing_info: string[]
  elapsed_s: number
}

export interface ComposePreview {
  company_domain: string
  hiring_needs: string
  specific_benefits: string
  tech_stack: string
}

/** 一次生成的运行状态 */
export interface Run {
  id: string
  status: 'running' | 'done' | 'error' | 'stopped'
  stages: StageInfo[]
  stageState: Record<string, { status: StageStatus; elapsedMs?: number }>
  delta: string
  result?: JdResult
  error?: { message: string; retryable: boolean }
  startedAt: number
  finishedAt?: number
}

export type GenerateEvent =
  | { type: 'stages'; stages: StageInfo[] }
  | { type: 'stage'; id: string; status: StageStatus; elapsed_ms?: number }
  | { type: 'delta'; text: string }
  | { type: 'result'; result: JdResult }
  | { type: 'error'; message: string; retryable: boolean }

export const emptyBrief = (): BriefDraft => ({
  company: { name: '', domain: '', description: '' },
  role: { title: '', scene: '', locations: [], hire_type: '', cohort: '', experience: '', level: '', extra: '' },
  benefits: [],
  tech_stack: [],
})

/** 技术栈与方法的预设标签组（由后端提供） */
export interface TechGroup {
  id: string
  label: string
  tags: string[]
}

/** 一句话识别结果：engine 标明来自 LLM 还是本地规则 */
export interface RoleParseResult {
  title?: string | null
  scene?: string | null
  locations?: string[]
  hire_type?: HireType | null
  cohort?: string | null
  experience?: string | null
  level?: string | null
  extra?: string | null
  category?: string | null
}

export type Engine = 'llm' | 'rules'
