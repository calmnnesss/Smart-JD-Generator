from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints


def _text(max_length: int, min_length: int = 0):
    return Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length),
    ]


def _optional(max_length: int):
    return _text(max_length) | None


HireType = Literal["校招", "社招", "实习"]


class Company(BaseModel):
    name: _text(100, 1)
    domain: _text(300, 1)
    description: _text(3000, 1)


class Role(BaseModel):
    title: _text(100, 1)
    scene: _optional(200) = None
    location: _optional(60) = None
    hire_type: HireType | None = None
    cohort: _optional(20) = None
    experience: _optional(20) = None
    level: _optional(40) = None
    extra: _optional(300) = None


class Supplement(BaseModel):
    item: _text(200, 1)
    answer: _text(500, 1)


class Brief(BaseModel):
    """前端提交的结构化招聘简报，由 compose.py 拼接成 Dify 工作流入参。"""

    company: Company
    role: Role
    benefits: list[_text(30, 1)] = Field(default_factory=list, max_length=20)
    tech_stack: list[_text(30, 1)] = Field(default_factory=list, max_length=20)
    supplements: list[Supplement] = Field(default_factory=list, max_length=10)
    mode: Literal["quick", "guided"] = "quick"
    client_id: _optional(64) = None


class ComposePreview(BaseModel):
    company_domain: str
    hiring_needs: str
    specific_benefits: str
    tech_stack: str
