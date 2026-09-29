import { describe, expect, it } from 'vitest'
import { parseHiring } from './parseHiring'

describe('parseHiring', () => {
  it('拆解示例需求', () => {
    expect(parseHiring('AI 产品经理,负责金融场景下的大模型应用产品,base 杭州,2026 届校招')).toEqual({
      title: 'AI 产品经理',
      scene: '金融场景下的大模型应用产品',
      location: '杭州',
      hire_type: '校招',
      cohort: '2026届',
    })
  })

  it('识别社招经验与句首城市', () => {
    expect(parseHiring('招一个杭州的后端工程师，3-5年经验，社招，负责支付系统')).toEqual({
      title: '后端工程师',
      scene: '支付系统',
      location: '杭州',
      hire_type: '社招',
      experience: '3-5年',
    })
  })

  it('同一分句里的届别与实习', () => {
    expect(parseHiring('2027届数据分析实习，工作地点：上海')).toEqual({
      title: '数据分析',
      location: '上海',
      hire_type: '实习',
      cohort: '2027届',
    })
  })

  it('岗位与场景写在同一分句', () => {
    expect(parseHiring('算法工程师负责推荐系统，5年以上经验，远程')).toEqual({
      title: '算法工程师',
      scene: '推荐系统',
      experience: '5年以上',
      location: '远程',
    })
  })

  it('识别不了的内容进入 extra', () => {
    const parsed = parseHiring('前端工程师，需要能适应出差，熟悉英文')
    expect(parsed.title).toBe('前端工程师')
    expect(parsed.extra).toBe('需要能适应出差，熟悉英文')
  })

  it('空输入', () => {
    expect(parseHiring('  ')).toEqual({})
  })
})
