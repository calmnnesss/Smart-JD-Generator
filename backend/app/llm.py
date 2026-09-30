"""中间层 LLM 客户端：通义千问（阿里云百炼 OpenAI 兼容接口），只用于返回 JSON 的轻量任务。"""

import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


class LLMClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        *,
        timeout: float = 20,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self._url = f"{base_url.rstrip('/')}/chat/completions"
        self._headers = {"Authorization": f"Bearer {api_key}"}
        self._model = model
        self._timeout = timeout
        self._transport = transport

    async def chat_json(self, system: str, user: str) -> dict:
        payload = {
            "model": self._model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0,
            "response_format": {"type": "json_object"},
            # 字段抽取不需要深度思考，关闭以降低延迟
            "enable_thinking": False,
        }
        try:
            async with httpx.AsyncClient(transport=self._transport, timeout=self._timeout) as client:
                resp = await client.post(self._url, json=payload, headers=self._headers)
        except httpx.HTTPError as exc:
            raise LLMError(f"调用 LLM 失败：{type(exc).__name__}") from exc
        if resp.status_code != 200:
            logger.warning("LLM 返回 HTTP %s：%s", resp.status_code, resp.text[:300])
            raise LLMError(f"LLM 返回 HTTP {resp.status_code}")
        try:
            content = resp.json()["choices"][0]["message"]["content"]
            content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip())
            data = json.loads(content)
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise LLMError("LLM 输出不是合法的 JSON") from exc
        if not isinstance(data, dict):
            raise LLMError("LLM 输出不是 JSON 对象")
        return data
