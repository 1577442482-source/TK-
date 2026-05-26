import type { VideoMetrics } from '../types';

export function calculateMetrics(raw: {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
}): Omit<VideoMetrics, 'source'> & { source: 'manual' } {
  const { views, likes, shares, comments, saves } = raw;
  const totalEngagements = likes + comments + saves + shares;

  return {
    views,
    likes,
    shares,
    comments,
    saves,
    engagementRate: views > 0 ? (totalEngagements / views) * 100 : 0,
    viralCoefficient: views > 0 ? (shares / views) * 100 : 0,
    estimatedRetention: estimateRetention(views),
    source: 'manual' as const,
  };
}

function estimateRetention(_views: number): number[] {
  // Placeholder: typical TikTok retention curve
  return [100, 88, 75, 65, 58, 52, 47, 42, 38, 35];
}
