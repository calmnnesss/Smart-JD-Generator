/** 表单里的快捷选项（纯前端预设） */

export const ROLE_SUGGESTIONS = [
  'AI 产品经理', '产品经理', '后端工程师', '前端工程师', '算法工程师', '大模型算法工程师',
  '数据分析师', '数据工程师', '测试工程师', 'UI/UX 设计师', '用户运营', '销售经理', 'HRBP',
]

export const SCENE_EXAMPLES = ['金融场景下的大模型应用产品', '企业知识库与智能问答', '电商推荐系统', 'B 端 SaaS 产品']

export const HIRE_TYPES = [
  { value: '校招', label: '校招', description: '面向应届毕业生' },
  { value: '社招', label: '社招', description: '有工作经验的候选人' },
  { value: '实习', label: '实习', description: '在校学生实习岗位' },
]

export function cohortOptions(now = new Date()): string[] {
  const year = now.getFullYear()
  return [year - 1, year, year + 1, year + 2].map((y) => `${y}届`)
}

export const EXPERIENCE_OPTIONS = ['不限', '1-3年', '3-5年', '5-10年', '10年以上']

export const LEVEL_OPTIONS = ['初级', '中级', '高级', '资深', '专家']

export const BENEFIT_OPTIONS = [
  '六险一金', '五险一金', '免费三餐', '弹性工作', '年度调薪', '带薪年假',
  '年终奖', '股票期权', '补充医疗保险', '住房补贴', '定期体检', '团建旅游',
]
