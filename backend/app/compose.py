"""把结构化简报拼接成 Dify 工作流的 6 个入参。

工作流的输入口径已经收紧：福利与技术栈会被逐字使用，所以这里只做去空白、去重和连接，
不改写任何措辞。
"""

import re
from urllib.parse import urlsplit

from .schemas import Brief, Company, Role, Supplement

_YEAR = re.compile(r"(20\d{2})")


def normalize_domain(raw: str) -> str:
    value = raw.strip()
    if not re.match(r"^https?://", value, re.IGNORECASE):
        value = "https://" + value.lstrip("/")
    parts = urlsplit(value)
    host = parts.hostname or ""
    if "." not in host or " " in value:
        raise ValueError(f"官网地址格式不正确：{raw}")
    return value


def join_items(items: list[str]) -> str:
    seen: list[str] = []
    for item in items:
        item = item.strip()
        if item and item not in seen:
            seen.append(item)
    return "、".join(seen)


def _cohort_year(cohort: str | None) -> str | None:
    if not cohort:
        return None
    match = _YEAR.search(cohort)
    return match.group(1) if match else None


def _hire_phrase(role: Role) -> str | None:
    year = _cohort_year(role.cohort)
    experience = (role.experience or "").strip()
    if role.hire_type == "校招":
        return f"{year} 届校招" if year else "校招"
    if role.hire_type == "实习":
        return f"{year} 届实习" if year else "实习"
    if role.hire_type == "社招":
        if not experience:
            return "社招"
        if experience == "不限":
            return "社招，经验不限"
        return f"社招，{experience}经验"
    if year:
        return f"{year} 届"
    if experience:
        return f"{experience}经验"
    return None


def _location_phrase(locations: list[str]) -> str | None:
    cities = [c for c in dict.fromkeys(l.strip() for l in locations) if c and c != "远程"]
    remote = "远程" in locations
    if cities and remote:
        return f"base {'、'.join(cities)}，可远程"
    if cities:
        return f"base {'、'.join(cities)}"
    return "远程办公" if remote else None


def compose_hiring_needs(role: Role) -> str:
    parts: list[str] = []
    title = role.title
    if role.level:
        title = f"{title}（{role.level}）"
    parts.append(title)
    if role.scene:
        scene = role.scene.rstrip("，,。")
        parts.append(scene if scene.startswith("负责") else f"负责{scene}")
    location = _location_phrase(role.locations)
    if location:
        parts.append(location)
    phrase = _hire_phrase(role)
    if phrase:
        parts.append(phrase)
    if role.extra:
        parts.append(role.extra.strip("，,。 "))
    return "，".join(p for p in parts if p)


def compose_description(company: Company, supplements: list[Supplement]) -> str:
    description = company.description.strip()
    if not supplements:
        return description
    lines = [f"- {s.item}：{s.answer}" for s in supplements]
    return description + "\n\n补充信息：\n" + "\n".join(lines)


def compose_inputs(brief: Brief) -> dict[str, str]:
    return {
        "company_name": brief.company.name,
        "company_domain": normalize_domain(brief.company.domain),
        "company_description": compose_description(brief.company, brief.supplements),
        "hiring_needs": compose_hiring_needs(brief.role),
        "specific_benefits": join_items(brief.benefits),
        "tech_stack": join_items(brief.tech_stack),
    }
