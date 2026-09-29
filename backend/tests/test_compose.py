import pytest

from app.compose import compose_hiring_needs, compose_inputs, join_items, normalize_domain
from app.schemas import Brief, Role


def test_sample_matches_original_hiring_needs(sample_brief):
    inputs = compose_inputs(sample_brief)
    assert inputs["hiring_needs"] == "AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招"
    assert inputs["company_domain"] == "https://www.hundsun.com"
    assert inputs["specific_benefits"] == "六险一金、免费三餐、弹性工作、年度调薪"
    assert inputs["tech_stack"] == "RAG、Prompt 工程、大模型评测"
    assert inputs["company_description"] == "恒生电子是面向金融机构的软件与服务提供商。"


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        ({"title": "后端工程师", "hire_type": "社招", "experience": "3-5年"}, "后端工程师，社招，3-5年经验"),
        ({"title": "后端工程师", "hire_type": "社招", "experience": "不限"}, "后端工程师，社招，经验不限"),
        ({"title": "后端工程师", "hire_type": "社招"}, "后端工程师，社招"),
        ({"title": "数据分析师", "hire_type": "实习", "cohort": "2027 届"}, "数据分析师，2027 届实习"),
        ({"title": "算法工程师", "level": "P6", "location": "远程"}, "算法工程师（P6），远程办公"),
        ({"title": "产品经理", "scene": "负责支付产品。"}, "产品经理，负责支付产品"),
        ({"title": "产品经理", "extra": "需要能出差，"}, "产品经理，需要能出差"),
        ({"title": "产品经理", "cohort": "2026届"}, "产品经理，2026 届"),
    ],
)
def test_hiring_needs_variants(role, expected):
    assert compose_hiring_needs(Role.model_validate(role)) == expected


def test_join_items_trims_and_dedupes_without_rewording():
    assert join_items([" 弹性工作 ", "弹性工作制", "弹性工作", ""]) == "弹性工作、弹性工作制"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("hundsun.com", "https://hundsun.com"),
        ("https://www.hundsun.com/", "https://www.hundsun.com/"),
        ("HTTP://Example.com/about", "HTTP://Example.com/about"),
        ("  www.qq.com ", "https://www.qq.com"),
    ],
)
def test_normalize_domain(raw, expected):
    assert normalize_domain(raw) == expected


@pytest.mark.parametrize("raw", ["恒生电子", "localhost", "https://", "hund sun.com"])
def test_normalize_domain_rejects_invalid(raw):
    with pytest.raises(ValueError):
        normalize_domain(raw)


def test_supplements_are_appended_to_description(sample_payload):
    sample_payload["supplements"] = [
        {"item": "团队规模", "answer": "约 15 人"},
        {"item": "汇报对象", "answer": "智能投研产品负责人"},
    ]
    inputs = compose_inputs(Brief.model_validate(sample_payload))
    assert inputs["company_description"].endswith(
        "\n\n补充信息：\n- 团队规模：约 15 人\n- 汇报对象：智能投研产品负责人"
    )
