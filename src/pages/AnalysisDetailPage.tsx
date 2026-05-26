import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3, MessageCircle, Lightbulb, TrendingUp, FileText,
  ArrowLeft, Download, Trash2, Copy,
  Zap, Target, Shield, Star, AlertTriangle, ThumbsUp, ThumbsDown,
  MessageSquare, HelpCircle, Tag,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProgressBar from '../components/ui/ProgressBar';
import { useState } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { useUIStore } from '../stores/uiStore';
import { useAIStore } from '../stores/aiStore';
import { exportAnalysisAsJSON, exportAnalysisAsCSV } from '../services/exportService';
import { formatNumber, formatDuration } from '../utils/formatters';
import { SEGMENT_TYPES, INSIGHT_CATEGORY_LABELS } from '../types';
import type { AIInsight, WhyAnalysis, CommentAnalysis, ContentDeconstruction, VideoSource, VideoAnalysis } from '../types';

const TABS = [
  { key: 'performance', label: '数据总览', icon: TrendingUp },
  { key: 'content', label: '内容拆解', icon: BarChart3 },
  { key: 'comment', label: '评论分析', icon: MessageCircle },
  { key: 'insight', label: 'AI洞察', icon: Lightbulb },
  { key: 'raw', label: '原始数据', icon: FileText },
] as const;

