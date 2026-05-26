import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare, Plus, X } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import EmptyState from '../components/ui/EmptyState';
import RadarChartView from '../components/compare/RadarChart';
import { useAnalysisStore } from '../stores/analysisStore';
import { useCompareStore } from '../stores/compareStore';
import { formatNumber } from '../utils/formatters';

export default function ComparePage() {
  const navigate = useNavigate();
  const { analyses, loaded, loadAllAnalyses } = useAnalysisStore();
  const { selectedIds, addToComparison, removeFromComparison, clearComparison, runComparison, comparisonResult } = useCompareStore();
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => { loadAllAnalyses(); }, [loadAllAnalyses]);

  const selected = analyses.filter(a => selectedIds.includes(a.id));
  const available = analyses.filter(a => !selectedIds.includes(a.id));

  return (
    <PageTransition>
      <div className="p-6">
        <h1 className="text-2xl font-bold gradient-text mb-2">视频对比</h1>
        <p className="text-sm text-slate-400 mb-6">选择最多 4 个视频进行并排对比分析</p>

        {/* Selected videos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {selected.map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 relative card-hover-lift">
              <button onClick={() => removeFromComparison(a.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400"><X size={14} /></button>
              <h3 className="text-sm font-semibold text-slate-200 truncate">
                {a.video.creatorHandle ? `@${a.video.creatorHandle}` : '未命名'}
              </h3>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <div>播放: <span className="text-slate-300">{formatNumber(a.metrics.views)}</span></div>
                <div>互动率: <span className="text-emerald-400">{a.metrics.engagementRate.toFixed(2)}%</span></div>
              </div>
            </div>
          ))}
          {selected.length < 4 && (
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="glass-card rounded-xl p-4 border-dashed border border-white/10 hover:border-emerald-500/30 transition-colors flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
            >
              <Plus size={18} /> 添加视频
            </button>
          )}
        </div>

        {/* Selector */}
        {showSelector && (
          <div className="glass-card rounded-xl p-4 mb-6 animate-fade-in">
            <h3 className="text-sm font-medium text-slate-300 mb-3">选择要对比的视频</h3>
            {available.length === 0 ? (
              <p className="text-sm text-slate-500">没有更多可选择的视频</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {available.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { addToComparison(a.id); if (selected.length + 1 >= 4) setShowSelector(false); }}
                    className="w-full flex items-center justify-between p-3 border border-white/5 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm text-slate-300">{a.video.creatorHandle ? `@${a.video.creatorHandle}` : '未命名'}</span>
                      <span className="text-xs text-slate-500 ml-2">{formatNumber(a.metrics.views)} 播放</span>
                    </div>
                    <Plus size={16} className="text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compare action */}
        {selected.length >= 2 && (
          <div className="mb-6">
            <button
              onClick={runComparison}
              className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all btn-press flex items-center gap-2"
            >
              <GitCompare size={16} /> 开始对比 ({selected.length}个)
            </button>
            {selected.length > 0 && (
              <button onClick={clearComparison} className="ml-3 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">清除选择</button>
            )}
          </div>
        )}

        {/* Results */}
        {comparisonResult && (
          <div className="glass-card rounded-xl p-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">指标对比</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 font-medium text-slate-400">指标</th>
                    {selected.map(a => (
                      <th key={a.id} className="text-right px-4 py-3 font-medium text-slate-400">
                        {a.video.creatorHandle ? `@${a.video.creatorHandle}` : '未命名'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparisonResult.metricsComparison.map(row => (
                    <tr key={row.metric}>
                      <td className="px-4 py-3 text-slate-400">{row.metric}</td>
                      {selected.map(a => (
                        <td key={a.id} className="px-4 py-3 text-right tabular-nums">
                          <span className="text-slate-200">
                            {row.metric === '互动率' || row.metric === '传播系数'
                              ? (row.values[a.id]?.toFixed(2) ?? '-') + '%'
                              : formatNumber(row.values[a.id] ?? 0)
                            }
                          </span>
                          {row.deltas[a.id] !== 0 && (
                            <span className={`ml-2 text-xs ${row.deltas[a.id] > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {row.deltas[a.id] > 0 ? '+' : ''}{row.deltas[a.id]?.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Radar Chart */}
        {comparisonResult && selected.length >= 2 && (
          <div className="mt-6 animate-fade-in">
            <RadarChartView
              data={comparisonResult.metricsComparison}
              videoLabels={Object.fromEntries(selected.map(a => [a.id, a.video.creatorHandle ? `@${a.video.creatorHandle}` : '未命名']))}
            />
          </div>
        )}

        {!loaded ? null : analyses.length < 2 ? (
          <EmptyState title="需要至少 2 条分析才能对比" description="先完成几条视频分析后再来对比" action={{ label: '新建分析', onClick: () => navigate('/analyze') }} />
        ) : null}
      </div>
    </PageTransition>
  );
}
