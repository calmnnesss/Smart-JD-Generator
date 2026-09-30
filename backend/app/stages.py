"""把 Dify 节点事件映射为面向用户的生成阶段，不向前端暴露节点名等技术细节。

映射优先级：
1. NODE_TITLE_OVERRIDES 里的精确标题；
2. 节点标题中的关键词；
3. 按节点类型顺延：LLM 节点依次填入下一个尚未开始的撰写类阶段，工具/HTTP 节点归入「访问公司官网」。

后端日志会打印每个节点的标题和类型，首次用真实工作流运行后，可把标题填进 NODE_TITLE_OVERRIDES。
"""

import logging
import time
from dataclasses import dataclass
from typing import Literal

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Stage:
    id: str
    label: str
    kind: Literal["research", "llm"]
    keywords: tuple[str, ...]


STAGES: tuple[Stage, ...] = (
    Stage("fetch", "访问公司官网", "research", ("官网", "抓取", "网页", "爬取", "搜索", "检索", "crawl", "scrape", "fetch", "jina", "firecrawl", "search")),
    Stage("analyze", "提炼公司亮点", "llm", ("分析", "文化", "卖点", "洞察", "analy", "insight")),
    Stage("profile", "构建能力画像", "llm", ("画像", "能力", "技能", "profile", "skill", "persona")),
    Stage("draft", "撰写 JD 初稿", "llm", ("初稿", "撰写", "草稿", "draft", "write")),
    Stage("review", "审校定稿", "llm", ("审校", "审核", "校对", "修订", "定稿", "review", "check", "final", "polish")),
)

# 精确映射：{"节点标题": "阶段 id"}，优先级最高
NODE_TITLE_OVERRIDES: dict[str, str] = {}

# 关键词匹配顺序：更具体的阶段优先
_MATCH_ORDER = ("review", "profile", "analyze", "draft", "fetch")

_IGNORED_TYPES = {
    "start", "end", "answer", "if-else", "variable-aggregator", "variable-assigner",
    "assigner", "iteration-start", "loop-start", "loop-end",
}
_RESEARCH_TYPES = {"tool", "http-request", "knowledge-retrieval"}
_LLM_TYPES = {"llm", "agent"}

_BY_ID = {s.id: s for s in STAGES}


class StageTracker:
    def __init__(self, overrides: dict[str, str] | None = None):
        self._overrides = NODE_TITLE_OVERRIDES if overrides is None else overrides
        self._node_stage: dict[str, str] = {}
        self._running: dict[str, set[str]] = {s.id: set() for s in STAGES}
        self._started_at: dict[str, float] = {}
        self._done: set[str] = set()

    def plan(self) -> list[dict]:
        return [{"id": s.id, "label": s.label} for s in STAGES]

    def _match(self, title: str, node_type: str) -> str | None:
        if title in self._overrides:
            return self._overrides[title]
        if node_type in _IGNORED_TYPES:
            return None
        lowered = title.lower()
        for stage_id in _MATCH_ORDER:
            if any(k in lowered for k in _BY_ID[stage_id].keywords):
                return stage_id
        kind = "llm" if node_type in _LLM_TYPES else "research" if node_type in _RESEARCH_TYPES else None
        if kind is None:
            return None
        candidates = [s.id for s in STAGES if s.kind == kind]
        for stage_id in candidates:
            if stage_id not in self._started_at:
                return stage_id
        started = [sid for sid in candidates if sid in self._started_at]
        return started[-1] if started else None

    def on_node_started(self, data: dict) -> list[dict]:
        title = str(data.get("title") or "")
        node_type = str(data.get("node_type") or "")
        exec_id = str(data.get("id") or data.get("node_id") or title)
        stage_id = self._match(title, node_type)
        logger.info("Dify 节点开始：title=%r type=%s → 阶段 %s", title, node_type, stage_id or "-")
        if stage_id not in self._running:
            return []
        self._node_stage[exec_id] = stage_id
        was_idle = not self._running[stage_id]
        self._running[stage_id].add(exec_id)
        if not was_idle:
            return []
        self._started_at.setdefault(stage_id, time.monotonic())
        self._done.discard(stage_id)
        return [{"id": stage_id, "status": "running"}]

    def on_node_finished(self, data: dict) -> list[dict]:
        exec_id = str(data.get("id") or data.get("node_id") or data.get("title") or "")
        stage_id = self._node_stage.pop(exec_id, None)
        if stage_id is None:
            return []
        running = self._running[stage_id]
        running.discard(exec_id)
        if running:
            return []
        self._done.add(stage_id)
        return [{"id": stage_id, "status": "done", "elapsed_ms": self._elapsed_ms(stage_id)}]

    def finish(self) -> list[dict]:
        events = []
        for stage in STAGES:
            if stage.id not in self._started_at:
                events.append({"id": stage.id, "status": "skipped"})
            elif stage.id not in self._done:
                self._running[stage.id].clear()
                self._done.add(stage.id)
                events.append({"id": stage.id, "status": "done", "elapsed_ms": self._elapsed_ms(stage.id)})
        return events

    def _elapsed_ms(self, stage_id: str) -> int:
        return int((time.monotonic() - self._started_at[stage_id]) * 1000)
