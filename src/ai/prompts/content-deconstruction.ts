import type { ContentDeconstruction, VideoSegment } from '../../types';

export interface ContentDeconstructionInput {
  description?: string;
  hashtags: string[];
  duration: number;
  segments: VideoSegment[];
  creatorHandle?: string;
}

export function buildContentDeconstructionPrompt(input: ContentDeconstructionInput): string {
  return `You are a TikTok video content analyst. Analyze the following video and return a structured JSON breakdown.

## VIDEO INFORMATION
- Creator: ${input.creatorHandle || 'Unknown'}
- Description/Caption: ${input.description || 'Not provided'}
- Hashtags: ${input.hashtags.join(', ') || 'None'}
- Duration: ${input.duration} seconds
- User-provided segments:
${input.segments.map((s, i) => `  ${i + 1}. [${s.type}] ${s.startTime}s-${s.endTime}s: ${s.description} (pacing: ${s.pacing})`).join('\n') || 'No segments provided'}

## TASK
Analyze this video's content structure and return JSON with this exact structure:

{
  "segments": [{
    "type": "hook|intro|body|cta|outro|transition",
    "startTime": number (seconds),
    "endTime": number (seconds),
    "description": "detailed segment description in Chinese",
    "keyElements": ["visual element", "audio cue", "text overlay"],
    "pacing": "fast|normal|slow"
  }],
  "hookAnalysis": {
    "hookType": "question|statistic|problem|story|visual|trend|challenge|other",
    "firstWords": "first spoken words or text visible",
    "durationSeconds": number,
    "effectiveness": 0-100 (score),
    "reasoning": "why this hook works or doesn't, in Chinese"
  },
  "emotionalArc": {
    "points": [{
      "timestamp": number (seconds),
      "emotion": "curiosity|surprise|excitement|trust|anticipation|joy|sadness|fear|anger|disgust",
      "intensity": 0-100,
      "trigger": "what caused this emotion, in Chinese"
    }],
    "arcType": "rising|wave|transformation|sawtooth|flat|valley",
    "peakIntensity": 0-100,
    "dominantEmotion": "most frequent emotion"
  },
  "keyMessages": [{
    "text": "key message text in Chinese",
    "importance": 0-100,
    "category": "value_proposition|urgency|social_proof|education|entertainment|emotional_appeal",
    "appearsAt": number (seconds)
  }],
  "pacingAnalysis": {
    "overallRhythm": "fast|moderate|slow",
    "cutsPerMinute": number (estimate),
    "averageSegmentDuration": number (seconds),
    "hasPacingVariation": boolean,
    "energyCurve": "description of energy over time, in Chinese"
  },
  "hashtagAnalysis": {
    "hashtags": ["string array of analyzed hashtags"],
    "totalReach": number (estimated total audience reach),
    "categoryRelevance": 0-100,
    "trendingScore": 0-100,
    "recommendations": ["hashtag suggestions in Chinese"]
  },
  "scriptLength": number (estimated word count),
  "ttr": number (text-to-speech ratio estimate, 0-100)
}

Return ONLY valid JSON, no markdown enclosure. Analyze deeply and provide specific, actionable insights in Chinese.`;
}

export function parseContentDeconstructionResponse(json: string): ContentDeconstruction | null {
  try {
    // Handle AI SDK response format or direct JSON
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    // Ensure all required fields exist with defaults
    return {
      segments: data.segments || [],
      hookAnalysis: data.hookAnalysis || { hookType: '', firstWords: '', durationSeconds: 0, effectiveness: 0, reasoning: '' },
      emotionalArc: data.emotionalArc || { points: [], arcType: '', peakIntensity: 0, dominantEmotion: '' },
      keyMessages: data.keyMessages || [],
      pacingAnalysis: data.pacingAnalysis || { overallRhythm: 'moderate', cutsPerMinute: 0, averageSegmentDuration: 0, hasPacingVariation: false, energyCurve: '' },
      hashtagAnalysis: data.hashtagAnalysis || { hashtags: [], totalReach: 0, categoryRelevance: 0, trendingScore: 0, recommendations: [] },
      scriptLength: data.scriptLength || 0,
      ttr: data.ttr || 0,
    };
  } catch {
    return null;
  }
}
