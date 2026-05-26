import { create } from 'zustand';
import type { VideoAnalysis, VideoSource, VideoMetrics, Comment } from '../types';
import * as storage from '../services/storage';
import { generateId } from '../utils/formatters';

interface AnalysisStore {
  analyses: VideoAnalysis[];
  currentAnalysisId: string | null;
  loaded: boolean;

  loadAllAnalyses: () => Promise<void>;
  getCurrentAnalysis: () => VideoAnalysis | undefined;
  createAnalysis: (video: VideoSource, metrics: VideoMetrics, comments: Comment[]) => string;
  updateAnalysis: (id: string, partial: Partial<VideoAnalysis>) => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  deleteAllAnalyses: () => Promise<void>;
  setCurrentAnalysis: (id: string | null) => void;
  duplicateAnalysis: (id: string) => string;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  analyses: [],
  currentAnalysisId: null,
  loaded: false,

  loadAllAnalyses: async () => {
    const analyses = await storage.getAllAnalyses();
    set({ analyses, loaded: true });
  },

  getCurrentAnalysis: () => {
    const { analyses, currentAnalysisId } = get();
    return analyses.find((a) => a.id === currentAnalysisId);
  },

  createAnalysis: (video, metrics, comments) => {
    const id = generateId();
    const now = new Date().toISOString();
    const analysis: VideoAnalysis = {
      id,
      video,
      metrics,
      contentDeconstruction: null,
      rawComments: comments,
      commentAnalysis: comments.length > 0 ? {
        totalComments: comments.length,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 100, mixed: 0, overallScore: 0 },
        themeClusters: [],
        userQuestions: [],
        engagementPatterns: [],
        topKeywords: [],
        contentCorrelation: '',
        summary: '',
      } : null,
      insights: [],
      whyAnalysis: null,
      status: 'draft',
      aiMeta: null,
      tags: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    set((s) => ({ analyses: [analysis, ...s.analyses], currentAnalysisId: id }));
    storage.saveAnalysis(analysis);
    return id;
  },

  updateAnalysis: async (id, partial) => {
    set((s) => ({
      analyses: s.analyses.map((a) =>
        a.id === id ? { ...a, ...partial, updatedAt: new Date().toISOString() } : a
      ),
    }));
    const updated = get().analyses.find((a) => a.id === id);
    if (updated) await storage.saveAnalysis(updated);
  },

  deleteAnalysis: async (id) => {
    await storage.deleteAnalysis(id);
    set((s) => ({
      analyses: s.analyses.filter((a) => a.id !== id),
      currentAnalysisId: s.currentAnalysisId === id ? null : s.currentAnalysisId,
    }));
  },

  deleteAllAnalyses: async () => {
    await storage.deleteAllAnalyses();
    set({ analyses: [], currentAnalysisId: null });
  },

  setCurrentAnalysis: (id) => set({ currentAnalysisId: id }),

  duplicateAnalysis: (id) => {
    const original = get().analyses.find((a) => a.id === id);
    if (!original) return '';
    const newId = generateId();
    const copy: VideoAnalysis = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      tags: [...original.tags],
    };
    set((s) => ({ analyses: [copy, ...s.analyses] }));
    storage.saveAnalysis(copy);
    return newId;
  },
}));
