import type { Comment } from '../types';

interface ExtractedTimeRef {
  time: number;
  text: string;
}

/**
 * Extract timestamp references from raw comments.
 * Matches patterns like "0:23", "1:45", "23秒", "1分23秒", "at 23s"
 */
export function extractCommentTimestamps(
  comments: Comment[],
  durationSec: number,
): ExtractedTimeRef[] {
  const patterns = [
    // m:ss or mm:ss at word boundaries
    /\b(\d{1,2}):(\d{2})\b/g,
    // X分Y秒
    /(\d+)\s*分\s*(\d+)\s*秒/g,
    // X秒 (standalone, only when not preceded by 分)
    /(?<![分\d])(\d+)\s*秒/g,
    // at Xs
    /\bat\s+(\d+)\s*s\b/gi,
  ];

  const results: ExtractedTimeRef[] = [];

  for (const comment of comments) {
    const text = comment.text || '';
    if (!text) continue;

    // Pattern 1: m:ss
    for (const match of text.matchAll(/(\d{1,2}):(\d{2})/g)) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSec = minutes * 60 + seconds;
      if (totalSec <= durationSec) {
        results.push({ time: totalSec, text });
      }
    }

    // Pattern 2: X分Y秒
    for (const match of text.matchAll(/(\d+)\s*分\s*(\d+)\s*秒/g)) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSec = minutes * 60 + seconds;
      if (totalSec <= durationSec) {
        results.push({ time: totalSec, text });
      }
    }

    // Pattern 3: standalone X秒 (not preceded by 分)
    for (const match of text.matchAll(/(?<![分\d])(\d{2,})\s*秒/g)) {
      const totalSec = parseInt(match[1], 10);
      if (totalSec >= 2 && totalSec <= durationSec) {
        results.push({ time: totalSec, text });
      }
    }

    // Pattern 4: "at Xs"
    for (const match of text.matchAll(/\bat\s+(\d+)\s*s\b/gi)) {
      const totalSec = parseInt(match[1], 10);
      if (totalSec <= durationSec) {
        results.push({ time: totalSec, text });
      }
    }
  }

  return results;
}

/**
 * Merge nearby timestamps (±2s) and return top references with counts.
 */
export function clusterCommentTimestamps(
  refs: ExtractedTimeRef[],
): { time: number; count: number; sampleTexts: string[] }[] {
  const buckets: Map<number, { count: number; samples: string[] }> = new Map();

  for (const ref of refs) {
    const bucketKey = Math.round(ref.time / 2) * 2; // cluster to nearest 2s
    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.count++;
      if (existing.samples.length < 3) existing.samples.push(ref.text);
    } else {
      buckets.set(bucketKey, { count: 1, samples: [ref.text] });
    }
  }

  return Array.from(buckets.entries())
    .map(([time, data]) => ({ time, count: data.count, sampleTexts: data.samples }))
    .sort((a, b) => b.count - a.count);
}
