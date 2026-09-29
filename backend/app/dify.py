"""Dify Workflow API 的流式客户端。"""

import json
import logging
from collections.abc import AsyncIterator

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


class DifyError(Exception):
    def __init__(self, message: str, *, retryable: bool = True, status: int | None = None):
        super().__init__(message)
        self.message = message
        self.retryable = retryable
        self.status = status


def _http_error(status: int, body: bytes) -> DifyError:
    try:
        detail = json.loads(body).get("message") or ""
    except (ValueError, AttributeError):
        detail = ""
    logger.warning("Dify 返回 HTTP %s：%s", status, detail or body[:300])
    if status == 401:
        return DifyError("Dify API Key 无效或已失效，请检查 DIFY_API_KEY", retryable=False, status=status)
    if status == 404:
        return DifyError("找不到对应的 Dify 应用，请检查 DIFY_BASE_URL 与 API Key", retryable=False, status=status)
    if status == 429:
        return DifyError("请求过于频繁，请稍后再试", status=status)
    if status >= 500:
        return DifyError("Dify 服务暂时不可用，请稍后再试", status=status)
    return DifyError(f"Dify 拒绝了请求：{detail or f'HTTP {status}'}", retryable=False, status=status)


async def iter_sse(lines: AsyncIterator[str]) -> AsyncIterator[dict]:
    """把 SSE 文本行解析为事件字典（Dify 把事件名放在 data JSON 的 event 字段里）。"""
    event_name: str | None = None
    data_lines: list[str] = []

    def dispatch() -> dict | None:
        if data_lines:
            try:
                payload = json.loads("\n".join(data_lines))
            except ValueError:
                logger.debug("忽略无法解析的 SSE 数据：%s", data_lines)
                return None
            if isinstance(payload, dict):
                if "event" not in payload and event_name:
                    payload["event"] = event_name
                return payload
            return None
        if event_name:
            return {"event": event_name}
        return None

    async for line in lines:
        line = line.rstrip("\r")
        if line == "":
            event = dispatch()
            event_name, data_lines = None, []
            if event:
                yield event
        elif line.startswith(":"):
            continue
        elif line.startswith("event:"):
            event_name = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].lstrip())

    event = dispatch()
    if event:
        yield event


class DifyClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {api_key}"}
        self._transport = transport

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=self._transport, timeout=_TIMEOUT, headers=self._headers)

    async def stream_run(self, inputs: dict[str, str], user: str) -> AsyncIterator[dict]:
        payload = {"inputs": inputs, "response_mode": "streaming", "user": user}
        try:
            async with self._client() as client:
                async with client.stream("POST", f"{self._base_url}/workflows/run", json=payload) as resp:
                    if resp.status_code != 200:
                        raise _http_error(resp.status_code, await resp.aread())
                    async for event in iter_sse(resp.aiter_lines()):
                        yield event
        except httpx.TimeoutException as exc:
            raise DifyError("等待 Dify 响应超时，请重试") from exc
        except httpx.TransportError as exc:
            raise DifyError("无法连接到 Dify 服务，请检查网络或 DIFY_BASE_URL") from exc

    async def stop(self, task_id: str, user: str) -> None:
        try:
            async with self._client() as client:
                await client.post(
                    f"{self._base_url}/workflows/tasks/{task_id}/stop", json={"user": user}
                )
        except httpx.HTTPError:
            logger.warning("停止 Dify 任务 %s 失败", task_id, exc_info=True)
