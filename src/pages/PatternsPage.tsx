import { useEffect, useMemo } from 'react';
import { Lightbulb, TrendingUp, Zap, Clock, MessageSquareHeart, Target, BarChart3 } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useAnalysisStore } from '../stores/analysisStore';
import { extractPatterns } from '../services/patternEngine';

const PATTERN_ICONS: Record<string, typeof Lightbulb> = {
  hook: Zap,
  structure: TrendingUp,
  pacing: Clock,
  comment: MessageSquareHeart,
};

export default function PatternsPage() {
  const { analyses, loaded, loadAllAnalyses } = useAnalysisStore();

  useEffect(() => { loadAllAnalyses(); }, [loadAllAnalyses]);

  const result = useMemo(() => extractPatterns(analyses), [analyses]);
  const { patterns, summary } = result;
  const completeAnalyses = analyses.filter(a => a.status === 'complete');

  if (!loaded) return <PageSkeleton />;

  if (completeAnalyses.length < 2) {
    return (
      <PageTransition>
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-text mb-2">模式库</h1>
          <p className="text-sm text-slate-400 mb-6">基于你的分析历史，自动提炼可复制的成功模式</p>
          <EmptyState
            title="数据不足，无法生成模式"
            description={`需要至少 2 条完成分析（当前 ${completeAnalyses.length} 条）。继续分析更多视频后将自动发现成功模式。`}
          />
        </div>
      </PageTransition>
    );
  }

  const summaryCards = [
    {
      label: '高频钩子',
      value: summary.topHookTypes[0]?.type || '—',
      sub: `${summary.topHookTypes[0]?.count || 0}个视频`,
      icon: Zap,
      color: 'text-amber-400',
    },
    {
      label: '常见情感弧线',
      value: summary.topEmotionalArcs[0]?.type || '—',
      sub: `${summary.topEmotionalArcs[0]?.count || 0}个视频`,
      icon: TrendingUp,
      color: 'text-emerald-400',
    },
    {
      label: '最佳时长',
      value: summary.optimalDuration?.range || '—',
      sub: summary.optimalDuration ? `互动率 ${summary.optimalDuration.avgEngagement}%` : '',
      icon: Clock,
      color: 'text-teal-400',
    },
    {
      label: '节奏偏好',
      value: summary.topPacingRhythms[0]?.rhythm || '—',
      sub: summary.topPacingRhythms[0] ? `${summary.topPacingRhythms[0].count}个视频` : '',
      icon: BarChart3,
      color: 'text-cyan-400',
    },
  ];

  return (
    <PageTransition>
      <div className="p-6">
        <h1 className="text-2xl font-bold gradient-text mb-2">模式库</h1>
        <p className="text-sm text-slate-400 mb-6">
          基于 {completeAnalyses.length} 条分析自动提炼 · {patterns.length} 个模式发现
        </p>

        <div className="space-y-6 stagger-children">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="glass-card rounded-xl p-4 card-hover-lift animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} strokeWidth={1.75} className={color} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
                <div className="text-lg font-bold text-slate-200">{value}</div>
                {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
              </div>
            ))}
          </div>

          {/* Hook type breakdown */}
          {summary.topHookTypes.length > 1 && (
            <div className="glass-card rounded-xl p-5 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-300">钩子类型分布</h3>
              </div>
              <div className="space-y-2">
                {summary.topHookTypes.map(({ type, count, avgEffectiveness }) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-20">{type}</span>
                    <div className="flex-1 h-5 bg-white/[0.02] rounded relative">
                      <div
                        className="absolute inset-y-0 bg-amber-500/20 rounded"
                        style={{ width: `${(count / completeAnalyses.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                    <span className="text-xs text-emerald-400 w-16 text-right">有效性 {avgEffectiveness}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pacing comparison */}
          {summary.topPacingRhythms.length > 1 && (
            <div className="glass-card rounded-xl p-5 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-teal-400" />
                <h3 className="text-sm font-semibold text-slate-300">节奏 vs 互动率</h3>
              </div>
              <div className="space-y-2">
                {summary.topPacingRhythms.map(({ rhythm, count, avgEngagement }) => (
                  <div key={rhythm} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-16">{rhythm}</span>
                    <div className="flex-1 h-5 bg-white/[0.02] rounded relative">
                      <div
                        className="absolute inset-y-0 bg-teal-500/20 rounded"
                        style={{ width: `${Math.min(100, avgEngagement * 8)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{count}个</span>
                    <span className="text-xs text-emerald-400 w-20 text-right tabular-nums">互动率 {avgEngagement}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA strategies */}
          {summary.topCTAStrategies.length > 0 && (
            <div className="glass-card rounded-xl p-5 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-300">CTA策略分布</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {summary.topCTAStrategies.map(({ strategy, count }) => (
                  <div key={strategy} className="px-4 py-3 glass-card rounded-xl text-center">
                    <div className="text-lg font-bold text-slate-200">{count}</div>
                    <div className="text-xs text-slate-400">{strategy}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pattern cards */}
          {patterns.map(pattern => {
            const Icon = PATTERN_ICONS[pattern.category] || Lightbulb;
            return (
              <div key={pattern.id} className="glass-card rounded-xl p-5 card-hover-lift animate-fade-in-up">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Icon size={20} strokeWidth={1.75} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-200">{pattern.name}</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px]">
                        证据: {pattern.evidenceCount}个视频
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${pattern.confidence >= 70 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/10 text-amber-400'}`}>
                        置信度: {pattern.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{pattern.description}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {pattern.bestFor.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-white/5 text-slate-400 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500">影响力</div>
                    <div className="text-lg font-bold text-emerald-400">{pattern.averageImpact}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
