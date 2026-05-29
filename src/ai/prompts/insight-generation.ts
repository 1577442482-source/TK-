import type { AIInsight, WhyAnalysis, ContentDeconstruction, CommentAnalysis, VideoMetrics, EngagementTrend, ScriptBreakdown, ShotAnalysis, TimelineAnalysis } from '../../types';

export interface InsightGenerationInput {
  contentDeconstruction: ContentDeconstruction | null;
  commentAnalysis: CommentAnalysis | null;
  metrics: VideoMetrics;
  videoDescription?: string;
  videoHashtags: string[];
  skipWhyAnalysis?: boolean;
}

export function buildInsightPrompt(input: InsightGenerationInput): string {
  return `You are a TikTok growth strategist. Analyze this video's performance data and generate actionable insights.

## PERFORMANCE DATA
- Views: ${input.metrics.views}
- Likes: ${input.metrics.likes}
- Shares: ${input.metrics.shares}
- Comments: ${input.metrics.comments}
- Saves: ${input.metrics.saves}
- Engagement Rate: ${input.metrics.engagementRate.toFixed(2)}%
- Viral Coefficient: ${input.metrics.viralCoefficient.toFixed(2)}%

## CONTENT STRUCTURE
${input.contentDeconstruction ? `
- Hook Type: ${input.contentDeconstruction.hookAnalysis.hookType}
- Hook Effectiveness: ${input.contentDeconstruction.hookAnalysis.effectiveness}/100
- Emotional Arc: ${input.contentDeconstruction.emotionalArc.arcType} (dominant: ${input.contentDeconstruction.emotionalArc.dominantEmotion})
- Overall Rhythm: ${input.contentDeconstruction.pacingAnalysis.overallRhythm}
- Hashtag Relevance: ${input.contentDeconstruction.hashtagAnalysis.categoryRelevance}/100
` : 'Not analyzed yet'}

## COMMENT LANDSCAPE
${input.commentAnalysis ? `
- Total Comments: ${input.commentAnalysis.totalComments}
- Sentiment: Positive ${input.commentAnalysis.sentimentDistribution.positive}% / Negative ${input.commentAnalysis.sentimentDistribution.negative}% / Neutral ${input.commentAnalysis.sentimentDistribution.neutral}%
- Top Themes: ${input.commentAnalysis.themeClusters.map(t => t.theme).join(', ')}
- User Questions: ${input.commentAnalysis.userQuestions.length}
- Engagement Patterns: ${input.commentAnalysis.engagementPatterns.map(p => p.pattern).join(', ')}
` : 'Not analyzed yet'}

## TASK 1: Generate AI Insights (insights array)
Return insights with this structure:
{
  "insights": [{
    "id": "insight-1" (sequential),
    "category": "success_factor|replicable_pattern|optimization|warning|content_gap",
    "title": "insight title in Chinese",
    "description": "detailed explanation in Chinese (2-4 sentences)",
    "confidence": 0-100,
    "supportingData": ["specific data points that support this insight"],
    "actionability": "immediate|short_term|strategic",
    "relatedSegments": ["segment type names"],
    "priority": number (higher = more important, 1-100)
  }]
}

Generate 3-5 insights covering different categories. Prioritize actionable insights. Focus on WHY the video performed well/poorly and WHAT the creator can do.

Return ONLY valid JSON: { "insights": [...] }. No markdown enclosure.`;
}

export function buildWhyAnalysisPrompt(input: Omit<InsightGenerationInput, 'videoDescription' | 'videoHashtags' | 'skipWhyAnalysis'>): string {
  return `You are a TikTok growth strategist. Analyze this video's performance data and explain why it succeeded or failed.

## PERFORMANCE DATA
- Views: ${input.metrics.views}
- Likes: ${input.metrics.likes}
- Shares: ${input.metrics.shares}
- Comments: ${input.metrics.comments}
- Saves: ${input.metrics.saves}
- Engagement Rate: ${input.metrics.engagementRate.toFixed(2)}%
- Viral Coefficient: ${input.metrics.viralCoefficient.toFixed(2)}%

## CONTENT STRUCTURE
${input.contentDeconstruction ? `
- Hook Type: ${input.contentDeconstruction.hookAnalysis.hookType}
- Hook Effectiveness: ${input.contentDeconstruction.hookAnalysis.effectiveness}/100
- Emotional Arc: ${input.contentDeconstruction.emotionalArc.arcType} (dominant: ${input.contentDeconstruction.emotionalArc.dominantEmotion})
- Overall Rhythm: ${input.contentDeconstruction.pacingAnalysis.overallRhythm}
` : 'Not analyzed yet'}

## COMMENT LANDSCAPE
${input.commentAnalysis ? `
- Total Comments: ${input.commentAnalysis.totalComments}
- Sentiment: Positive ${input.commentAnalysis.sentimentDistribution.positive}% / Negative ${input.commentAnalysis.sentimentDistribution.negative}%
- Top Themes: ${input.commentAnalysis.themeClusters.map(t => t.theme).join(', ')}
` : 'Not analyzed yet'}

Return ONLY valid JSON:
{
  "whyItWorked": "comprehensive 3-5 sentence explanation in Chinese",
  "primarySuccessFactors": [{
    "factor": "factor name in Chinese",
    "impact": "critical|high|moderate|low",
    "evidence": ["specific evidence"],
    "category": "hook|pacing|sound|visuals|storytelling|cta|trend|community"
  }],
  "replicableElements": ["elements to reuse"],
  "riskFactors": ["risks to be aware of"],
  "creatorRecommendations": ["3-5 specific recommendations in Chinese"]
}
No markdown enclosure.`;
}

