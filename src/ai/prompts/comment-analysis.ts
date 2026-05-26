import type { CommentAnalysis, Comment } from '../../types';

export interface CommentAnalysisInput {
  comments: Comment[];
  videoDescription?: string;
  videoHashtags: string[];
}

export function buildCommentAnalysisPrompt(input: CommentAnalysisInput): string {
  const commentTexts = input.comments.map((c, i) => `${i + 1}. [likes: ${c.likes}] ${c.text}`).join('\n');

  return `You are a TikTok comment analyst. Analyze the following comments and return structured JSON.

## VIDEO CONTEXT
- Description: ${input.videoDescription || 'Not provided'}
- Hashtags: ${input.videoHashtags.join(', ') || 'None'}

## COMMENTS (${input.comments.length} total)
${commentTexts.slice(0, 8000)}

## TASK
Analyze these comments deeply. Return JSON with this exact structure:

{
  "sentimentDistribution": {
    "positive": number (percentage 0-100),
    "negative": number (percentage 0-100),
    "neutral": number (percentage 0-100),
    "mixed": number (percentage 0-100),
    "overallScore": number (-1.0 to 1.0)
  },
  "themeClusters": [{
    "theme": "theme name in Chinese",
    "count": number,
    "percentage": number,
    "representativeComments": ["2-3 example comments that exemplify this theme"],
    "averageSentiment": number (-1.0 to 1.0)
  }],
  "userQuestions": [{
    "commentId": "use index from the numbered list as string",
    "question": "the extracted question in Chinese",
    "category": "product|usage|pricing|logistics|creator|content|other",
    "frequency": number (how many comments ask similar things),
    "isUnanswered": boolean
  }],
  "engagementPatterns": [{
    "pattern": "pattern name in Chinese (e.g., praise-storm, debate-trigger, question-flood, meme-chain)",
    "trigger": "what in the video caused this pattern, in Chinese",
    "frequency": number (how many comments match),
    "significance": 0-100
  }],
  "topKeywords": [{
    "word": "keyword in original language",
    "frequency": number
  }],
  "contentCorrelation": "analysis of how comments relate to the video content, in Chinese",
  "summary": "concise summary of the overall comment landscape, in Chinese"
}

Return ONLY valid JSON, no markdown enclosure. Analyze in the comments' original language (Chinese/English). Return top 15 keywords max, top 5 theme clusters max.`;
}

export function parseCommentAnalysisResponse(json: string): CommentAnalysis | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      totalComments: 0,
      sentimentDistribution: data.sentimentDistribution || { positive: 0, negative: 0, neutral: 100, mixed: 0, overallScore: 0 },
      themeClusters: data.themeClusters || [],
      userQuestions: data.userQuestions || [],
      engagementPatterns: data.engagementPatterns || [],
      topKeywords: data.topKeywords || [],
      contentCorrelation: data.contentCorrelation || '',
      summary: data.summary || '',
    };
  } catch {
    return null;
  }
}
