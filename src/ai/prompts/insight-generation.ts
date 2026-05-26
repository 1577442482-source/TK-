import type { AIInsight, WhyAnalysis, ContentDeconstruction, CommentAnalysis, VideoMetrics } from '../../types';

export interface InsightGenerationInput {
  contentDeconstruction: ContentDeconstruction | null;
  commentAnalysis: CommentAnalysis | null;
  metrics: VideoMetrics;
  videoDescription?: string;
  videoHashtags: string[];
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

Generate 5-8 insights covering different categories. Prioritize actionable insights over descriptive ones. Focus on WHY the video performed well or poorly, and WHAT the creator can do about it.

## TASK 2: Why Analysis
{
  "whyAnalysis": {
    "primarySuccessFactors": [{
      "factor": "factor name in Chinese",
      "impact": "critical|high|moderate|low",
      "evidence": ["specific evidence from data or comments"],
      "category": "hook|pacing|sound|visuals|storytelling|cta|trend|community"
    }],
    "whyItWorked": "comprehensive 3-5 sentence explanation in Chinese of why this video succeeded or failed",
    "replicableElements": ["specific elements the creator can reuse in future videos"],
    "riskFactors": ["elements that might not work again or risks to be aware of"],
    "creatorRecommendations": ["3-5 specific, actionable recommendations for the creator in Chinese"]
  }
}

Return ONLY valid JSON combining both tasks: { "insights": [...], "whyAnalysis": {...} }. No markdown enclosure.`;
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
