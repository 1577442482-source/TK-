import type { TimelineAnalysis } from '../../types';

export interface TimelineAnalysisInput {
  description?: string;
  hashtags: string[];
  duration: number;
  creatorHandle?: string;
  existingSegments?: { type: string; startTime: number; endTime: number; description: string }[];
}

export function buildTimelineAnalysisPrompt(input: TimelineAnalysisInput): string {
  const segmentHints = input.existingSegments?.length
    ? input.existingSegments.map((s, i) => `  ${i + 1}. [${s.type}] ${s.startTime}s-${s.endTime}s: ${s.description}`).join('\n')
    : 'No segments provided';

  return `You are a TikTok video timeline analyst. Break down this video into short time segments and describe what happens visually and audibly in each segment.

## VIDEO INFORMATION
- Creator: ${input.creatorHandle || 'Unknown'}
- Description/Caption: ${input.description || 'Not provided'}
- Hashtags: ${input.hashtags.join(', ') || 'None'}
- Duration: ${input.duration} seconds
- Known segments from content analysis:
${segmentHints}

## TASK
Divide this video into ${Math.max(3, Math.ceil(input.duration / 5))} time segments (roughly 3-5 seconds each, adjusted for content boundaries). For each segment, describe:
1. What's VISUALLY on screen (who/what, setting, camera angle, text overlays)
2. What's AUDIBLY happening (voiceover, music, sound effects)
3. The energy level and emotional tone

Return JSON with this exact structure:

{
  "segments": [{
    "startTime": 0,
    "endTime": 3,
    "visualDescription": "detailed visual description in Chinese",
    "audioDescription": "audio/voiceover description in Chinese",
    "onScreenText": ["visible text 1", "visible text 2"],
    "shotType": "close-up|medium|wide|over-the-shoulder|POV|split-screen|text-only|other",
    "energyLevel": 0-100,
    "dominantEmotion": "excitement|curiosity|surprise|humor|calm|urgency|inspiration|empathy|tension|neutral",
    "keyActions": ["action 1 in Chinese", "action 2 in Chinese"]
  }],
  "overallStructure": "one-paragraph summary of the complete timeline structure in Chinese, describing how the video flows from beginning to end",
  "keyMoments": [{
    "time": number (seconds),
    "description": "what happens at this moment in Chinese",
    "significance": "why this moment matters in Chinese"
  }]
}

Guidelines:
- Segments MUST cover the entire video from 0s to ${input.duration}s with no gaps
- Each segment should be 3-5 seconds (total ~${Math.max(3, Math.ceil(input.duration / 5))} segments)
- Visual descriptions should be specific: mention facial expressions, gestures, props, locations, colors, camera movement
- Audio descriptions should mention voice tone, background music mood, sound effects
- Mark key moments: the hook (first 1-3s), emotional peaks, reveals/surprises, call-to-action
- Use the description and hashtags to infer content — be specific and vivid, not generic

Return ONLY valid JSON, no markdown enclosure.`;
}

export function parseTimelineAnalysisResponse(json: string): TimelineAnalysis | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      segments: (data.segments || []).map((s: any) => ({
        startTime: s.startTime || 0,
        endTime: s.endTime || 0,
        visualDescription: s.visualDescription || '',
        audioDescription: s.audioDescription || '',
        onScreenText: s.onScreenText || [],
        shotType: s.shotType || '',
        energyLevel: s.energyLevel || 0,
        dominantEmotion: s.dominantEmotion || '',
        keyActions: s.keyActions || [],
      })),
      overallStructure: data.overallStructure || '',
      keyMoments: (data.keyMoments || []).map((m: any) => ({
        time: m.time || 0,
        description: m.description || '',
        significance: m.significance || '',
      })),
    };
  } catch {
    return null;
  }
}
