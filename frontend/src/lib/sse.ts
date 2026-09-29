import type { GenerateEvent, JdResult, StageInfo, StageStatus } from '../types'

interface RawEvent {
  event: string
  data: string
}

/** 增量解析 SSE 文本：喂入任意切分的文本块，完整事件就绪时回调。 */
export function createSseParser(onEvent: (event: RawEvent) => void) {
  let buffer = ''
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (data.length) onEvent({ event, data: data.join('\n') })
      boundary = buffer.indexOf('\n\n')
    }
  }
}

export function toGenerateEvent({ event, data }: RawEvent): GenerateEvent | null {
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(data)
  } catch {
    return null
  }
  switch (event) {
    case 'stages':
      return { type: 'stages', stages: (payload.stages ?? []) as StageInfo[] }
    case 'stage':
      return {
        type: 'stage',
        id: String(payload.id),
        status: payload.status as StageStatus,
        elapsed_ms: typeof payload.elapsed_ms === 'number' ? payload.elapsed_ms : undefined,
      }
    case 'delta':
      return { type: 'delta', text: String(payload.text ?? '') }
    case 'result':
      return { type: 'result', result: payload as unknown as JdResult }
    case 'error':
      return { type: 'error', message: String(payload.message ?? '生成失败'), retryable: payload.retryable !== false }
    default:
      return null
  }
}
