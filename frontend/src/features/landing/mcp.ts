/** MCP 服务信息：地址、工具 schema 与客户端配置片段（schema 与 Dify 中发布的工具保持一致） */

export const MCP_URL = 'https://api.dify.ai/mcp/server/tVcNH8P1xBQl51wT/mcp'
export const MCP_TOOL = 'JD_generator_v3'

export const MCP_SCHEMA = {
  description:
    '根据公司信息与招聘需求,生成一份中文招聘启事(JD)底稿。 适用于用户需要撰写或起草招聘启事、职位描述、招聘广告的场景。工具会自动检索公司官网与公开信息补足背景,输出 markdown 格式的 JD 正文,以及一份「仍需人工补充的信息」清单。 重要:本工具只使用调用方提供的信息和检索到的公开信息,不编造公司业务、团队规模、福利或培养承诺。若输出显得单薄或含占位符,应查看补充建议清单并向用户索取缺失信息后重新调用,不要自行补全 JD 内容。',
  name: 'Dify JD Workflow:JD_generator_v3',
  parameters: {
    properties: {
      company_description: {
        description:
          '调用方已知的公司简介,一到三段即可。内容会被视为最高可信度的信息源,优先于自动检索结果。只填能确认属实的信息,不要为了让描述丰满而加入不确定的内容——此处错误会被完整放大到最终 JD 中。',
        type: 'string',
      },
      company_domain: {
        description:
          '公司官网完整网址,必须包含 https:// 协议头,工具会抓取该网址的正文作为公司背景信息来源。填写错误或网站不可访问时工具不会报错,但公司侧信息会较为薄弱。',
        type: 'string',
      },
      company_name: {
        description: '公司全称,用于检索该公司的公开信息。填写工商注册名或通用简称,不要填品牌口号或业务线名称。',
        type: 'string',
      },
      hiring_needs: {
        description:
          '本次招聘需求,建议包含:岗位名称、业务场景、工作地点、职级或届别。这里明确给出的条件(如届别、年限、地点)会被保留到 JD 中;未给出的录用门槛(学历、专业、证书)工具不会自行添加。',
        type: 'string',
      },
      specific_benefits: {
        description:
          '需要写进 JD 的福利项,用顿号分隔,例如"六险一金、免费三餐、弹性工作、年度调薪"。工具会逐字使用这些表述,不做任何修改或扩充。可以留空,留空时 JD 不会出现物质福利部分。注意用词精确:"弹性工作"和"弹性工作制"在招聘语境中的承诺强度不同。',
        type: 'string',
      },
      tech_stack: {
        description:
          '该岗位涉及的技术栈、工具或方法,用顿号分隔,例如"RAG、Prompt 工程、SQL"。工具只会使用这里指定的名称,不会自行推断其他框架或产品名。不确定时留空,留空时 JD 中的技术要求会写成不依赖具体选型的能力描述。',
        type: 'string',
      },
    },
    required: ['company_description', 'company_domain', 'company_name', 'hiring_needs'],
    type: 'object',
  },
} as const

type ParamName = keyof typeof MCP_SCHEMA.parameters.properties

// 参数表按填写顺序展示
const PARAM_ORDER: ParamName[] = ['company_name', 'company_domain', 'company_description', 'hiring_needs', 'specific_benefits', 'tech_stack']

export const MCP_PARAMS = PARAM_ORDER.map((name) => {
  const description = MCP_SCHEMA.parameters.properties[name].description
  const required = (MCP_SCHEMA.parameters.required as readonly string[]).includes(name)
  return { name, required, summary: `${description.split('。')[0]}。`, description }
})

export const MCP_SCHEMA_JSON = JSON.stringify(MCP_SCHEMA, null, 2)

export interface ClientConfig {
  id: string
  label: string
  language: 'json' | 'bash'
  code?: string
  steps?: string[]
  note: string
}

export const CLIENT_CONFIGS: ClientConfig[] = [
  {
    id: 'json',
    label: '通用 JSON',
    language: 'json',
    code: JSON.stringify({ mcpServers: { 'jd-generator': { url: MCP_URL } } }, null, 2),
    note: '写入客户端的 MCP 配置文件，适用于 Cursor 等支持远程 MCP（Streamable HTTP）的客户端。',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    language: 'bash',
    code: `claude mcp add --transport http jd-generator ${MCP_URL}`,
    note: '在终端执行一次即可，之后在对话里直接让 Claude 起草 JD。',
  },
  {
    id: 'claude',
    label: 'Claude 连接器',
    language: 'bash',
    steps: ['打开 Claude 的「设置 → 连接器」', '选择「添加自定义连接器」', '粘贴上面的服务地址并保存'],
    note: '适用于 Claude 网页版与桌面端。',
  },
]
