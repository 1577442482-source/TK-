// ============================================================
// Video Source & Metadata
// ============================================================

export interface VideoSource {
  url: string;
  creatorHandle?: string;
  creatorName?: string;
  description?: string;
  hashtags: string[];
  soundOriginal?: string;
  postedAt?: string;
  duration: number; // seconds
  isManualInput: boolean;
}

// ============================================================
// Performance Metrics
// ============================================================

export interface VideoMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  engagementRate: number;
  viralCoefficient: number;
  estimatedRetention: number[];
  source: 'manual' | 'api';
}

// ============================================================
// Content Deconstruction
// ============================================================

export type SegmentType = 'hook' | 'intro' | 'body' | 'cta' | 'outro' | 'transition';

export interface VideoSegment {
  id: string;
  type: SegmentType;
  startTime: number;
  endTime: number;
  description: string;
  keyElements: string[];
  pacing: 'fast' | 'normal' | 'slow';
}

export interface HookAnalysis {
  hookType: string;
  firstWords: string;
  durationSeconds: number;
  effectiveness: number; // 0-100
  reasoning: string;
}

export interface EmotionalPoint {
  timestamp: number;
  emotion: string;
  intensity: number; // 0-100
  trigger: string;
}

export interface EmotionalArc {
  points: EmotionalPoint[];
  arcType: string;
  peakIntensity: number;
  dominantEmotion: string;
}

export interface KeyMessage {
  id: string;
  text: string;
  importance: number; // 0-100
  category: string;
  appearsAt: number;
}

export interface PacingAnalysis {
  overallRhythm: 'fast' | 'moderate' | 'slow';
  cutsPerMinute: number;
  averageSegmentDuration: number;
  hasPacingVariation: boolean;
  energyCurve: string;
}

export interface HashtagAnalysis {
  hashtags: string[];
  totalReach: number;
  categoryRelevance: number; // 0-100
  trendingScore: number; // 0-100
  recommendations: string[];
}

export interface ContentDeconstruction {
  segments: VideoSegment[];
  hookAnalysis: HookAnalysis;
  emotionalArc: EmotionalArc;
  keyMessages: KeyMessage[];
  pacingAnalysis: PacingAnalysis;
  hashtagAnalysis: HashtagAnalysis;
  scriptLength: number;
  ttr: number;
}

// ============================================================
// Comment Analysis
// ============================================================

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface Comment {
  id: string;
  text: string;
  username?: string;
  likes: number;
  postedAt?: string;
  sentiment: SentimentLabel;
  sentimentScore: number; // -1.0 to 1.0
  themes: string[];
  isQuestion: boolean;
  questionText?: string;
  engagementType?: string;
  replyCount?: number;
}

export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
  overallScore: number;
}

export interface ThemeCluster {
  theme: string;
  count: number;
  percentage: number;
  representativeComments: string[];
  averageSentiment: number;
}

export interface UserQuestion {
  commentId: string;
  question: string;
  category: string;
  frequency: number;
  isUnanswered: boolean;
}

export interface EngagementPattern {
  pattern: string;
  trigger: string;
  frequency: number;
  significance: number; // 0-100
}

export interface CommentAnalysis {
  totalComments: number;
  sentimentDistribution: SentimentDistribution;
  themeClusters: ThemeCluster[];
  userQuestions: UserQuestion[];
  engagementPatterns: EngagementPattern[];
  topKeywords: { word: string; frequency: number }[];
  contentCorrelation: string;
  summary: string;
}

// ============================================================
// AI Insights
// ============================================================

export type InsightCategory =
  | 'success_factor'
  | 'replicable_pattern'
  | 'optimization'
  | 'warning'
  | 'content_gap';

export interface AIInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  confidence: number; // 0-100
  supportingData: string[];
  actionability: 'immediate' | 'short_term' | 'strategic';
  relatedSegments?: string[];
  priority: number;
}

export interface SuccessFactor {
  factor: string;
  impact: 'critical' | 'high' | 'moderate' | 'low';
  evidence: string[];
  category: string;
}

