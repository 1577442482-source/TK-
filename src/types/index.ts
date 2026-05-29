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
  thumbnailUrl?: string;
  dynamicCover?: string;
  musicTitle?: string;
  musicAuthor?: string;
  musicOriginal?: boolean;
  creatorFollowers?: number;
  creatorFollowing?: number;
  creatorHearts?: number;
  creatorVideos?: number;
  videoWidth?: number;
  videoHeight?: number;
  contentCategories?: string[];
  creatorVerified?: boolean;
  videoDownloadUrl?: string;
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
// Visual Analysis
// ============================================================

export interface ScriptBreakdown {
  scriptStructure: ScriptStructure;
  segmentScripts: SegmentScript[];
  overallScore: ScriptScore;
}

export interface ScriptStructure {
  hookType: string;
  hookScript: string;
  narrativeArc: string;
  keyLines: string[];
  copywritingTechniques: string[];
  toneAndVoice: string;
}

export interface SegmentScript {
  segment: string;
  purpose: string;
  scriptText: string;
  technique: string;
  effectiveness: number;
}

export interface ScriptScore {
  hookStrength: number;
  structureClarity: number;
  emotionalAppeal: number;
  callToAction: number;
  overall: number;
}

export interface ShotAnalysis {
  shotBreakdown: ShotItem[];
  visualRhythm: VisualRhythm;
  visualStructure: ShotVisualStructure;
}

export interface ShotItem {
  shotNumber: number;
  startTime: number;
  endTime: number;
  shotType: string;
  cameraMovement: string;
  composition: string;
  transition: string;
  visualSubject: string;
  onScreenText: string[];
  energyLevel: number;
}

export interface VisualRhythm {
  avgShotDuration: number;
  pacePattern: string;
  editingStyle: string;
  transitionPattern: string;
}

export interface ShotVisualStructure {
  openingVisual: string;
  climaxVisual: string;
  closingVisual: string;
  visualContinuity: number;
}

// ============================================================
// Timeline Analysis
// ============================================================

export interface TimelineSegment {
  startTime: number;
  endTime: number;
  visualDescription: string;
  audioDescription: string;
  onScreenText: string[];
  shotType: string;
  energyLevel: number;
  dominantEmotion: string;
  keyActions: string[];
}

export interface TimelineAnalysis {
  segments: TimelineSegment[];
  overallStructure: string;
  keyMoments: { time: number; description: string; significance: string }[];
}

// ============================================================
// AI Insights
// ============================================================

// ============================================================
// Engagement Trend
// ============================================================

export interface CommentTimeRef {
  time: number;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PredictedPeak {
  time: number;
  energyScore: number;
  sources: string[];
  reason: string;
}

export interface EngagementTrend {
  commentTimeReferences: CommentTimeRef[];
  predictedPeaks: PredictedPeak[];
  engagementCurve: string;
  heatmapDescription: string;
}

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
  engagementTrend: EngagementTrend | null;
  scriptBreakdown: ScriptBreakdown | null;
  shotAnalysis: ShotAnalysis | null;
  timelineAnalysis: TimelineAnalysis | null;
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
  provider: 'anthropic' | 'openai' | 'google' | 'openrouter' | 'deepseek' | 'doubao' | 'onetoken' | 'comeu';
  keyLastFour: string;
  isValid: boolean;
  verifiedAt?: string;
}

export interface ModelPreferences {
  deconstructionModel: string;
  commentModel: string;
  insightModel: string;
  scriptShotModel: string;
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
  deconstructionModel: 'gpt-5.1',
  commentModel: 'gpt-5.1',
  insightModel: 'gpt-5.1',
  scriptShotModel: 'gemini-3-flash-preview',
  temperature: 0.3,
};

export const ANALYSIS_STEPS = [
  { key: 'script-shot', label: '脚本拆解+分镜分析', progress: 12 },
  { key: 'deconstruction', label: '内容拆解', progress: 25 },
  { key: 'timeline', label: '时间线分析', progress: 38 },
  { key: 'comment', label: '评论分析', progress: 55 },
  { key: 'insight', label: '洞察生成', progress: 85 },
  { key: 'why', label: '综合归因', progress: 100 },
] as const;
