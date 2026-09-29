import type { BriefDraft, ComposePreview, GenerateEvent, Route } from '../types'
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

export function toPayload(brief: BriefDraft, route: Route | null) {
  const { company, role } = brief
  return {
    company: { name: company.name.trim(), domain: company.domain.trim(), description: company.description.trim() },
    role: {
      title: role.title.trim(),
      scene: orNull(role.scene),
      location: orNull(role.location),
      hire_type: role.hire_type || null,
      cohort: orNull(role.cohort),
      experience: orNull(role.experience),
      level: orNull(role.level),
      extra: orNull(role.extra),
    },
    benefits: brief.benefits,
    tech_stack: brief.tech_stack,
    supplements: brief.supplements,
    mode: route ?? 'quick',
    client_id: clientId(),
  }
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

export async function fetchComposePreview(brief: BriefDraft, route: Route | null): Promise<ComposePreview> {
  const res = await fetch('/api/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(brief, route)),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

/** 调用 /api/generate 并逐个回调精简后的生成事件。EventSource 不支持 POST，所以用 fetch 读流。 */
export async function streamGenerate(
  brief: BriefDraft,
  route: Route | null,
  onEvent: (event: GenerateEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(toPayload(brief, route)),
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
