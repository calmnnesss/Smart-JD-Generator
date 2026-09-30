import pytest

from app.schemas import Brief

SAMPLE = {
    "company": {
        "name": "恒生电子",
        "domain": "www.hundsun.com",
        "description": "恒生电子是面向金融机构的软件与服务提供商。",
    },
    "role": {
        "title": "AI 产品经理",
        "scene": "金融场景下的大模型应用产品",
        "locations": ["杭州"],
        "hire_type": "校招",
        "cohort": "2026届",
    },
    "benefits": ["六险一金", "免费三餐", "弹性工作", "年度调薪"],
    "tech_stack": ["RAG", "Prompt 工程", "大模型评测"],
}


@pytest.fixture
def sample_payload() -> dict:
    import copy

    return copy.deepcopy(SAMPLE)


@pytest.fixture
def sample_brief(sample_payload) -> Brief:
    return Brief.model_validate(sample_payload)
