import { create } from 'zustand';
import type { ComparisonResult } from '../types';
import { useAnalysisStore } from './analysisStore';

interface CompareStore {
  selectedIds: string[];
  comparisonResult: ComparisonResult | null;

  addToComparison: (id: string) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
  runComparison: () => void;
  isSelected: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  selectedIds: [],
  comparisonResult: null,

  addToComparison: (id) =>
    set((s) => {
      if (s.selectedIds.length >= 4 || s.selectedIds.includes(id)) return s;
      return { selectedIds: [...s.selectedIds, id], comparisonResult: null };
    }),

  removeFromComparison: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.filter((i) => i !== id),
      comparisonResult: null,
    })),

  clearComparison: () => set({ selectedIds: [], comparisonResult: null }),

  runComparison: () => {
    const { selectedIds } = get();
    const { analyses } = useAnalysisStore.getState();
    const selected = analyses.filter((a) => selectedIds.includes(a.id));
    if (selected.length < 2) return;

    const metricsComparison = [
      { metric: '播放量', key: 'views' as const },
      { metric: '点赞数', key: 'likes' as const },
      { metric: '分享数', key: 'shares' as const },
      { metric: '评论数', key: 'comments' as const },
      { metric: '收藏数', key: 'saves' as const },
      { metric: '互动率', key: 'engagementRate' as const },
      { metric: '传播系数', key: 'viralCoefficient' as const },
    ].map(({ metric, key }) => {
      const values: Record<string, number> = {};
      const avg = selected.reduce((sum, a) => sum + a.metrics[key], 0) / selected.length;
      const deltas: Record<string, number> = {};
      for (const a of selected) {
        values[a.id] = a.metrics[key];
        deltas[a.id] = avg > 0 ? ((a.metrics[key] - avg) / avg) * 100 : 0;
      }
      return { metric, values, deltas };
    });

    set({
      comparisonResult: {
        analysisIds: selectedIds,
        metricsComparison,
        contentOverlap: { sharedPatterns: [], uniqueElements: {} },
        sentimentComparison: selected
          .filter((a) => a.commentAnalysis)
          .map((a) => a.commentAnalysis!.sentimentDistribution),
        insightOverlap: { commonFactors: [], uniqueFactors: {} },
        recommendation: '',
      },
    });
  },

  isSelected: (id) => get().selectedIds.includes(id),
}));
