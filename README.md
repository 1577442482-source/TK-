# TK视频分析站

TikTok 视频内容深度分析平台。从内容脚本和数据层面细分拆解视频，得出可执行的结论。

**设计风格: "Dark Neon Tech"** — emerald/teal 主色调，Geist 字体，glass morphism，动态 mesh 背景，交错动画。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 + Tailwind CSS 4 |
| AI | Vercel AI SDK (`@ai-sdk/anthropic` `@ai-sdk/openai` `@ai-sdk/google`) |
| 状态 | Zustand 5 |
| 存储 | IndexedDB (idb) |
| 图表 | Recharts 3 |
| 路由 | React Router DOM 7 |
| 图标 | lucide-react |
| 字体 | Geist + Geist Mono |

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/1577442482-source/TK-.git
cd TK-

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问 http://localhost:5173
```

## AI 配置

本项目支持多模型 AI 分析，需在设置页面配置 API Key：

| 提供商 | 获取地址 | 支持的模型 |
|--------|---------|-----------|
| Anthropic | https://console.anthropic.com | claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5 |
| OpenAI | https://platform.openai.com | gpt-4o, gpt-4o-mini, o4-mini |
| Google | https://aistudio.google.com | gemini-2.5-flash, gemini-2.5-pro |

API Key 仅存储在浏览器本地（localStorage base64 编码），不上传到任何服务器。

## 功能

### 视频分析（手动输入 -> AI 深度拆解）

1. 输入视频信息（链接、创作者、描述、hashtags、时长）
2. 输入数据指标（播放、点赞、分享、评论、收藏）
3. 手动划分脚本分段（钩子/开场/主体/CTA/结尾）
4. 粘贴评论数据
5. 点击分析 -> AI 自动执行 3 步流水线：
   - **内容拆解**：钩子分析、情感弧线、节奏分析、Hashtag 策略
   - **评论分析**：情感分布、主题聚类、关键词提取、用户提问检测
   - **洞察生成**：成功因素、可复制模式、优化建议、综合归因

### 分析库

- 搜索/排序（时间/互动率/播放量/情感分）
- 卡片网格展示
- 删除/复制/导出

### 视频对比

- 最多 4 个视频并排对比
- 指标对比表格（含增量百分比）
- 雷达图多维可视化

### 模式库

- 跨视频聚合分析
- 高频钩子类型 + 有效性
- 情感弧线分布
- 节奏 vs 互动率
- 最优时长区间
- CTA 策略分布
- 置信度评分

### 设置

- 3 家 AI 提供商 API Key 管理
- 模型偏好（每类任务可独立选模型）
- 温度参数调节
- 数据导出/导入（JSON/CSV）
- 一键清除全部数据

## 项目结构

```
src/
├── ai/                  # AI 模块
│   ├── orchestrator.ts  # 分析流水线编排
│   ├── provider-router.ts # 多模型路由
│   └── prompts/         # 3 个 Prompt 模板
├── components/
│   ├── compare/         # 雷达图
│   ├── layout/          # 侧边栏 + mesh 背景
│   └── ui/              # 通用组件
├── pages/               # 6 个页面
├── services/            # 存储/指标/导出/模式引擎
├── stores/              # 5 个 Zustand store
├── types/               # 全部类型定义
└── utils/               # 格式化/校验工具
```

## 构建部署

```bash
npm run build     # 输出到 dist/
npm run preview   # 预览构建产物
```

纯前端 SPA，无后端。部署到任意静态托管（Vercel、Netlify、GitHub Pages 等）即可。

## License

MIT
