# TikTok Video Analyzer (TK视频分析平台)

一个全栈 TikTok 视频深度分析工具，通过多个 AI 大模型对视频进行内容拆解、评论分析、脚本拆解、分镜分析、参与度峰值预测，并提炼可复制的成功模式。

## 技术栈

- **前端**: React 19 + TypeScript + Vite 8 + TailwindCSS 4
- **状态管理**: Zustand 5
- **路由**: React Router DOM v7
- **图表**: Recharts
- **本地持久化**: IndexedDB (via `idb` 库)
- **AI SDK**: `ai` v6 + `@ai-sdk/anthropic` + `@ai-sdk/openai` + `@ai-sdk/google`
- **Python 后端**: httpx + 标准库 http.server (SSR JSON 解析)，运行在 `localhost:8765`

## 项目结构

```
src/
├── ai/
│   ├── orchestrator.ts          # 核心分析流程编排（5步管道）
│   ├── provider-router.ts       # 模型→Provider 映射 + 任务→模型路由
│   └── prompts/                 # 分析步骤的 prompt 模板
│       ├── script-breakdown.ts      # 脚本拆解 + 分镜分析
│       ├── content-deconstruction.ts # 内容拆解
│       ├── timeline-analysis.ts     # 时间线分析
│       ├── comment-analysis.ts      # 评论分析
│       └── insight-generation.ts    # 洞察+参与度峰值+归因
├── components/
│   ├── layout/Layout.tsx        # 侧边栏 + 主内容区布局
│   ├── analysis/                # 分析详情相关组件
│   ├── compare/RadarChart.tsx   # 雷达图对比
│   ├── library/                 # 分析库列表相关组件
│   ├── patterns/                # 模式库相关组件
│   └── ui/                      # 通用UI组件（Skeleton/EmptyState/ConfirmDialog等）
├── pages/
│   ├── AnalyzePage.tsx          # 新建/编辑分析（含自动获取视频数据）
│   ├── AnalysisDetailPage.tsx   # 分析结果详情页（5个标签页）
│   ├── LibraryPage.tsx          # 分析库首页（搜索/排序/删除）
│   ├── ComparePage.tsx          # 最多4个视频并排对比
│   ├── PatternsPage.tsx         # 模式提炼（需≥2条完成分析）
│   └── SettingsPage.tsx         # API Key管理 + 模型偏好 + 数据导入导出
├── services/
│   ├── tiktokFetcher.ts         # TikTok数据获取（Python API → 视频元数据）
│   ├── frameExtractor.ts        # 视频关键帧提取（调用Python后端）
│   ├── engagementTrend.ts       # 评论时间戳提取+聚类
│   ├── metricsEngine.ts         # 互动率/传播系数计算
│   ├── patternEngine.ts         # 跨分析模式提炼（钩子/情感弧线/节奏/最优时长/CTA）
│   ├── exportService.ts         # JSON/CSV导出
│   └── storage.ts               # IndexedDB CRUD 封装
├── stores/                      # Zustand stores
│   ├── analysisStore.ts         # 分析记录的CRUD + 当前选中
│   ├── aiStore.ts               # API Key管理 + 分析进度 + 模型偏好
│   ├── libraryStore.ts          # 搜索/排序/过滤
│   ├── compareStore.ts          # 对比选择 + 对比结果
│   └── uiStore.ts               # 侧边栏折叠/标签切换
├── types/index.ts               # 全部TypeScript类型定义
└── utils/
    ├── formatters.ts            # generateId / formatNumber
    └── validators.ts            # TikTok URL 校验

scripts/
├── tiktok_api.py                # Python HTTP服务（端口8765），SSR JSON解析 + yt-dlp
├── tiktok_f2_worker.py          # TikTok SSR JSON解析器（核心）
├── tiktok_login.py              # TikTok登录辅助
├── tiktok_scrape_with_chrome.py # Chrome浏览器抓取方案
└── import_cookies.py            # Cookie导入工具
```

## 核心架构

### 分析管道 (5步)
1. **脚本拆解+分镜分析** → 并行执行脚本拆解（钩子类型/叙事弧线/金句/文案技巧/逐段脚本）和分镜分析（shot type/运镜/构图/转场/能量级/视觉节奏）
2. **内容拆解** → 拆解视频为hook/intro/body/cta/outro分段，分析钩子、节奏、情感弧线
3. **时间线分析** → 逐秒时间线，视觉+音频+能量曲线+关键节点
4. **评论分析** → 分两轮：情感+关键词 / 主题+问题+互动模式（避免单次调用超限）
5. **洞察生成** → 成功因素/可复制模式/优化建议 + 综合归因 + 参与度峰值预测

### AI Provider 支持（8个）
Anthropic / OpenAI / Google / DeepSeek / 豆包(火山引擎) / OpenRouter(免费模型) / OneToken(中转) / ComeU(中转)

每个分析任务可独立配置模型。API Key base64编码存储在localStorage。

### TikTok 数据抓取 — SSR JSON 解析
TikTok在每个视频页面 `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` 中嵌入完整视频数据（SEO/SSR）。只需 HTTP GET + 浏览器 User-Agent 即可获取，**无需 API Key、Cookie 或登录**。

数据路径: `__DEFAULT_SCOPE__ → webapp.video-detail → itemInfo → itemStruct`

```python
# 核心逻辑: scripts/tiktok_f2_worker.py
import httpx
html = httpx.get(url, headers={"User-Agent": BROWSER_UA}).text
match = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">(.*?)</script>', html)
item = json.loads(match.group(1))["__DEFAULT_SCOPE__"]["webapp.video-detail"]["itemInfo"]["itemStruct"]
```

### 参与度峰值分析
1. 评论时间戳提取 — 匹配 `0:23`、`1分23秒`、`at 23s` 等格式，±2s聚类统计
2. AI交叉推断 — 评论时间戳 + 时间线能量 + 分镜节奏 + 脚本结构 → 预测峰值秒数

### Provider 适配层
- OneToken 中转 Claude 时自动清掉 system message、解包 `{code, data}` relay 响应
- ComeU 自动映射模型名到 Chat Completions API
- Claude relay 使用 `.chat()` 避免 Responses API 兼容问题

### 数据流
- 视频数据获取：`tiktokFetcher.ts` → Python API (127.0.0.1:8765) → SSR JSON 解析
- 分析结果存储：全量存 IndexedDB (`tiktok-video-analyzer` 数据库)
- 帧提取：前端请求 Python API `/api/extract-frames`，Python用imageio-ffmpeg提取后返回base64

## 常用命令

```bash
npm run dev        # 启动前端开发服务器 (Vite)
npm run scraper    # 启动Python后端 (端口8765, 自动检测代理)
npm run build      # TypeScript编译 + Vite构建
npm run preview    # 预览生产构建
```

## 设计约定

- 所有文本使用中文（界面/提示/prompt模板均为中文）
- 暗色主题（glass-card / gradient-text 样式，Tailwind暗色调色板）
- 分析状态：`draft` → `analyzing` → `complete` / `partial` / `error`
- 即使步骤失败也继续执行后续步骤，最终标记为 `partial` 而非完全中断
- 免费模型（`:free`后缀）在步骤间有3秒延迟避免限流
- API Key仅存浏览器本地，不上传任何服务器
