import type { HireType } from '../types'

/** 一句话招聘需求的规则解析结果（LLM 不可用时的本地回退） */
export interface ParsedHiring {
  title?: string
  scene?: string
  locations?: string[]
  hire_type?: HireType
  cohort?: string
  experience?: string
  extra?: string
}

export const HOT_CITIES = ['杭州', '上海', '北京', '深圳', '广州', '成都']
export const REMOTE_OPTION = '远程'
export const MORE_CITIES = [
  '南京', '苏州', '武汉', '西安', '重庆', '天津', '长沙', '厦门', '合肥', '青岛', '宁波', '郑州',
  '济南', '福州', '大连', '珠海', '东莞', '无锡', '佛山', '南昌', '昆明', '沈阳', '香港', '新加坡',
]
export const ALL_CITIES = [...HOT_CITIES, ...MORE_CITIES]

const COHORT = /(20\d{2})\s*届/
const EXPERIENCE_RANGE = /(\d{1,2})\s*[-~～至到]\s*(\d{1,2})\s*年/
const EXPERIENCE_MIN = /(\d{1,2})\s*年以上/
const EXPERIENCE_ANY = /经验不限/
const LOCATION_MARKER = /(?:base|工作地点|地点|坐标|驻地?)\s*[:：在于]?\s*((?:[一-龥]{2,4}\s*[/、和或及]?\s*)+)/i
const REMOTE = /远程/
const TITLE_PREFIX = /^(?:我们)?(?:想|要|需要)?(?:招聘?|招募)?(?:一名|一位|一个|几名|若干)?/
const FILLER = /^[\s,，;；。、:：()（）\-~]*(?:base|的|经验|要求|岗位|方向|年限|均可|皆可|都可以?)?[\s,，;；。、:：()（）\-~]*$/i

function detectHireType(text: string): HireType | undefined {
  if (/校招|校园招聘|应届/.test(text)) return '校招'
  if (/社招|社会招聘/.test(text)) return '社招'
  if (/实习/.test(text)) return '实习'
  return undefined
}

/**
 * 把「AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招」
 * 拆成岗位 / 场景 / 地点 / 类型 / 届别 / 经验，识别不了的分句原样放进 extra，保证不丢信息。
 */
export function parseHiring(input: string): ParsedHiring {
  const result: ParsedHiring = {}
  const clauses = input
    .split(/[，,；;。\n]+/)
    .map((c) => c.trim())
    .filter(Boolean)
  const leftovers: string[] = []
  const locations: string[] = []
  const addLocation = (city: string) => {
    if (!locations.includes(city)) locations.push(city)
  }

  clauses.forEach((clause, index) => {
    let rest = clause

    const cohort = rest.match(COHORT)
    if (cohort) {
      result.cohort ??= `${cohort[1]}届`
      rest = rest.replace(cohort[0], ' ')
    }

    const hireType = detectHireType(rest)
    if (hireType && !result.hire_type) {
      result.hire_type = hireType
      rest = rest.replace(/校园招聘|社会招聘|校招|社招|应届生?/, ' ')
      if (hireType === '实习') rest = rest.replace(/^(.*?)实习(?!生)/, '$1 ')
    }

    const range = rest.match(EXPERIENCE_RANGE)
    const min = rest.match(EXPERIENCE_MIN)
    if (range) {
      result.experience ??= `${range[1]}-${range[2]}年`
      rest = rest.replace(range[0], ' ').replace(/经验/, ' ')
    } else if (min) {
      result.experience ??= `${min[1]}年以上`
      rest = rest.replace(min[0], ' ').replace(/经验/, ' ')
    } else if (EXPERIENCE_ANY.test(rest)) {
      result.experience ??= '不限'
      rest = rest.replace(EXPERIENCE_ANY, ' ')
    }

    const marker = rest.match(LOCATION_MARKER)
    if (marker) {
      // 「base 杭州/上海」：拆出多个城市，词表里的城市取词表名，其余 2-3 字的地名原样保留
      for (const token of marker[1].split(/[\s/、和或及]+/).filter(Boolean)) {
        const known = [...ALL_CITIES, REMOTE_OPTION].filter((c) => token.includes(c))
        if (known.length) known.forEach(addLocation)
        else if (token.length <= 3) addLocation(token)
      }
      rest = rest.replace(marker[0], ' ')
    }
    if (REMOTE.test(rest)) {
      addLocation(REMOTE_OPTION)
      rest = rest.replace(/(?:可|支持)?远程(?:办公)?/, ' ')
    }
    for (const city of ALL_CITIES.filter((c) => rest.includes(c))) {
      addLocation(city)
      rest = rest.replace(new RegExp(`(?:在|位于)?${city}(?:的)?`), ' ')
    }

    rest = rest.replace(/\s+/g, ' ').replace(/^[\s、/]+|[\s、/]+$/g, '').trim()
    if (!rest || FILLER.test(rest)) return

    if (rest.startsWith('负责')) {
      result.scene ??= rest.replace(/^负责/, '').trim()
      return
    }
    if (index === 0 && !result.title) {
      const [title, scene] = rest.split(/\s*负责\s*/, 2)
      const cleaned = title.replace(TITLE_PREFIX, '').trim()
      if (cleaned) result.title = cleaned
      if (scene) result.scene ??= scene.trim()
      return
    }
    leftovers.push(rest)
  })

  if (locations.length) result.locations = locations
  if (leftovers.length) result.extra = leftovers.join('，')
  return result
}
