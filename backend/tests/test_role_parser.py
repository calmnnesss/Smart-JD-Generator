import asyncio
import json

import httpx
import pytest

from app import role_parser
from app.llm import LLMClient, LLMError
from app.role_parser import classify_role, parse_role, sanitize_parsed
from app.tech_groups import GROUP_IDS, TECH_GROUPS, classify_by_rules

SAMPLE = "AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招，需要能出差"


def llm_returning(content, status=200, seen=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(json.loads(request.content))
        body = {"choices": [{"message": {"content": content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)}}]}
        return httpx.Response(status, json=body)

    return LLMClient("https://dashscope.example/v1/", "sk-test", "qwen-flash", transport=httpx.MockTransport(handler))


def test_sanitize_keeps_only_grounded_values():
    parsed = sanitize_parsed(
        {
            "title": " AI 产品经理 ",
            "scene": "负责金融场景下的大模型应用产品",
            "locations": ["杭州市", "上海", "远程", "杭州"],
            "hire_type": "校招",
            "cohort": "2026届",
            "experience": "3-5年",
            "level": None,
            "extra": "需要能出差",
            "category": "ai_product",
            "unexpected": "ignored",
        },
        SAMPLE,
    )
    assert parsed.title == "AI 产品经理"
    assert parsed.scene == "金融场景下的大模型应用产品"
    # 上海、远程不在原文中，被丢弃
    assert parsed.locations == ["杭州"]
    assert parsed.cohort == "2026届"
    assert parsed.experience is None
    assert parsed.category == "ai_product"


def test_sanitize_rejects_invalid_enums_and_types():
    parsed = sanitize_parsed({"hire_type": "全职", "category": "astronaut", "locations": "杭州", "cohort": "2030届"}, SAMPLE)
    assert (parsed.hire_type, parsed.category, parsed.locations, parsed.cohort) == (None, None, [], None)


def test_sanitize_short_cohort_and_remote():
    parsed = sanitize_parsed({"cohort": "2027届", "locations": ["远程"], "experience": "不限"}, "27届实习，可远程，经验不限")
    assert (parsed.cohort, parsed.locations, parsed.experience) == ("2027届", ["远程"], "不限")


def test_parse_role_sends_json_request():
    seen = []
    client = llm_returning({"title": "AI 产品经理", "locations": ["杭州"], "hire_type": "校招", "cohort": "2026届", "category": "ai_product"}, seen=seen)
    parsed = asyncio.run(parse_role(client, SAMPLE))
    assert parsed.title == "AI 产品经理" and parsed.engine == "llm"
    body = seen[0]
    assert body["model"] == "qwen-flash"
    assert body["response_format"] == {"type": "json_object"}
    assert body["enable_thinking"] is False
    assert "JSON" in body["messages"][0]["content"]
    assert SAMPLE in body["messages"][1]["content"]


@pytest.mark.parametrize(("content", "status"), [("不是 JSON", 200), ('["list"]', 200), ({"error": "x"}, 500)])
def test_parse_role_errors(content, status):
    with pytest.raises(LLMError):
        asyncio.run(parse_role(llm_returning(content, status), SAMPLE))


def test_parse_role_accepts_fenced_json():
    parsed = asyncio.run(parse_role(llm_returning('```json\n{"title": "AI 产品经理"}\n```'), SAMPLE))
    assert parsed.title == "AI 产品经理"


def test_classify_uses_llm_then_cache_and_falls_back():
    role_parser._classify_cache.clear()
    seen = []
    client = llm_returning({"category": "backend"}, seen=seen)
    assert asyncio.run(classify_role(client, "服务端工程师", None)) == ("backend", "llm")
    assert asyncio.run(classify_role(client, "服务端工程师", None)) == ("backend", "llm")
    assert len(seen) == 1
    # 未知类别或调用失败时回退到关键词规则
    assert asyncio.run(classify_role(llm_returning({"category": "??"}), "HRBP", None)) == ("hr", "rules")
    assert asyncio.run(classify_role(llm_returning("oops", 500), "销售经理", None)) == ("sales", "rules")
    assert asyncio.run(classify_role(None, "前端工程师", None)) == ("frontend", "rules")


@pytest.mark.parametrize(
    ("title", "group"),
    [
        ("AI 产品经理", "ai_product"),
        ("产品经理", "product"),
        ("大模型算法工程师", "llm_algo"),
        ("推荐算法工程师", "ml_algo"),
        ("UI/UX 设计师", "design"),
        ("数据分析师", "data_analysis"),
        ("大数据开发工程师", "data_eng"),
        ("AI 运营", "operations"),
        ("嵌入式软件工程师", "embedded"),
        ("HRBP", "hr"),
        ("行政专员", "general"),
    ],
)
def test_classify_by_rules(title, group):
    assert classify_by_rules(title) == group


def test_groups_are_unique_and_non_empty():
    assert len(GROUP_IDS) == len(set(GROUP_IDS))
    assert all(g.tags for g in TECH_GROUPS)
