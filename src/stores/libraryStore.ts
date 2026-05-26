import { create } from 'zustand';
import type { VideoAnalysis } from '../types';
import { useAnalysisStore } from './analysisStore';

type SortBy = 'date' | 'engagement' | 'views' | 'sentiment';

interface LibraryStore {
  searchQuery: string;
  sortBy: SortBy;
  sortDirection: 'asc' | 'desc';

  setSearchQuery: (q: string) => void;
  setSortBy: (s: SortBy) => void;
  toggleSortDirection: () => void;

  getFilteredVideos: () => VideoAnalysis[];
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  searchQuery: '',
  sortBy: 'date',
  sortDirection: 'desc',

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortBy: (s) => set({ sortBy: s }),
  toggleSortDirection: () => set((s) => ({ sortDirection: s.sortDirection === 'desc' ? 'asc' : 'desc' })),

  getFilteredVideos: () => {
    const { analyses } = useAnalysisStore.getState();
    const { searchQuery, sortBy, sortDirection } = get();
    let filtered = [...analyses];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.video.url.toLowerCase().includes(q) ||
          (a.video.creatorHandle || '').toLowerCase().includes(q) ||
          a.video.hashtags.some((t) => t.toLowerCase().includes(q)) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    const mult = sortDirection === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'engagement':
          return (a.metrics.engagementRate - b.metrics.engagementRate) * mult;
        case 'views':
          return (a.metrics.views - b.metrics.views) * mult;
        case 'sentiment':
          return (
            ((a.commentAnalysis?.sentimentDistribution.overallScore ?? 0) -
              (b.commentAnalysis?.sentimentDistribution.overallScore ?? 0)) *
            mult
          );
        default:
          return a.createdAt.localeCompare(b.createdAt) * mult;
      }
    });

    return filtered;
  },
}));
