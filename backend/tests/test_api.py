import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.dify import DifyClient
from app.main import app, get_dify_client


def parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for block in body.split("\n\n"):
        name, data = None, None
        for line in block.splitlines():
            if line.startswith("event: "):
                name = line[7:]
            elif line.startswith("data: "):
                data = json.loads(line[6:])
        if name:
            events.append((name, data))
    return events


def dify_stream(*events: dict) -> bytes:
    return "".join(f"data: {json.dumps(e, ensure_ascii=False)}\n\n" for e in events).encode()


@pytest.fixture
def client_with():
    def make(settings: Settings, handler=None) -> TestClient:
        app.dependency_overrides[get_settings] = lambda: settings
        if handler is not None:
            transport = httpx.MockTransport(handler)
            app.dependency_overrides[get_dify_client] = lambda: DifyClient(
                settings.dify_base_url, settings.dify_api_key, transport=transport
            )
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()


def test_health(client_with):
    res = client_with(Settings(dify_api_key="", dify_mock=True)).get("/api/health")
    assert res.json() == {"status": "ok", "mock": True, "configured": False}


def test_compose_preview(client_with, sample_payload):
    res = client_with(Settings()).post("/api/compose", json=sample_payload)
    assert res.status_code == 200
    assert res.json()["hiring_needs"] == "AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招"


def test_compose_rejects_bad_domain(client_with, sample_payload):
    sample_payload["company"]["domain"] = "恒生"
    assert client_with(Settings()).post("/api/compose", json=sample_payload).status_code == 422


def test_generate_without_key_reports_config_error(client_with, sample_payload):
    res = client_with(Settings(dify_api_key="app-xxxxxxxx", dify_mock=False)).post("/api/generate", json=sample_payload)
    events = parse_sse(res.text)
    assert events[0][0] == "stages"
    assert events[-1] == ("error", {"message": "服务端尚未配置 DIFY_API_KEY，请在 backend/.env 中填写后重启", "retryable": False})


def test_generate_mock_mode(client_with, sample_payload):
    sample_payload["supplements"] = [{"item": "该岗位的直属汇报对象及跨部门协作机制", "answer": "向产品总监汇报"}]
    res = client_with(Settings(dify_mock=True, mock_delay_scale=0)).post("/api/generate", json=sample_payload)
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    names = [n for n, _ in events]
    assert names[0] == "stages" and names[-1] == "result"
    running = [d["id"] for n, d in events if n == "stage" and d["status"] == "running"]
    assert running == ["fetch", "search", "analyze", "profile", "draft", "review"]
    result = events[-1][1]
    assert result["jd_markdown"].startswith("# AI 产品经理")
    assert "该岗位的直属汇报对象及跨部门协作机制" not in result["missing_info"]
    assert len(result["missing_info"]) == 3


def test_generate_against_dify_stream(client_with, sample_payload):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        body = dify_stream(
            {"event": "workflow_started", "task_id": "t1", "data": {}},
            {"event": "node_started", "task_id": "t1", "data": {"id": "a", "title": "LLM1", "node_type": "llm"}},
            {"event": "text_chunk", "task_id": "t1", "data": {"text": "# JD"}},
            {"event": "node_finished", "task_id": "t1", "data": {"id": "a", "status": "succeeded"}},
            {
                "event": "workflow_finished",
                "task_id": "t1",
                "data": {"status": "succeeded", "elapsed_time": 12.34, "outputs": {"final_jd": "# JD", "missing_info": ["团队规模"]}},
            },
        )
        return httpx.Response(200, content=body, headers={"content-type": "text/event-stream"})

    settings = Settings(dify_api_key="app-real-key", dify_mock=False, dify_base_url="https://api.dify.ai/v1/")
    sample_payload["client_id"] = "abc"
    res = client_with(settings, handler).post("/api/generate", json=sample_payload)
    events = parse_sse(res.text)

    assert seen["url"] == "https://api.dify.ai/v1/workflows/run"
    assert seen["auth"] == "Bearer app-real-key"
    assert seen["body"]["response_mode"] == "streaming"
    assert seen["body"]["user"] == "jd-web-abc"
    assert seen["body"]["inputs"]["hiring_needs"].startswith("AI 产品经理")

    assert ("delta", {"text": "# JD"}) in events
    assert events[-1] == ("result", {"jd_markdown": "# JD", "missing_info": ["团队规模"], "elapsed_s": 12.3})


@pytest.mark.parametrize(
    ("status", "message", "retryable"),
    [
        (401, "Dify API Key 无效或已失效，请检查 DIFY_API_KEY", False),
        (400, "Dify 拒绝了请求：app_unavailable", False),
        (503, "Dify 服务暂时不可用，请稍后再试", True),
    ],
)
def test_generate_maps_http_errors(client_with, sample_payload, status, message, retryable):
    def handler(request):
        return httpx.Response(status, json={"code": "x", "message": "app_unavailable"})

    settings = Settings(dify_api_key="app-real-key", dify_mock=False)
    events = parse_sse(client_with(settings, handler).post("/api/generate", json=sample_payload).text)
    assert events[-1] == ("error", {"message": message, "retryable": retryable})


def test_generate_reports_failed_workflow(client_with, sample_payload):
    def handler(request):
        body = dify_stream({"event": "workflow_finished", "task_id": "t", "data": {"status": "failed", "error": "Node LLM1 boom"}})
        return httpx.Response(200, content=body)

    settings = Settings(dify_api_key="app-real-key", dify_mock=False)
    events = parse_sse(client_with(settings, handler).post("/api/generate", json=sample_payload).text)
    assert events[-1] == ("error", {"message": "生成过程中出现问题，请稍后重试", "retryable": True})
    # 技术细节只记录在服务端日志，不返回给前端
    assert "LLM1" not in json.dumps(events, ensure_ascii=False)
