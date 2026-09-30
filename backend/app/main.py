import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from .compose import compose_inputs
from .config import Settings, get_settings
from .dify import DifyClient
from .llm import LLMClient, LLMError
from .pipeline import generate_events
from .role_parser import classify_role, parse_role
from .schemas import (
    Brief,
    ClassifyRoleRequest,
    ClassifyRoleResponse,
    ComposePreview,
    ParsedRole,
    ParseRoleRequest,
    TechGroupOut,
)
from .tech_groups import TECH_GROUPS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Smart JD Generator", docs_url=None, redoc_url=None)


def get_dify_client(settings: Settings = Depends(get_settings)) -> DifyClient:
    return DifyClient(settings.dify_base_url, settings.dify_api_key)


def get_llm_client(settings: Settings = Depends(get_settings)) -> LLMClient | None:
    """未配置 LLM_API_KEY 时返回 None，调用方回退到本地规则"""
    if not settings.llm_configured:
        return None
    return LLMClient(settings.llm_base_url, settings.llm_api_key, settings.llm_model, timeout=settings.llm_timeout)


async def generation_guard(request: Request) -> None:
    """生成接口的前置钩子。后续需要限流、访问码等防护时在这里实现，业务代码无需改动。"""
    return None


def _compose(brief: Brief) -> dict[str, str]:
    try:
        return compose_inputs(brief)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/health")
def health(settings: Settings = Depends(get_settings)):
    return {
        "status": "ok",
        "mock": settings.dify_mock,
        "configured": settings.api_key_configured,
        "llm_configured": settings.llm_configured,
    }


@app.post("/api/compose", response_model=ComposePreview)
def compose(brief: Brief):
    inputs = _compose(brief)
    return ComposePreview(
        company_domain=inputs["company_domain"],
        hiring_needs=inputs["hiring_needs"],
        specific_benefits=inputs["specific_benefits"],
        tech_stack=inputs["tech_stack"],
    )


@app.get("/api/tech-groups", response_model=list[TechGroupOut])
def tech_groups():
    return [TechGroupOut(id=g.id, label=g.label, tags=list(g.tags)) for g in TECH_GROUPS]


@app.post("/api/parse-role", response_model=ParsedRole, dependencies=[Depends(generation_guard)])
async def parse_role_endpoint(body: ParseRoleRequest, client: LLMClient | None = Depends(get_llm_client)):
    """用 LLM 拆解一句话招聘需求；不可用时返回 503，由前端回退到本地规则识别"""
    if client is None:
        raise HTTPException(status_code=503, detail="未配置 LLM_API_KEY")
    try:
        return await parse_role(client, body.text)
    except LLMError as exc:
        logging.getLogger(__name__).warning("一句话识别失败：%s", exc)
        raise HTTPException(status_code=502, detail="AI 识别暂时不可用") from exc


@app.post("/api/classify-role", response_model=ClassifyRoleResponse, dependencies=[Depends(generation_guard)])
async def classify_role_endpoint(body: ClassifyRoleRequest, client: LLMClient | None = Depends(get_llm_client)):
    category, engine = await classify_role(client, body.title, body.scene)
    return ClassifyRoleResponse(category=category, engine=engine)


@app.post("/api/generate", dependencies=[Depends(generation_guard)])
async def generate(
    brief: Brief,
    settings: Settings = Depends(get_settings),
    client: DifyClient = Depends(get_dify_client),
):
    inputs = _compose(brief)
    user = f"jd-web-{brief.client_id or 'anonymous'}"
    return StreamingResponse(
        generate_events(inputs, user, settings, client),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── 生产环境：托管前端构建产物，并对前端路由做 SPA fallback ──────────────
_static_dir = get_settings().resolved_static_dir

if _static_dir is not None:

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = (_static_dir / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(_static_dir.resolve()):
            # Vite 构建的 assets 带内容哈希，可长期缓存
            cache = "public, max-age=31536000, immutable" if full_path.startswith("assets/") else "no-cache"
            return FileResponse(candidate, headers={"Cache-Control": cache})
        return FileResponse(_static_dir / "index.html", headers={"Cache-Control": "no-cache"})
