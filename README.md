# TikTok 视频深度分析平台 (TK视频分析)

一个全栈 TikTok 视频 AI 分析工具。通过多个大模型对视频进行脚本拆解、分镜分析、内容拆解、时间线分析、评论分析和参与度峰值预测，提炼可复制的成功模式。

## 功能特性

- **脚本拆解**: 自动推断视频的钩子类型、叙事弧线、金句、文案技巧，逐段还原脚本
- **分镜分析**: 逐镜拆解（shot type/运镜/构图/转场/能量级），分析视觉节奏和结构
- **内容拆解**: 将视频拆解为 hook → intro → body → cta → outro 五段结构
- **时间线分析**: 逐秒标注视觉/音频/能量/情绪
- **评论分析**: 情感分布 + 主题聚类 + 用户问题提取 + 互动模式识别
- **参与度峰值预测**: 从评论时间戳提取观众自发"投票"，结合脚本/分镜/时间线数据交叉推断观众注意力峰值
- **综合归因**: 成功因素提炼 + 可复制元素 + 风险提示 + 创作者建议
- **多视频对比**: 最多 4 个视频雷达图对比（指标/内容/情感/洞察）

## 技术栈

| 层 | 技术 |
|---|------|
| 前端框架 | React 19 + TypeScript + Vite 8 |
| UI | TailwindCSS 4 (暗色主题 + glass-card) |
| 状态管理 | Zustand 5 |
| 路由 | React Router DOM v7 |
| 图表 | Recharts |
| 本地存储 | IndexedDB (via `idb`) |
| AI SDK | `ai` v6 + `@ai-sdk/anthropic` + `@ai-sdk/openai` + `@ai-sdk/google` |
| Python 后端 | httpx + 标准库 http.server |
| TikTok 数据 | SSR JSON 解析 (无需 API Key / Cookie / 登录) |

## 支持的大模型 (8 个 Provider)

Anthropic (Claude)、OpenAI (GPT)、Google (Gemini)、DeepSeek、豆包(火山引擎)、OpenRouter(免费模型)、OneToken(中转)、ComeU(中转)

每个分析步骤可独立配置模型，API Key 仅存储在浏览器本地。

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/1577442482-source/TK-.git
cd TK-
```

### 2. 安装 Node.js 依赖

需要 Node.js >= 18。

```bash
npm install
```

### 3. 安装 Python 依赖

需要 Python >= 3.10。

```bash
# 如果 yt-dlp 安装报错，可以先用 conda 环境或 venv
pip install -r requirements.txt

# 或者创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### 4. 配置 API Key

启动后打开 `http://localhost:5173/settings`，添加至少一个 AI Provider 的 API Key。