export function parseInsightResponse(json: string): { insights: AIInsight[]; whyAnalysis: WhyAnalysis | null } {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      insights: (data.insights || []).map((i: any, idx: number) => ({
        id: i.id || `insight-${idx + 1}`,
        category: i.category || 'success_factor',
        title: i.title || '',
        description: i.description || '',
        confidence: i.confidence || 50,
        supportingData: i.supportingData || [],
        actionability: i.actionability || 'short_term',
        relatedSegments: i.relatedSegments,
        priority: i.priority || 50,
      })),
      whyAnalysis: data.whyAnalysis || null,
    };
  } catch {
    return { insights: [], whyAnalysis: null };
  }
}

export function parseWhyAnalysisResponse(json: string): WhyAnalysis | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      primarySuccessFactors: data.primarySuccessFactors || [],
      whyItWorked: data.whyItWorked || '',
      replicableElements: data.replicableElements || [],
      riskFactors: data.riskFactors || [],
      creatorRecommendations: data.creatorRecommendations || [],
    };
  } catch {
    return null;
  }
}

// ============================================================
// Engagement Trend — comment timestamps + cross-data peak prediction
// ============================================================

export interface EngagementTrendInput {
  commentTimestamps: { time: number; count: number; sampleTexts: string[] }[];
  scriptBreakdown: ScriptBreakdown | null;
  shotAnalysis: ShotAnalysis | null;
  timelineAnalysis: TimelineAnalysis | null;
  contentDeconstruction: ContentDeconstruction | null;
  duration?: number;
}

export function buildEngagementTrendPrompt(input: EngagementTrendInput): string {
  const tsLines = input.commentTimestamps.length > 0
    ? input.commentTimestamps.map(t =>
        `- ${t.time}s: ${t.count}次引用, 示例: "${t.sampleTexts.slice(0, 2).join('", "')}"`
      ).join('\n')
    : '(评论区未发现带时间戳的引用)';

  const timelineStr = input.timelineAnalysis
    ? input.timelineAnalysis.segments.map(s =>
        `- [${s.startTime}s-${s.endTime}s] 能量:${s.energyLevel}/100 情绪:${s.dominantEmotion} 动作:${s.keyActions.join(',')}`
      ).join('\n')
    : '(无时间线数据)';

  const shotStr = input.shotAnalysis
    ? input.shotAnalysis.shotBreakdown.map(s =>
        `- [${s.startTime}s-${s.endTime}s] ${s.shotType} 运镜:${s.cameraMovement} 能量:${s.energyLevel}/100`
      ).join('\n')
    : '(无分镜数据)';

  const scriptStr = input.scriptBreakdown
    ? `钩子类型: ${input.scriptBreakdown.scriptStructure.hookType}
钩子脚本: ${input.scriptBreakdown.scriptStructure.hookScript}
叙事弧线: ${input.scriptBreakdown.scriptStructure.narrativeArc}
金句: ${input.scriptBreakdown.scriptStructure.keyLines.join(' / ')}
逐段: ${input.scriptBreakdown.segmentScripts.map(s => `[${s.segment}] ${s.scriptText}`).join(' | ')}`
    : '(无脚本拆解数据)';

  const emoStr = input.contentDeconstruction
    ? `弧线类型: ${input.contentDeconstruction.emotionalArc.arcType}, 主导情绪: ${input.contentDeconstruction.emotionalArc.dominantEmotion}`
    : '';

  return `你是一个 TikTok 观众行为分析师。你要综合评论时间戳、时间线能量、分镜节奏和脚本结构，推断这个视频"第几秒最能抓住观众"。

## 评论时间戳引用
${tsLines}

## 时间线分析（逐段能量）
${timelineStr}

## 分镜分析（逐镜节奏）
${shotStr}

## 脚本拆解
${scriptStr}

## 情感弧线
${emoStr}

## 任务
综合以上所有数据，找出观众注意力最集中的 3-5 个峰值秒数，并描述整体参与度曲线。

返回 JSON（不要 markdown）：
{
  "commentTimeReferences": [{"time": 15, "text": "评论区示例原文", "sentiment": "positive"}],
  "predictedPeaks": [{
    "time": 23,
    "energyScore": 92,
    "sources": ["评论集中引用", "时间线能量峰值", "分镜转场高潮", "脚本金句节点"],
    "reason": "该秒发生了什么让观众高度参与，用中文一句话"
  }],
  "engagementCurve": "描述整个视频的注意力曲线，用时间+箭头表示，如：0-3s钩子吸睛 → 3-15s铺垫蓄力 → 15s反转引爆 → 15-30s高潮维持 → 30s结尾CTA",
  "heatmapDescription": "综合描述最火的几个秒数和观众行为模式，用中文2-3句话"
}

注意：
- predictedPeaks 按 energyScore 从高到低排序
- sources 从上述数据源中勾选适用的
- 评论时间戳是观众自发的"投票"，权重最高
- 如果某时间点同时被评论引用+时间线标记关键节点+分镜切换，可信度最高

只返回 JSON，不要 markdown 包裹。`;
}

export function parseEngagementTrendResponse(json: string): EngagementTrend | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      commentTimeReferences: (data.commentTimeReferences || []).map((c: any) => ({
        time: c.time || 0,
        text: c.text || '',
        sentiment: c.sentiment || 'neutral',
      })),
      predictedPeaks: (data.predictedPeaks || []).map((p: any) => ({
        time: p.time || 0,
        energyScore: p.energyScore || 0,
        sources: p.sources || [],
        reason: p.reason || '',
      })),
      engagementCurve: data.engagementCurve || '',
      heatmapDescription: data.heatmapDescription || '',
    };
  } catch {
    return null;
  }
}
