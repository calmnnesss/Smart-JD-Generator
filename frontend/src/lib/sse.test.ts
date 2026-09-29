import { describe, expect, it } from 'vitest'
import { createSseParser, toGenerateEvent } from './sse'

describe('createSseParser', () => {
  it('处理任意切分的块、注释与 CRLF', () => {
    const events: { event: string; data: string }[] = []
    const feed = createSseParser((e) => events.push(e))
    feed('event: stages\ndata: {"stages":[{"id":"fetch","label":"访问公司官网"}]}\n')
    feed('\n: ping\n\nevent: sta')
    feed('ge\r\ndata: {"id":"fetch","status":"running"}\r\n\r\n')
    expect(events).toEqual([
      { event: 'stages', data: '{"stages":[{"id":"fetch","label":"访问公司官网"}]}' },
      { event: 'stage', data: '{"id":"fetch","status":"running"}' },
    ])
  })
})

describe('toGenerateEvent', () => {
  it('映射为前端事件', () => {
    expect(toGenerateEvent({ event: 'stage', data: '{"id":"draft","status":"done","elapsed_ms":1200}' })).toEqual({
      type: 'stage',
      id: 'draft',
      status: 'done',
      elapsed_ms: 1200,
    })
    expect(toGenerateEvent({ event: 'error', data: '{"message":"x","retryable":false}' })).toEqual({
      type: 'error',
      message: 'x',
      retryable: false,
    })
    expect(toGenerateEvent({ event: 'unknown', data: '{}' })).toBeNull()
    expect(toGenerateEvent({ event: 'stage', data: 'oops' })).toBeNull()
  })
})
