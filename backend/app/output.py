"""把工作流 outputs 规整为 {jd_markdown, missing_info}。

当前 v3 工作流的 End 节点输出为：
    final_jd: str            markdown 格式的 JD 正文
    missing_info: list[str]  仍需人工补充的信息
这里对变量名和格式做了容错，以便工作流后续调整时前端不受影响。
"""

import json
import re
from dataclasses import dataclass, field

_MISSING_HEADING = re.compile(r"^\s*#{1,6}\s*.*(仍需|待|需要).{0,4}(补充|确认).*$", re.MULTILINE)
_BULLET = re.compile(r"^\s*(?:[-*•·]|\d+[.、)）])\s*")


@dataclass
class JdResult:
    jd_markdown: str
    missing_info: list[str] = field(default_factory=list)


def _clean_items(items: list) -> list[str]:
    cleaned = []
    for item in items:
        text = _BULLET.sub("", str(item)).strip()
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def parse_missing(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return _clean_items(value)
    text = str(value).strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return _clean_items(parsed)
        except ValueError:
            pass
    return _clean_items(text.splitlines())


def _split_combined(text: str) -> JdResult:
    match = _MISSING_HEADING.search(text)
    if not match:
        return JdResult(text.strip())
    return JdResult(text[: match.start()].strip(), parse_missing(text[match.end():]))


def normalize_outputs(outputs: dict, jd_key: str = "final_jd", missing_key: str = "missing_info") -> JdResult:
    outputs = outputs or {}
    jd = outputs.get(jd_key)
    if not isinstance(jd, str) or not jd.strip():
        jd = next(
            (v for k, v in outputs.items() if isinstance(v, str) and v.strip() and re.search(r"jd|result|output|text", k, re.I)),
            None,
        )
    if jd is None:
        strings = [v for v in outputs.values() if isinstance(v, str) and v.strip()]
        jd = strings[0] if len(strings) == 1 else ""

    missing_value = outputs.get(missing_key)
    if missing_value is None:
        missing_value = next((v for k, v in outputs.items() if re.search(r"missing|补充", k, re.I)), None)

    if missing_value is None:
        return _split_combined(jd)
    return JdResult(jd.strip(), parse_missing(missing_value))
