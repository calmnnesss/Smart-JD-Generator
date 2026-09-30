"""技术栈与方法的预设标签组。

标签内容是人工整理的固定预设，LLM 只负责判断岗位属于哪一组（从固定 id 中选择），
不会生成新的标签名，避免推荐出不存在或不准确的技术名称。
LLM 不可用时，按下面的关键词规则顺序匹配。
"""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class TechGroup:
    id: str
    label: str
    # 给 LLM 的类别说明
    description: str
    tags: tuple[str, ...]


TECH_GROUPS: tuple[TechGroup, ...] = (
    TechGroup("ai_product", "AI 产品", "大模型、AI 应用方向的产品经理或产品运营",
              ("RAG", "Prompt 工程", "大模型评测", "Agent", "知识库", "多模态", "数据标注", "A/B 测试", "SQL")),
    TechGroup("product", "产品", "通用互联网、B 端或 C 端产品经理",
              ("需求分析", "PRD", "原型设计", "Axure", "Figma", "用户研究", "数据分析", "SQL", "A/B 测试")),
    TechGroup("design", "设计", "UI、UX、交互、视觉等设计岗位",
              ("Figma", "设计系统", "交互设计", "动效设计", "用户研究", "Sketch", "AIGC 设计", "Adobe 系列")),
    TechGroup("frontend", "前端", "Web 前端、H5、小程序开发",
              ("React", "Vue", "TypeScript", "Next.js", "Node.js", "Tailwind CSS", "小程序", "Vite", "性能优化")),
    TechGroup("mobile", "移动端", "iOS、Android、鸿蒙、跨端开发",
              ("iOS", "Swift", "Android", "Kotlin", "Flutter", "React Native", "HarmonyOS", "性能优化")),
    TechGroup("backend", "后端", "服务端、后端、全栈、架构开发",
              ("Java", "Go", "Python", "Spring Boot", "MySQL", "Redis", "Kafka", "微服务", "Kubernetes")),
    TechGroup("llm_algo", "大模型算法", "大模型、NLP、AIGC 方向的算法或研究岗位",
              ("PyTorch", "Transformer", "大模型微调", "RAG", "Agent", "vLLM", "分布式训练", "强化学习", "CUDA")),
    TechGroup("cv_algo", "视觉算法", "计算机视觉、图像、多模态感知方向的算法岗位",
              ("PyTorch", "OpenCV", "目标检测", "图像分割", "多模态", "TensorRT", "模型压缩", "三维视觉")),
    TechGroup("ml_algo", "推荐搜索算法", "推荐、搜索、广告、风控等机器学习算法岗位",
              ("推荐系统", "搜索排序", "CTR 预估", "特征工程", "TensorFlow", "PyTorch", "XGBoost", "Spark")),
    TechGroup("data_analysis", "数据分析", "数据分析师、商业分析、BI",
              ("SQL", "Python", "Excel", "Tableau", "Power BI", "A/B 测试", "指标体系", "统计分析")),
    TechGroup("data_eng", "数据开发", "大数据开发、数仓、数据平台",
              ("Spark", "Flink", "Hive", "Hadoop", "Kafka", "数据仓库", "ETL", "Airflow", "Doris")),
    TechGroup("qa", "测试", "软件测试、质量保障",
              ("自动化测试", "接口测试", "性能测试", "Python", "Playwright", "Selenium", "JMeter", "CI/CD")),
    TechGroup("devops", "运维 / DevOps", "运维、SRE、DevOps、云原生基础设施",
              ("Linux", "Docker", "Kubernetes", "CI/CD", "Prometheus", "Terraform", "云原生", "Shell")),
    TechGroup("security", "安全", "网络安全、应用安全、安全运营",
              ("渗透测试", "代码审计", "安全运营", "WAF", "等保合规", "零信任", "应急响应", "Python")),
    TechGroup("embedded", "嵌入式 / 硬件", "嵌入式软件、硬件、机器人、驱动开发",
              ("C/C++", "嵌入式 Linux", "RTOS", "单片机", "ROS", "驱动开发", "FPGA", "电路设计")),
    TechGroup("operations", "运营", "用户、内容、活动、社群等运营岗位",
              ("用户运营", "内容运营", "活动策划", "社群运营", "私域运营", "增长", "数据分析", "SQL")),
    TechGroup("marketing", "市场营销", "品牌、市场、新媒体、投放等营销岗位",
              ("品牌营销", "新媒体运营", "内容营销", "SEO/SEM", "广告投放", "市场调研", "活动策划", "数据分析")),
    TechGroup("sales", "销售 / 商务", "销售、商务拓展、客户经理",
              ("大客户销售", "解决方案销售", "商务谈判", "渠道管理", "CRM", "Salesforce", "招投标", "客户成功")),
    TechGroup("hr", "人力资源", "招聘、HRBP、薪酬绩效、组织发展",
              ("招聘", "HRBP", "薪酬绩效", "组织发展", "培训体系", "劳动法", "员工关系", "HR SaaS")),
    TechGroup("finance", "财务", "财务、会计、审计、税务",
              ("财务分析", "预算管理", "税务", "审计", "财务建模", "Excel", "SAP", "内控")),
    TechGroup("general", "通用", "以上都不适合时使用",
              ("数据分析", "Excel", "项目管理", "Python", "SQL", "Prompt 工程")),
)

GROUP_IDS = tuple(g.id for g in TECH_GROUPS)
_BY_ID = {g.id: g for g in TECH_GROUPS}

# 关键词回退规则：按顺序匹配，第一条命中的类别生效
_RULES: tuple[tuple[str, str], ...] = (
    ("ai_product", r"(AI|大模型|AIGC|智能|算法).*(产品|PM)|(产品|PM).*(AI|大模型|AIGC)"),
    ("product", r"产品|PM"),
    ("design", r"设计师|UI|UX|交互设计|视觉设计|美术"),
    ("llm_algo", r"大模型|LLM|NLP|自然语言|AIGC"),
    ("cv_algo", r"视觉|CV|图像|多模态|感知"),
    ("ml_algo", r"算法|机器学习|推荐|搜索|广告|风控模型"),
    ("frontend", r"前端|Web|H5|小程序"),
    ("mobile", r"iOS|Android|安卓|移动端|客户端|鸿蒙|Flutter"),
    ("embedded", r"嵌入式|硬件|单片机|驱动|机器人|ROS|FPGA|电子|电气"),
    ("devops", r"运维|DevOps|SRE|云原生|基础设施"),
    ("security", r"安全|渗透"),
    ("qa", r"测试|QA|质量"),
    ("data_eng", r"数据(开发|工程|仓库|平台)|数仓|ETL|大数据"),
    ("data_analysis", r"数据|分析师|BI"),
    ("backend", r"后端|服务端|Java|Go|C\+\+|PHP|Python|架构|全栈|开发工程师|软件工程师"),
    ("operations", r"运营"),
    ("marketing", r"市场|营销|品牌|投放|新媒体|SEO|公关"),
    ("sales", r"销售|商务|BD|客户经理|大客户"),
    ("hr", r"HR|人力|招聘|人事|薪酬|培训"),
    ("finance", r"财务|会计|审计|税务|出纳"),
)


def classify_by_rules(title: str, scene: str | None = None) -> str:
    text = f"{title} {scene or ''}"
    for group_id, pattern in _RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return group_id
    return "general"


def is_group(group_id: object) -> bool:
    return isinstance(group_id, str) and group_id in _BY_ID


def category_prompt() -> str:
    return "\n".join(f"  {g.id}：{g.label}（{g.description}）" for g in TECH_GROUPS)
