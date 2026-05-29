const PYTHON_API = 'http://127.0.0.1:8765';

export interface VideoFrame {
  base64: string;
  mimeType: string;
}

export interface FrameExtractionResult {
  frames: VideoFrame[];
  duration: number;
}

const frameCache = new Map<string, FrameExtractionResult>();

export async function extractVideoFrames(
  tiktokUrl: string,
  numFrames: number = 10,
  videoDownloadUrl?: string,
  duration?: number
): Promise<FrameExtractionResult | null> {
  const cacheKey = `${tiktokUrl}::${numFrames}`;
  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  try {
    let apiUrl: string;
    if (videoDownloadUrl) {
      apiUrl = `${PYTHON_API}/api/extract-frames?downloadUrl=${encodeURIComponent(videoDownloadUrl)}&frames=${numFrames}&duration=${duration || 30}`;
    } else {
      apiUrl = `${PYTHON_API}/api/extract-frames?url=${encodeURIComponent(tiktokUrl)}&frames=${numFrames}`;
    }

    const resp = await fetch(apiUrl);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json.success) {
      console.warn('Frame extraction failed:', json.error);
      return null;
    }
    const result: FrameExtractionResult = {
      frames: json.frames || [],
      duration: json.duration || 0,
    };
    if (result.frames.length > 0) {
      frameCache.set(cacheKey, result);
      return result;
    }
    return null;
  } catch (err) {
    console.error('Frame extraction error:', err);
    return null;
  }
}

export function clearFrameCache() {
  frameCache.clear();
}
