from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    dify_base_url: str = "https://api.dify.ai/v1"
    dify_api_key: str = ""

    # 工作流 End 节点的输出变量名
    dify_output_jd_key: str = "final_jd"
    dify_output_missing_key: str = "missing_info"

    # 单次生成的最长等待时间（秒）
    generation_timeout: float = 300

    # Mock 模式：回放录制好的事件流，不调用 Dify
    dify_mock: bool = False
    # Mock 回放速度系数，0 表示不等待（测试用）
    mock_delay_scale: float = 1.0

    # 中间层 LLM（通义千问，OpenAI 兼容接口）：一句话识别、岗位类别判断
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_api_key: str = ""
    llm_model: str = "qwen-flash"
    llm_timeout: float = 20

    # 前端构建产物目录；为空时自动探测 ../frontend/dist
    static_dir: Path | None = None

    @property
    def api_key_configured(self) -> bool:
        key = self.dify_api_key.strip()
        return bool(key) and "xxxx" not in key

    @property
    def llm_configured(self) -> bool:
        key = self.llm_api_key.strip()
        return bool(key) and "xxxx" not in key

    @property
    def resolved_static_dir(self) -> Path | None:
        candidates = [self.static_dir, BACKEND_DIR.parent / "frontend" / "dist"]
        for path in candidates:
            if path and (path / "index.html").is_file():
                return path
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()
