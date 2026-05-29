import type { CommentAnalysis, Comment } from '../../types';

export interface CommentAnalysisInput {
  comments: Comment[];
  videoDescription?: string;
  videoHashtags: string[];
}

function formatComments(comments: Comment[]): string {
  return comments.map((c, i) => `${i + 1}. [likes: ${c.likes}] ${c.text}`).join('\n');
}

/** Lightweight call #1: sentiment + keywords + summary. Shorter JSON output. */
export function buildCommentSentimentPrompt(input: CommentAnalysisInput): string {
  const commentTexts = formatComments(input.comments);

  return `Analyze these TikTok comments. Return ONLY valid JSON, no markdown.

## CONTEXT
Description: ${input.videoDescription || 'N/A'}
Hashtags: ${input.videoHashtags.join(', ') || 'None'}

## COMMENTS (${input.comments.length})
${commentTexts.slice(0, 4000)}

## RETURN THIS JSON
{
  "positive": <0-100>,
  "negative": <0-100>,
  "neutral": <0-100>,
  "mixed": <0-100>,
  "overallScore": <-1.0 to 1.0>,
  "topKeywords": [{"word": "keyword", "frequency": <number>}],
  "summary": "one paragraph summary in Chinese"
}`;
}

export function parseCommentSentimentResponse(json: string): Partial<CommentAnalysis> | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      sentimentDistribution: {
        positive: data.positive ?? 0,
        negative: data.negative ?? 0,
        neutral: data.neutral ?? 0,
        mixed: data.mixed ?? 0,
        overallScore: data.overallScore ?? 0,
      },
      topKeywords: Array.isArray(data.topKeywords) ? data.topKeywords.slice(0, 15) : [],
      summary: data.summary || '',
    };
  } catch {
    return null;
  }
}

/** Lightweight call #2: themes + questions + patterns. */
export function buildCommentThemesPrompt(input: CommentAnalysisInput): string {
  const commentTexts = formatComments(input.comments);

  return `Analyze these TikTok comments for themes, questions, and engagement patterns. Return ONLY valid JSON, no markdown.

## CONTEXT
Description: ${input.videoDescription || 'N/A'}

## COMMENTS (${input.comments.length})
${commentTexts.slice(0, 4000)}

## RETURN THIS JSON
{
  "themeClusters": [{"theme": "theme in Chinese", "count": <number>, "percentage": <number>, "representativeComments": ["1-2 examples"], "averageSentiment": <-1.0 to 1.0>}],
  "userQuestions": [{"commentId": "<index from list>", "question": "question in Chinese", "category": "product|usage|pricing|creator|content|other", "frequency": <number>, "isUnanswered": <boolean>}],
  "engagementPatterns": [{"pattern": "pattern in Chinese", "trigger": "what caused it in Chinese", "frequency": <number>, "significance": <0-100>}],
  "contentCorrelation": "how comments relate to video content, in Chinese"
}`;
}

export function parseCommentThemesResponse(json: string): Partial<CommentAnalysis> | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      themeClusters: Array.isArray(data.themeClusters) ? data.themeClusters.slice(0, 5) : [],
      userQuestions: Array.isArray(data.userQuestions) ? data.userQuestions : [],
      engagementPatterns: Array.isArray(data.engagementPatterns) ? data.engagementPatterns : [],
      contentCorrelation: data.contentCorrelation || '',
    };
  } catch {
    return null;
  }
}

// Keep old function for backward compatibility
export function buildCommentAnalysisPrompt(input: CommentAnalysisInput): string {
  const commentTexts = input.comments.map((c, i) => `${i + 1}. [likes: ${c.likes}] ${c.text}`).join('\n');

  return `You are a TikTok comment analyst. Analyze the following comments and return structured JSON.

## VIDEO CONTEXT
- Description: ${input.videoDescription || 'Not provided'}
- Hashtags: ${input.videoHashtags.join(', ') || 'None'}

## COMMENTS (${input.comments.length} total)
${commentTexts.slice(0, 5000)}

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
