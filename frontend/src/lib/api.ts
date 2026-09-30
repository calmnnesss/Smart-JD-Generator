import type { BriefDraft, ComposePreview, Engine, GenerateEvent, RoleMode, RoleParseResult, TechGroup } from '../types'
import { createSseParser, toGenerateEvent } from './sse'

const CLIENT_ID_KEY = 'smart-jd:client-id'

function clientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      localStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

const orNull = (value: string) => value.trim() || null

export function toPayload(brief: BriefDraft, mode: RoleMode) {
  const { company, role } = brief
  return {
    company: { name: company.name.trim(), domain: company.domain.trim(), description: company.description.trim() },
    role: {
      title: role.title.trim(),
      scene: orNull(role.scene),
      locations: role.locations,
      hire_type: role.hire_type || null,
      cohort: orNull(role.cohort),
      experience: orNull(role.experience),
      level: orNull(role.level),
      extra: orNull(role.extra),
    },
    benefits: brief.benefits,
    tech_stack: brief.tech_stack,
    mode,
    client_id: clientId(),
  }
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function fetchHealth(): Promise<{ configured: boolean; llm_configured: boolean }> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function fetchTechGroups(): Promise<TechGroup[]> {
  const res = await fetch('/api/tech-groups')
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

/** 用中间层 LLM 拆解一句话；LLM 未配置或调用失败时抛错，由调用方回退到本地规则 */
export function parseRoleWithLlm(text: string, signal?: AbortSignal): Promise<RoleParseResult> {
  return postJson('/api/parse-role', { text }, signal)
}

/** 判断岗位属于哪个技术栈标签组（后端在 LLM 不可用时自动回退到关键词规则） */
export function classifyRole(title: string, scene: string): Promise<{ category: string; engine: Engine }> {
  return postJson('/api/classify-role', { title, scene: scene || null })
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return '有字段不符合要求，请检查后重试'
  } catch {
    /* 非 JSON 响应 */
  }
  return res.status >= 500 ? '服务暂时不可用，请稍后再试' : `请求失败（${res.status}）`
}

export function fetchComposePreview(brief: BriefDraft, mode: RoleMode): Promise<ComposePreview> {
  return postJson('/api/compose', toPayload(brief, mode))
}

/** 调用 /api/generate 并逐个回调精简后的生成事件。EventSource 不支持 POST，所以用 fetch 读流。 */
export async function streamGenerate(
  brief: BriefDraft,
  mode: RoleMode,
  onEvent: (event: GenerateEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(toPayload(brief, mode)),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(await errorMessage(res))

  const feed = createSseParser((raw) => {
    const event = toGenerateEvent(raw)
    if (event) onEvent(event)
  })
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    feed(value)
  }
}