export interface WhyAnalysis {
  primarySuccessFactors: SuccessFactor[];
  whyItWorked: string;
  replicableElements: string[];
  riskFactors: string[];
  creatorRecommendations: string[];
}

export interface AIPromptMeta {
  model: string;
  provider: 'anthropic' | 'openai' | 'google' | 'custom';
  tokensUsed: number;
  promptVersion: string;
  latencyMs: number;
}

// ============================================================
// Top-Level Analysis
// ============================================================

export type AnalysisStatus =
  | 'draft'
  | 'analyzing'
  | 'complete'
  | 'partial'
  | 'error';

export interface VideoAnalysis {
  id: string;
  video: VideoSource;
  metrics: VideoMetrics;
  contentDeconstruction: ContentDeconstruction | null;
  commentAnalysis: CommentAnalysis | null;
  rawComments: Comment[];
  insights: AIInsight[];
  whyAnalysis: WhyAnalysis | null;
  status: AnalysisStatus;
  aiMeta: AIPromptMeta | null;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================================
// Comparison
// ============================================================

export interface ComparisonResult {
  analysisIds: string[];
  metricsComparison: {
    metric: string;
    values: Record<string, number>;
    deltas: Record<string, number>;
  }[];
  contentOverlap: {
    sharedPatterns: string[];
    uniqueElements: Record<string, string[]>;
  };
  sentimentComparison: SentimentDistribution[];
  insightOverlap: {
    commonFactors: string[];
    uniqueFactors: Record<string, string[]>;
  };
  recommendation: string;
}

// ============================================================
// Pattern Library
// ============================================================

export interface ReplicablePattern {
  id: string;
  name: string;
  category: string;
  description: string;
  evidenceCount: number;
  averageImpact: number; // 0-100
  exampleVideoIds: string[];
  exampleUrls: string[];
  bestFor: string[];
  confidence: number;
}

// ============================================================
// Settings
// ============================================================

export interface ApiKeyEntry {
  id: string;
  provider: 'anthropic' | 'openai' | 'google';
  keyLastFour: string;
  isValid: boolean;
  verifiedAt?: string;
}

export interface ModelPreferences {
  deconstructionModel: string;
  commentModel: string;
  insightModel: string;
  temperature: number;
}

// ============================================================
// Constants
// ============================================================

export const SEGMENT_TYPES: { value: SegmentType; label: string; color: string }[] = [
  { value: 'hook', label: '钩子 Hook', color: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'intro', label: '开场 Intro', color: 'bg-teal-500/20 text-teal-300' },
  { value: 'body', label: '主体 Body', color: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'cta', label: '行动号召 CTA', color: 'bg-amber-500/20 text-amber-300' },
  { value: 'outro', label: '结尾 Outro', color: 'bg-slate-500/20 text-slate-300' },
  { value: 'transition', label: '过渡 Transition', color: 'bg-purple-500/20 text-purple-300' },
];

export const SENTIMENT_LABELS: Record<SentimentLabel, string> = {
  positive: '正面',
  negative: '负面',
  neutral: '中性',
  mixed: '混合',
};

export const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-slate-400',
  mixed: 'text-amber-400',
};

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  success_factor: '成功因素',
  replicable_pattern: '可复制模式',
  optimization: '优化建议',
  warning: '注意事项',
  content_gap: '内容缺口',
};

export const DEFAULT_MODEL_PREFERENCES: ModelPreferences = {
  deconstructionModel: 'claude-sonnet-4-6',
  commentModel: 'claude-sonnet-4-6',
  insightModel: 'claude-sonnet-4-6',
  temperature: 0.3,
};

export const ANALYSIS_STEPS = [
  { key: 'content', label: '内容拆解', progress: 25 },
  { key: 'comment', label: '评论分析', progress: 50 },
  { key: 'insight', label: '洞察生成', progress: 75 },
  { key: 'why', label: '综合归因', progress: 100 },
] as const;
