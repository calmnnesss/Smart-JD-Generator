export type HireType = '校招' | '社招' | '实习'
/** 岗位需求的描述方式：一句话识别 / 逐项引导 */
export type RoleMode = 'quick' | 'guided'

export interface BriefDraft {
  company: { name: string; domain: string; description: string }
  role: {
    title: string
    scene: string
    location: string
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
  role: { title: '', scene: '', location: '', hire_type: '', cohort: '', experience: '', level: '', extra: '' },
  benefits: [],
  tech_stack: [],
})
