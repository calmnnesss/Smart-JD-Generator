# Smart JD · JD 智能生成器

用分步表单收集公司和岗位信息，交给 Dify 工作流去查阅官网与公开资料、提炼亮点、起草并审校，最后得到一份**不编造**的招聘启事底稿。

- **分步表单**：公司信息 → 岗位需求 → 福利与技术栈 → 确认生成。
- **岗位需求两种填法**：两种方式写入同一份岗位信息，可以随时切换。
  - 一句话识别：输入一句话，前端按规则拆出岗位、场景、地点、届别、经验；没识别出的字段标为「待补充」，并直接给出对应控件。
  - 逐项引导：每屏只问一项，用可搜索下拉、单选卡、分段选择等控件填写，选择后自动进入下一项。
- **实时招聘简报**：随填写实时更新，显示信息完整度，点击任意字段跳到对应位置修改。
- **真实进度**：生成过程按 Dify 节点事件推进，依次是访问官网 → 检索公开信息 → 提炼亮点 → 能力画像 → 撰写初稿 → 审校定稿。
- **导出**：可复制 Markdown、复制纯文本（方便粘贴到招聘平台），也可下载 `.md` 文件。

信息收集环节不接 LLM，界面也不模拟对话；AI 只出现在真正调用它的地方，也就是 Dify 工作流的生成过程。

## 架构

```
浏览器（React SPA）
  │  POST /api/generate   结构化招聘简报（JSON）
  ▼
FastAPI 薄后端（校验 → 拼接工作流入参 → 流式调用 Dify → 精简事件后转发 SSE）
  │  POST {DIFY_BASE_URL}/workflows/run   response_mode=streaming
  ▼
Dify 工作流（JD_generator_v3）
```

- **API Key 只在后端**：前端拿不到 Key，也看不到节点名、prompt 等技术细节。
- **生产环境是单镜像**：FastAPI 同时托管前端构建产物和 `/api`，一个容器、一个端口。

```
frontend/   Vite + React + TypeScript + Tailwind CSS v4 + motion
  src/features/form/        分步表单：状态管理、字段定义、表单控件、各步骤
  src/features/brief/       招聘简报与完整度
  src/features/generation/  生成进度、JD 文档
  src/pages/                Landing（落地页占位）、Studio（生成器）
backend/    FastAPI + httpx
  app/compose.py   简报 → 工作流入参的拼接规则
  app/dify.py      Dify 流式客户端
  app/stages.py    Dify 节点 → 用户可见阶段
  app/output.py    工作流输出解析
  app/mock.py      Mock 模式（回放一次真实运行的输出）
deploy/     Nginx 反向代理示例
```

## 本地运行

需要 Python 3.11+ 和 Node.js 20.19+（或 22.12+）。

**1. 后端**（端口 8000）

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # 填入 DIFY_API_KEY
uvicorn app.main:app --reload
```

**2. 前端**（端口 5173，`/api` 自动代理到 8000）

```bash
cd frontend
npm install
npm run dev
```

打开 <http://localhost:5173>。落地页在 `/`，生成器在 `/studio`；`/studio?demo=1` 会自动填入示例。

## 配置（`backend/.env`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DIFY_BASE_URL` | `https://api.dify.ai/v1` | Dify API 地址（自部署时换成自己的） |
| `DIFY_API_KEY` | — | 工作流应用的 API 密钥（`app-` 开头），**必填** |
| `DIFY_OUTPUT_JD_KEY` | `final_jd` | End 节点里 JD 正文的变量名 |
| `DIFY_OUTPUT_MISSING_KEY` | `missing_info` | End 节点里待补充清单的变量名 |
| `GENERATION_TIMEOUT` | `300` | 单次生成最长等待（秒） |
| `DIFY_MOCK` | `false` | Mock 模式，见下文 |

### Mock 模式

`DIFY_MOCK=true` 时后端不调用 Dify，而是按真实节奏回放一次真实运行的输出（`backend/app/fixtures/sample_outputs.json`）。适合调样式、离线演示，不消耗额度。正式使用时保持关闭即可。

## 与 Dify 工作流的对接

**入参拼接**（`backend/app/compose.py`）：

| 工作流入参 | 拼接方式 |
|------------|----------|
| `hiring_needs` | 由岗位、场景、地点、类型/届别/经验、职级拼接，例如 `AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招`；一句话里没识别出的内容原样追加，不丢信息 |
| `specific_benefits` / `tech_stack` | 用「、」连接，**逐字保留**，不改写 |
| `company_domain` | 自动补全 `https://` |
| `company_description` | 原样传入；后端也支持把补充信息以「补充信息：」段落追加在末尾（前端暂未使用，见「后续」） |

**生成阶段映射**（`backend/app/stages.py`）：先按节点标题关键词匹配，匹配不上时按节点类型顺延。后端日志会打印每个节点的标题与映射结果：

```
Dify 节点开始：title='LLM1' type=llm → 阶段 analyze
```

如果映射不准，把节点标题填进 `NODE_TITLE_OVERRIDES` 即可，例如：

```python
NODE_TITLE_OVERRIDES = {"LLM1": "analyze", "LLM2": "profile", "LLM3": "draft", "LLM4": "review"}
```

## 测试

```bash
cd backend && pytest                                # 拼接规则、输出解析、SSE 解析、接口
cd frontend && npm test && npm run lint && npm run build   # 一句话解析、表单状态、SSE 解析
```

## Docker 部署

镜像是多阶段构建：Node 构建前端，Python 运行后端并托管静态文件。

```bash
cp backend/.env.example backend/.env   # 填入 DIFY_API_KEY
cp .env.example .env                   # 可选：修改端口、国内镜像源
docker compose up -d --build
```

默认访问 `http://服务器IP:18090`。

**和服务器上已有服务的关系**：

- **端口**：宿主机只占用 `18090`，已避开 `15173`、`18080`、`5435`；可以在根目录 `.env` 里用 `APP_PORT` 修改。
- **资源隔离**：compose 项目名、容器名、网络都是独立的（`smart-jd`），不需要数据库。
- **国内构建**：服务器在国内时，在根目录 `.env` 里打开 `NPM_REGISTRY`、`PIP_INDEX_URL` 两个镜像源。

**以后接域名和 HTTPS**：参考 `deploy/nginx.example.conf`。生成接口是 SSE 流式响应，需要关闭 `proxy_buffering`，并把 `proxy_read_timeout` 调大。

## 后续

- 落地页正式内容（项目背景、工作流设计、迭代记录）
- AI 对话模式：接入 LLM 中间层，从自由对话中抽取招聘字段、回答旁支问题并拉回主题。它写入的是同一份 `Brief`，可以作为岗位需求的第三种填法
- 利用工作流返回的空缺建议（`missing_info`）补充信息后改进再生成：后端的解析和 `supplements` 拼接已经就绪，前端暂未使用
- 访问防护（限流、访问码）：在 `backend/app/main.py` 的 `generation_guard` 中实现，业务代码不用改
