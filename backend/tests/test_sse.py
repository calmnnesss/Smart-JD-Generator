import asyncio

from app.dify import iter_sse


async def _collect(lines):
    async def gen():
        for line in lines:
            yield line

    return [e async for e in iter_sse(gen())]


def test_iter_sse_parses_dify_events():
    lines = [
        'data: {"event": "workflow_started", "task_id": "t1"}',
        "",
        "event: ping",
        "",
        ": comment",
        'data: {"event": "text_chunk",',
        'data:  "data": {"text": "hi"}}',
        "",
        "data: not-json",
        "",
        'data: {"event": "workflow_finished"}',
    ]
    events = asyncio.run(_collect(lines))
    assert [e["event"] for e in events] == ["workflow_started", "ping", "text_chunk", "workflow_finished"]
    assert events[2]["data"]["text"] == "hi"
