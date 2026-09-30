"""Mock 模式：按真实节奏回放一段 Dify 事件流，输出来自一次真实运行（fixtures/sample_outputs.json）。"""

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

_FIXTURE = Path(__file__).parent / "fixtures" / "sample_outputs.json"


def _node(event: str, node_id: str, title: str, node_type: str, **extra) -> dict:
    return {
        "event": event,
        "data": {"id": f"exec-{node_id}", "node_id": node_id, "title": title, "node_type": node_type, **extra},
    }


async def mock_stream(inputs: dict[str, str], delay_scale: float = 1.0) -> AsyncIterator[dict]:
    task_id = str(uuid.uuid4())

    async def wait(seconds: float):
        if delay_scale > 0:
            await asyncio.sleep(seconds * delay_scale)

    yield {"event": "workflow_started", "task_id": task_id, "data": {"id": task_id}}
    yield _node("node_started", "start", "开始", "start")
    yield _node("node_finished", "start", "开始", "start", status="succeeded")

    yield _node("node_started", "crawl", "抓取公司官网", "tool")
    await wait(1.8)
    yield _node("node_finished", "crawl", "抓取公司官网", "tool", status="succeeded")

    for node_id, title, seconds in (
        ("analysis", "公司洞察分析", 2.4),
        ("profile", "岗位能力画像", 2.2),
        ("draft", "JD 初稿撰写", 3.0),
        ("review", "审校定稿", 2.2),
    ):
        yield _node("node_started", node_id, title, "llm")
        await wait(seconds)
        yield {"event": "ping"}
        yield _node("node_finished", node_id, title, "llm", status="succeeded")

    outputs = json.loads(_FIXTURE.read_text(encoding="utf-8"))
    # 回放「补充后重新生成」：已在公司描述里补充过的条目不再出现在清单中
    description = inputs.get("company_description", "")
    outputs["missing_info"] = [item for item in outputs["missing_info"] if item not in description]

    yield {
        "event": "workflow_finished",
        "task_id": task_id,
        "data": {"id": task_id, "status": "succeeded", "outputs": outputs},
    }
