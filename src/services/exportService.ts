import type { VideoAnalysis } from '../types';

export function exportAnalysisAsJSON(analysis: VideoAnalysis): void {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `analysis-${analysis.id}.json`);
}

export function exportAnalysesAsJSON(analyses: VideoAnalysis[]): void {
  const blob = new Blob([JSON.stringify(analyses, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `analyses-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportAnalysisAsCSV(analysis: VideoAnalysis): void {
  const rows: string[] = [];
  rows.push('Field,Value');
  rows.push(`URL,${analysis.video.url}`);
  rows.push(`Creator,${analysis.video.creatorHandle || ''}`);
  rows.push(`Views,${analysis.metrics.views}`);
  rows.push(`Likes,${analysis.metrics.likes}`);
  rows.push(`Shares,${analysis.metrics.shares}`);
  rows.push(`Comments,${analysis.metrics.comments}`);
  rows.push(`Saves,${analysis.metrics.saves}`);
  rows.push(`Engagement Rate,${analysis.metrics.engagementRate.toFixed(2)}%`);
  rows.push(`Viral Coefficient,${analysis.metrics.viralCoefficient.toFixed(2)}%`);
  rows.push('--- Comments ---');
  if (analysis.commentAnalysis) {
    rows.push('Sentiment,Count');
    const sd = analysis.commentAnalysis.sentimentDistribution;
    rows.push(`Positive,${sd.positive}`);
    rows.push(`Negative,${sd.negative}`);
    rows.push(`Neutral,${sd.neutral}`);
    rows.push(`Mixed,${sd.mixed}`);
  }
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `analysis-${analysis.id}.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