export default function AnalysisDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const analysisId = params.analysisId as string;
  const { analyses, deleteAnalysis, duplicateAnalysis } = useAnalysisStore();
  const { activeTab, setActiveTab } = useUIStore();
  const [showDelete, setShowDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const analysis = analyses.find(a => a.id === analysisId);

  if (!analysis) {
    return (
      <PageTransition>
        <div className="p-6">
          <EmptyState title="分析不存在" description="该分析可能已被删除" />
        </div>
      </PageTransition>
    );
  }

  const handleDelete = async () => {
    await deleteAnalysis(analysis.id);
    navigate('/library');
  };

  const handleDuplicate = () => {
    const newId = duplicateAnalysis(analysis.id);
    navigate(`/analyze/${newId}`);
  };

  const { metrics, video, contentDeconstruction, commentAnalysis } = analysis;

  return (
    <PageTransition>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/library')} className="text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-200">
                {video.creatorHandle ? `@${video.creatorHandle}` : '未命名分析'}
              </h1>
              <p className="text-sm text-slate-400">
                {video.url || '手动输入'} · 创建于 {new Date(analysis.createdAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDuplicate} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1">
              <Copy size={14} /> 复制
            </button>
            <button onClick={() => setShowExport(true)} className="px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1">
              <Download size={14} /> 导出
            </button>
            <button onClick={() => setShowDelete(true)} className="px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1">
              <Trash2 size={14} /> 删除
            </button>
          </div>
        </div>

        {/* Export menu */}
        {showExport && (
          <div className="mb-4 glass-card rounded-xl p-4 flex gap-3 animate-fade-in">
            <button onClick={() => { exportAnalysisAsJSON(analysis); setShowExport(false); }} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors">导出 JSON</button>
            <button onClick={() => { exportAnalysisAsCSV(analysis); setShowExport(false); }} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 rounded-lg text-white transition-colors">导出 CSV</button>
            <button onClick={() => setShowExport(false)} className="px-4 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg transition-colors">取消</button>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 stagger-children">
          {[
            { label: '播放量', value: formatNumber(metrics.views), color: 'text-slate-200' },
            { label: '点赞数', value: formatNumber(metrics.likes), color: 'text-slate-200' },
            { label: '互动率', value: metrics.engagementRate.toFixed(2) + '%', color: 'text-emerald-400' },
            { label: '传播系数', value: metrics.viralCoefficient.toFixed(2) + '%', color: 'text-teal-400' },
            { label: '分享数', value: formatNumber(metrics.shares), color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card rounded-xl p-4 card-hover-lift animate-fade-in-up">
              <div className="text-xs text-slate-400 mb-1">{label}</div>
              <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-white/5 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'performance' && <PerformanceTab metrics={metrics} />}
          {activeTab === 'content' && <ContentTab deconstruction={contentDeconstruction} video={video} />}
          {activeTab === 'comment' && <CommentTab analysis={commentAnalysis} />}
          {activeTab === 'insight' && <InsightTab analysis={analysis} />}
          {activeTab === 'raw' && <RawTab analysis={analysis} />}
        </div>

        <ConfirmDialog
          open={showDelete}
          title="删除分析"
          message="确定要删除这条分析吗？此操作不可撤销。"
          confirmLabel="删除"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          danger
        />
      </div>
    </PageTransition>
  );
}

// ---- Sub-tab components ----

function PerformanceTab({ metrics }: { metrics: { views: number; likes: number; shares: number; comments: number; saves: number; engagementRate: number; viralCoefficient: number } }) {
  const engagementScore = metrics.engagementRate > 10 ? '高互动' : metrics.engagementRate > 5 ? '中等互动' : '低互动';
  const viralScore = metrics.viralCoefficient > 5 ? '高传播' : metrics.viralCoefficient > 2 ? '中等传播' : '低传播';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">指标详情</h3>
        <div className="space-y-3">
          {[
            { label: '播放量', value: formatNumber(metrics.views) },
            { label: '点赞数', value: formatNumber(metrics.likes) },
            { label: '点赞率', value: (metrics.views > 0 ? (metrics.likes / metrics.views * 100).toFixed(2) : '0') + '%' },
            { label: '分享数', value: formatNumber(metrics.shares) },
            { label: '分享率', value: (metrics.views > 0 ? (metrics.shares / metrics.views * 100).toFixed(2) : '0') + '%' },
            { label: '评论数', value: formatNumber(metrics.comments) },
            { label: '收藏数', value: formatNumber(metrics.saves) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-white/5">
              <span className="text-sm text-slate-400">{label}</span>
              <span className="text-sm font-medium tabular-nums text-slate-200">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">互动率</h3>
          <div className="text-3xl font-bold text-emerald-400 tabular-nums">{metrics.engagementRate.toFixed(2)}%</div>
          <p className="text-xs text-slate-400 mt-1">{engagementScore} · 互动率 = (点赞+评论+收藏+分享) / 播放量</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">传播系数</h3>
          <div className="text-3xl font-bold text-teal-400 tabular-nums">{metrics.viralCoefficient.toFixed(2)}%</div>
          <p className="text-xs text-slate-400 mt-1">{viralScore} · 传播系数 = 分享数 / 播放量</p>
        </div>
      </div>
    </div>
  );
}

function ContentTab({ deconstruction, video }: { deconstruction: ContentDeconstruction | null; video: VideoSource }) {
  const { isAnalyzing, currentStep } = useAIStore();
  const isAnalyzingContent = isAnalyzing && currentStep === 'deconstruction';

  if (isAnalyzingContent) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <ProgressBar value={25} label="AI正在拆解视频内容..." />
      </div>
    );
  }

  if (!deconstruction) {
    return <EmptyState title="暂无内容拆解数据" description="点击「开始分析」后 AI 将自动拆解视频内容结构" />;
  }

  const { hookAnalysis, emotionalArc, pacingAnalysis, hashtagAnalysis, segments, keyMessages } = deconstruction;

  return (
    <div className="space-y-6">
      {/* Hook Analysis */}
      {hookAnalysis.hookType && (
        <div className="glass-card rounded-xl p-5 card-hover-lift">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-300">钩子分析</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <div className="text-xs text-slate-500">钩子类型</div>
              <div className="text-sm font-medium text-slate-200">{hookAnalysis.hookType}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">时长</div>
              <div className="text-sm font-medium text-slate-200">{hookAnalysis.durationSeconds}秒</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">有效性</div>
              <div className="text-sm font-bold text-emerald-400">{hookAnalysis.effectiveness}/100</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">开场词</div>
              <div className="text-sm font-medium text-slate-200 truncate">{hookAnalysis.firstWords || '—'}</div>
            </div>
          </div>
          {hookAnalysis.reasoning && <p className="text-sm text-slate-400">{hookAnalysis.reasoning}</p>}
        </div>
      )}

      {/* Segments Timeline */}
      {segments.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">分段时间线</h3>
          <div className="space-y-2">
            {segments.map((seg, i) => {
              const typeInfo = SEGMENT_TYPES.find(t => t.value === seg.type);
              const totalDuration = video.duration || (segments.length > 0 ? segments[segments.length - 1].endTime : 1);
              const width = totalDuration > 0 ? ((seg.endTime - seg.startTime) / totalDuration * 100) : 10;
              return (
                <div key={seg.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-5">{i + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${typeInfo?.color || 'bg-slate-500/20 text-slate-300'}`}>
                    {typeInfo?.label || seg.type}
                  </span>
                  <div className="flex-1 h-8 bg-white/[0.02] rounded relative">
                    <div
                      className={`absolute inset-y-0 rounded ${seg.pacing === 'fast' ? 'bg-emerald-500/20' : seg.pacing === 'slow' ? 'bg-amber-500/20' : 'bg-slate-500/20'}`}
                      style={{ width: `${Math.max(width, 3)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right tabular-nums shrink-0">
                    {formatDuration(seg.startTime)}-{formatDuration(seg.endTime)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emotional Arc */}
      {emotionalArc.points.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-300">情感弧线</h3>
            <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded text-xs">{emotionalArc.arcType}</span>
            <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded text-xs">主导情绪: {emotionalArc.dominantEmotion}</span>
          </div>
          <div className="flex items-end gap-1 h-32">
            {emotionalArc.points.map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-teal-500/30 to-teal-400/60 rounded-t"
                  style={{ height: `${p.intensity}%` }}
                />
                <span className="text-[10px] text-slate-500">{formatDuration(p.timestamp)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {emotionalArc.points.map((p, i) => (
              <span key={i} className="px-2 py-0.5 bg-white/5 text-slate-400 rounded text-[10px]" title={p.trigger}>
                {p.emotion}({p.intensity})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pacing + Hashtag */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pacingAnalysis.overallRhythm && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">节奏分析</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">整体节奏</span><span className="text-slate-200">{pacingAnalysis.overallRhythm}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">剪辑密度</span><span className="text-slate-200">{pacingAnalysis.cutsPerMinute} 次/分钟</span></div>
              <div className="flex justify-between"><span className="text-slate-400">平均片段时长</span><span className="text-slate-200">{pacingAnalysis.averageSegmentDuration}秒</span></div>
              <div className="flex justify-between"><span className="text-slate-400">节奏变化</span><span className="text-slate-200">{pacingAnalysis.hasPacingVariation ? '有' : '无'}</span></div>
            </div>
            {pacingAnalysis.energyCurve && <p className="text-sm text-slate-400 mt-3">{pacingAnalysis.energyCurve}</p>}
          </div>
        )}

        {hashtagAnalysis.hashtags.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Hashtag策略</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">预估覆盖</span><span className="text-slate-200">{formatNumber(hashtagAnalysis.totalReach)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">品类相关度</span><span className="text-emerald-400">{hashtagAnalysis.categoryRelevance}/100</span></div>
              <div className="flex justify-between"><span className="text-slate-400">趋势热度</span><span className="text-amber-400">{hashtagAnalysis.trendingScore}/100</span></div>
            </div>
            {hashtagAnalysis.recommendations.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">推荐标签</div>
                <div className="flex flex-wrap gap-1">
                  {hashtagAnalysis.recommendations.map(r => (
                    <span key={r} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">#{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Messages */}
      {keyMessages.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">关键信息</h3>
          <div className="space-y-2">
            {keyMessages.map(msg => (
              <div key={msg.text} className="flex items-center gap-3 p-3 border border-white/5 rounded-lg">
                <span className="text-xs text-slate-500">{formatDuration(msg.appearsAt)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${msg.importance > 70 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>
                  {msg.category}
                </span>
                <span className="text-sm text-slate-300 flex-1">{msg.text}</span>
                <span className="text-xs text-slate-500">{msg.importance}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentTab({ analysis }: { analysis: CommentAnalysis | null }) {
  const { isAnalyzing, currentStep } = useAIStore();
  const isAnalyzingComment = isAnalyzing && currentStep === 'comment';

  if (isAnalyzingComment) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <ProgressBar value={50} label="AI正在分析评论数据..." />
      </div>
    );
  }

  if (!analysis || analysis.totalComments === 0) {
    return <EmptyState title="暂无评论数据" description="在输入页粘贴评论后即可查看分析结果" />;
  }

  const hasAIResults = analysis.themeClusters.length > 0 || analysis.topKeywords.length > 0;
  if (!hasAIResults) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <MessageCircle size={32} strokeWidth={1.5} className="text-slate-500 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-300 mb-1">共 {analysis.totalComments} 条评论</h3>
        <p className="text-sm text-slate-400">点击"开始分析"让 AI 深度解析评论数据</p>
      </div>
    );
  }

  const { sentimentDistribution, themeClusters, userQuestions, engagementPatterns, topKeywords, summary } = analysis;

  return (
    <div className="space-y-6">
      {/* Sentiment Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '正面', value: sentimentDistribution.positive, icon: ThumbsUp, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: '负面', value: sentimentDistribution.negative, icon: ThumbsDown, color: 'text-red-400 bg-red-500/10' },
          { label: '中性', value: sentimentDistribution.neutral, icon: MessageSquare, color: 'text-slate-400 bg-slate-500/10' },
          { label: '混合', value: sentimentDistribution.mixed, icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-xl p-4 text-center">
            <div className={`w-8 h-8 rounded-full ${color.split(' ')[1]} flex items-center justify-center mx-auto mb-2`}>
              <Icon size={14} className={color.split(' ')[0]} />
            </div>
            <div className="text-xs text-slate-400 mb-0.5">{label}</div>
            <div className="text-xl font-bold text-slate-200 tabular-nums">{value}%</div>
          </div>
        ))}
      </div>

      {/* Overall score */}
      <div className="glass-card rounded-xl p-4 flex items-center gap-4">
        <div className="shrink-0 text-center">
          <div className="text-xs text-slate-400 mb-1">整体情感分</div>
          <div className={`text-2xl font-bold ${sentimentDistribution.overallScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {sentimentDistribution.overallScore > 0 ? '+' : ''}{sentimentDistribution.overallScore.toFixed(2)}
          </div>
        </div>
        <div className="flex-1 h-3 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="flex h-full">
            <div className="bg-emerald-500/40" style={{ width: `${sentimentDistribution.positive}%` }} />
            <div className="bg-slate-500/40" style={{ width: `${sentimentDistribution.neutral}%` }} />
            <div className="bg-amber-500/40" style={{ width: `${sentimentDistribution.mixed}%` }} />
            <div className="bg-red-500/40" style={{ width: `${sentimentDistribution.negative}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Clusters */}
        {themeClusters.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-300">主题聚类</h3>
            </div>
            <div className="space-y-3">
              {themeClusters.map(t => (
                <div key={t.theme}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">{t.theme}</span>
                    <span className="text-xs text-slate-400">{t.percentage}% ({t.count})</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500/40 rounded-full" style={{ width: `${Math.min(t.percentage, 100)}%` }} />
                  </div>
                  {t.representativeComments.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">"{t.representativeComments[0]?.slice(0, 80)}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {topKeywords.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">高频关键词</h3>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map(k => (
                <span key={k.word} className="px-3 py-1.5 glass-card rounded-full text-sm" style={{ fontSize: `${Math.max(0.75, Math.min(1.2, k.frequency / 20))}rem` }}>
                  <span className="text-slate-300">{k.word}</span>
                  <span className="text-slate-500 ml-1 text-xs">{k.frequency}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Questions */}
      {userQuestions.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-300">用户提问 ({userQuestions.length})</h3>
          </div>
          <div className="space-y-2">
            {userQuestions.map(q => (
              <div key={q.commentId} className="flex items-center justify-between p-3 border border-white/5 rounded-lg">
                <div>
                  <p className="text-sm text-slate-300">{q.question}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-slate-500">{q.category} · 出现{q.frequency}次</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${q.isUnanswered ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {q.isUnanswered ? '未回复' : '已回复'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Patterns */}
      {engagementPatterns.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">互动模式</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {engagementPatterns.map(p => (
              <div key={p.pattern} className="p-4 border border-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{p.pattern}</span>
                  <span className="text-xs font-bold text-emerald-400">{p.significance}/100</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">触发: {p.trigger}</p>
                <span className="text-[10px] text-slate-500">{p.frequency} 条评论匹配</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">评论总结</h3>
          <p className="text-sm text-slate-400">{summary}</p>
        </div>
      )}
    </div>
  );
}

function InsightTab({ analysis }: { analysis: VideoAnalysis }) {
  const { isAnalyzing, currentStep } = useAIStore();
  const isAnalyzingInsight = isAnalyzing && (currentStep === 'insight' || currentStep === 'why');

  if (isAnalyzingInsight) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <ProgressBar value={currentStep === 'why' ? 90 : 70} label="AI正在生成洞察..." />
      </div>
    );
  }

  const insights = (analysis.insights || []) as AIInsight[];
  const whyAnalysis = analysis.whyAnalysis as WhyAnalysis | null;

  if (insights.length === 0 && !whyAnalysis) {
    return <EmptyState title="暂无AI洞察" description="点击「开始分析」让 AI 生成深度洞察" />;
  }

  const INSIGHT_ICONS: Record<string, typeof Star> = {
    success_factor: Star,
    replicable_pattern: Zap,
    optimization: Target,
    warning: AlertTriangle,
    content_gap: Shield,
  };

  return (
    <div className="space-y-6">
      {/* Why Analysis */}
      {whyAnalysis && (
        <div className="glass-card rounded-xl p-6 glow-accent">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold gradient-text">为什么这个视频成功了</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{whyAnalysis.whyItWorked}</p>

          {/* Success Factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {whyAnalysis.primarySuccessFactors.map(sf => (
              <div key={sf.factor} className="p-3 border border-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{sf.factor}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    sf.impact === 'critical' ? 'bg-red-500/15 text-red-300' :
                    sf.impact === 'high' ? 'bg-amber-500/15 text-amber-300' :
                    'bg-slate-500/15 text-slate-300'
                  }`}>{sf.impact}</span>
                </div>
                <span className="text-[10px] text-slate-500">{sf.category}</span>
                {sf.evidence.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{sf.evidence[0]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Replicable Elements */}
          {whyAnalysis.replicableElements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-emerald-400 mb-2">可复制的元素</h4>
              <div className="flex flex-wrap gap-2">
                {whyAnalysis.replicableElements.map(el => (
                  <span key={el} className="px-3 py-1.5 bg-emerald-500/8 text-emerald-300 rounded-lg text-xs">{el}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {whyAnalysis.creatorRecommendations.length > 0 && (
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-xs font-medium text-slate-300 mb-2">行动建议</h4>
              <ol className="space-y-1.5">
                {whyAnalysis.creatorRecommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-slate-400 flex gap-2">
                    <span className="text-emerald-400 shrink-0">{i + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Individual Insights */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">详细洞察</h3>
          <div className="space-y-3">
            {insights.sort((a, b) => b.priority - a.priority).map(insight => {
              const Icon = INSIGHT_ICONS[insight.category] || Lightbulb;
              return (
                <div key={insight.id} className="glass-card rounded-xl p-5 card-hover-lift">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      insight.confidence > 70 ? 'bg-emerald-500/15' : 'bg-amber-500/10'
                    }`}>
                      <Icon size={16} className={insight.confidence > 70 ? 'text-emerald-400' : 'text-amber-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-200">{insight.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          insight.actionability === 'immediate' ? 'bg-emerald-500/15 text-emerald-300' :
                          insight.actionability === 'short_term' ? 'bg-teal-500/15 text-teal-300' :
                          'bg-slate-500/15 text-slate-300'
                        }`}>
                          {insight.actionability === 'immediate' ? '立即执行' : insight.actionability === 'short_term' ? '短期' : '策略'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-400">
                          {INSIGHT_CATEGORY_LABELS[insight.category]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{insight.description}</p>
                      {insight.supportingData.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {insight.supportingData.map((d, i) => (
                            <span key={i} className="text-[10px] text-slate-500 bg-white/[0.02] px-2 py-0.5 rounded">{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">置信度</div>
                      <div className={`text-lg font-bold tabular-nums ${insight.confidence > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {insight.confidence}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RawTab({ analysis }: { analysis: VideoAnalysis }) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">视频元数据</h3>
      <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono bg-white/[0.02] rounded-lg p-4">
        {JSON.stringify(analysis, null, 2)}
      </pre>
    </div>
  );
}