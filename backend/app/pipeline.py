"""一次生成的完整流程：调用 Dify（或 mock）→ 把事件精简为前端 SSE 事件。"""

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from contextlib import aclosing

from .config import Settings
from .dify import DifyClient, DifyError
from .mock import mock_stream
from .output import normalize_outputs
from .stages import StageTracker

logger = logging.getLogger(__name__)

# 客户端断开后异步停止 Dify 任务；保留引用避免任务被回收
_background: set[asyncio.Task] = set()


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _error(message: str, retryable: bool = True) -> str:
    return sse("error", {"message": message, "retryable": retryable})


async def generate_events(
    inputs: dict[str, str],
    user: str,
    settings: Settings,
    client: DifyClient,
) -> AsyncIterator[str]:
    tracker = StageTracker()
    yield sse("stages", {"stages": tracker.plan()})

    if not settings.dify_mock and not settings.api_key_configured:
        yield _error("服务端尚未配置 DIFY_API_KEY，请在 backend/.env 中填写后重启", retryable=False)
        return

    started = time.monotonic()
    task_id: str | None = None
    finished = False
    source = (
        mock_stream(inputs, settings.mock_delay_scale)
        if settings.dify_mock
        else client.stream_run(inputs, user)
    )

    try:
        async with aclosing(source) as events:
            async for event in events:
                name = event.get("event")
                data = event.get("data") or {}
                task_id = task_id or event.get("task_id")

                if name == "node_started":
                    for item in tracker.on_node_started(data):
                        yield sse("stage", item)
                elif name == "node_finished":
                    for item in tracker.on_node_finished(data):
                        yield sse("stage", item)
                elif name == "text_chunk":
                    if data.get("text"):
                        yield sse("delta", {"text": data["text"]})
                elif name == "ping":
                    yield ": ping\n\n"
                elif name == "workflow_finished":
                    finished = True
                    for item in tracker.finish():
                        yield sse("stage", item)
                    if data.get("status") != "succeeded":
                        logger.warning("工作流未成功结束：status=%s error=%s", data.get("status"), data.get("error"))
                        yield _error("生成过程中出现问题，请稍后重试")
                        return
                    result = normalize_outputs(
                        data.get("outputs") or {},
                        settings.dify_output_jd_key,
                        settings.dify_output_missing_key,
                    )
                    if not result.jd_markdown:
                        logger.warning("工作流输出中没有 JD 正文：keys=%s", list((data.get("outputs") or {}).keys()))
                        yield _error("工作流没有返回 JD 内容，请稍后重试")
                        return
                    elapsed = data.get("elapsed_time") or (time.monotonic() - started)
                    yield sse(
                        "result",
                        {
                            "jd_markdown": result.jd_markdown,
                            "missing_info": result.missing_info,
                            "elapsed_s": round(float(elapsed), 1),
                        },
                    )
                    return
                elif name == "error":
                    finished = True
                    logger.warning("Dify 流内错误：%s", event)
                    yield _error("生成过程中出现问题，请稍后重试")
                    return

                if time.monotonic() - started > settings.generation_timeout:
                    yield _error("生成耗时过长，已停止，请重试")
                    return

            yield _error("生成服务提前结束了连接，请重试")
    except DifyError as exc:
        finished = True
        yield _error(exc.message, exc.retryable)
    finally:
        if not finished and task_id and not settings.dify_mock:
            task = asyncio.get_running_loop().create_task(client.stop(task_id, user))
            _background.add(task)
            task.add_done_callback(_background.discard)
