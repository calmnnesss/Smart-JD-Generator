# syntax=docker/dockerfile:1
# 单镜像部署：先构建前端静态文件，再由 FastAPI 统一托管前端与 /api

# ── 1. 构建前端 ───────────────────────────────────────────────
FROM node:22-alpine AS web
# 国内服务器可改为 https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY} --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ── 2. 运行后端 ───────────────────────────────────────────────
FROM python:3.12-slim
# 国内服务器可改为 https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_INDEX_URL=https://pypi.org/simple
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -i ${PIP_INDEX_URL} -r requirements.txt
COPY backend/app ./app
COPY --from=web /web/dist ./static
RUN useradd --create-home --uid 10001 app
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