> 推荐优先配置 [OpenRouter](https://openrouter.ai) — 提供多种免费模型 (Gemini 2.5 Flash, Llama 4, Qwen 3 等)，无需付费。

### 5. 启动

```bash
# 终端 1: 启动 Python 抓取后端 (端口 8765)
npm run scraper

# 终端 2: 启动前端开发服务器
npm run dev
```

打开 `http://localhost:5173`，粘贴 TikTok 视频链接，点击"开始分析"。

## 核心数据流

```
TikTok 视频 URL
    │
    ├─► Python API (localhost:8765)
    │     └─► SSR JSON 解析 (<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">)
    │           └─► 提取 播放量/点赞/评论/视频下载地址/音乐/创作者信息
    │
    ├─► 前端 IndexedDB 存储 (tiktok-video-analyzer)
    │
    └─► AI 分析管道 (5步)
          ├─ 1. 脚本拆解 + 分镜分析 (并行)
          ├─ 2. 内容拆解
          ├─ 3. 时间线分析
          ├─ 4. 评论分析 (分两轮: 情感+关键词 / 主题+问题+模式)
          └─ 5. 洞察+归因+参与度峰值
                └─► 完成/部分完成状态
```

## 技术要点

### TikTok 数据抓取 — SSR JSON 解析

TikTok 在每个视频页面的 `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` 中嵌入了完整的视频数据（播放量、点赞、评论、作者信息等）。只需 HTTP GET + 浏览器 User-Agent 即可获取，**无需 API Key、Cookie 或登录**。

数据路径: `__DEFAULT_SCOPE__ → webapp.video-detail → itemInfo → itemStruct`

```python
# 核心逻辑位于 scripts/tiktok_f2_worker.py
import httpx
html = httpx.get(url, headers={"User-Agent": BROWSER_UA}).text
match = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__".*?>(.*?)</script>', html)
item = json.loads(match.group(1))["__DEFAULT_SCOPE__"]["webapp.video-detail"]["itemInfo"]["itemStruct"]
```

### 代理自动检测

Python 后端启动时自动检测常见代理端口 (Clash: 7890/7897, V2Ray: 1087/10809)。

### AI Provider 适配

- OneToken 中转 Claude 时自动清掉 system message（避免 relay 兼容报错）
- OneToken 自动解包 `{code, data}` relay 响应格式
- ComeU 自动映射模型名到 Chat Completions API
- 免费模型步骤间加 3s 延迟避免限流
- 指数退避重试（8s → 16s → 32s）

## 项目结构

```
src/
├── ai/
│   ├── orchestrator.ts            # 分析流程编排 (5步管道)
│   ├── provider-router.ts         # 模型→Provider 映射 + 任务路由
│   └── prompts/
│       ├── script-breakdown.ts    # 脚本拆解 + 分镜分析 prompt
│       ├── content-deconstruction.ts
│       ├── timeline-analysis.ts
│       ├── comment-analysis.ts
│       └── insight-generation.ts  # 洞察/归因/参与度峰值 prompt
├── services/
│   ├── tiktokFetcher.ts           # 视频数据获取
│   ├── frameExtractor.ts          # 关键帧提取
│   ├── engagementTrend.ts         # 评论时间戳提取+聚类
│   ├── metricsEngine.ts           # 互动率/传播系数
│   ├── patternEngine.ts           # 跨分析模式提炼
│   ├── exportService.ts           # JSON/CSV 导出
│   └── storage.ts                 # IndexedDB CRUD
├── stores/
│   ├── analysisStore.ts           # 分析CRUD
│   ├── aiStore.ts                 # API Key + 进度 + 模型偏好
│   ├── libraryStore.ts            # 搜索/排序/过滤
│   ├── compareStore.ts            # 对比选择 + 结果
│   └── uiStore.ts                 # UI状态
├── pages/
│   ├── AnalyzePage.tsx            # 新建分析
│   ├── AnalysisDetailPage.tsx     # 分析详情 (5个标签页)
│   ├── LibraryPage.tsx            # 分析库
│   ├── ComparePage.tsx            # 多视频对比
│   ├── PatternsPage.tsx           # 模式提炼
│   └── SettingsPage.tsx           # API Key + 模型偏好
├── components/                    # UI组件
├── types/index.ts                 # 全部类型定义
└── utils/                         # 工具函数

scripts/
├── tiktok_api.py                  # Python HTTP服务 (端口8765)
├── tiktok_f2_worker.py            # SSR JSON 解析器
├── tiktok_login.py                # TikTok 登录辅助
├── tiktok_scrape_with_chrome.py   # Chrome 浏览器抓取方案
└── import_cookies.py              # Cookie 导入工具
```

## 环境要求汇总

| 依赖 | 版本 |
|------|------|
| Node.js | >= 18 |
| Python | >= 3.10 |
| npm | >= 9 |
| pip | >= 23 |

Python 依赖: `httpx`, `yt-dlp`, `imageio-ffmpeg`, `requests`

## 设计约定

- 所有界面/提示/prompt 模板均为中文
- 暗色主题 (Tailwind 暗色调色板 + glass-card 风格)
- 分析状态: `draft` → `analyzing` → `complete` / `partial` / `error`
- 即使某步骤失败也继续执行后续步骤 (鲁棒性)
- API Key 仅存浏览器 localStorage，不上传任何服务器
- 分析结果全量存 IndexedDB

## License

MIT
