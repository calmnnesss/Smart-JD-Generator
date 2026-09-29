import { expect, it } from 'vitest'
import { markdownToPlain } from './markdown'

it('markdownToPlain', () => {
  const md = '# AI 产品经理\n\n**工作地点**:杭州\n\n## 岗位职责\n1. 负责 *RAG* 设计\n- 六险一金\n\n\n\n> 引用'
  expect(markdownToPlain(md)).toBe('AI 产品经理\n\n工作地点:杭州\n\n岗位职责\n1. 负责 RAG 设计\n• 六险一金\n\n引用')
})
