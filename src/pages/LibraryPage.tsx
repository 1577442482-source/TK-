import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Search, ArrowUpDown, Plus, Trash2, ChevronRight } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useState } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { useLibraryStore } from '../stores/libraryStore';
import { formatNumber } from '../utils/formatters';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { analyses, loaded, loadAllAnalyses, deleteAnalysis } = useAnalysisStore();
  const { searchQuery, sortBy, setSearchQuery, setSortBy, toggleSortDirection, getFilteredVideos } = useLibraryStore();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => { loadAllAnalyses(); }, [loadAllAnalyses]);

  const filtered = getFilteredVideos();

  if (!loaded) return <PageSkeleton />;

  return (
    <PageTransition>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">分析库</h1>
            <p className="text-sm text-slate-400 mt-1">{analyses.length} 条分析记录</p>
          </div>
          <button
            onClick={() => navigate('/analyze')}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all btn-press flex items-center gap-2"
          >
            <Plus size={16} /> 新建分析
          </button>
        </div>

        {/* Toolbar */}
        {analyses.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 rounded-xl text-sm bg-glass-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="搜索 URL、创作者、标签..."
              />
            </div>
            <button
              onClick={toggleSortDirection}
              className="p-2.5 border border-white/5 rounded-xl hover:bg-white/5 transition-colors"
              title="切换排序方向"
            >
              <ArrowUpDown size={16} className="text-slate-400" />
            </button>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 border border-white/5 rounded-xl text-sm bg-glass-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="date">按时间</option>
              <option value="engagement">按互动率</option>
              <option value="views">按播放量</option>
              <option value="sentiment">按情感分</option>
            </select>
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            title={analyses.length === 0 ? '还没有分析记录' : '没有匹配的结果'}
            description={analyses.length === 0 ? '点击"新建分析"开始拆解你的第一条视频' : '尝试修改搜索条件'}
            action={analyses.length === 0 ? { label: '新建分析', onClick: () => navigate('/analyze') } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filtered.map(a => (
              <div
                key={a.id}
                onClick={() => navigate(`/analyze/${a.id}`)}
                className="glass-card rounded-xl p-5 card-hover-lift animate-fade-in-up cursor-pointer group relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-200 truncate">
                      {a.video.creatorHandle ? `@${a.video.creatorHandle}` : '未命名'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {a.video.url || '手动输入数据'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <div className="text-xs text-slate-500">播放</div>
                    <div className="text-sm font-semibold tabular-nums text-slate-300">{formatNumber(a.metrics.views)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">互动率</div>
                    <div className="text-sm font-semibold tabular-nums text-emerald-400">{a.metrics.engagementRate.toFixed(2)}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {a.video.hashtags.slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-emerald-500/8 text-emerald-400 rounded text-[10px]">#{t}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(a.id); }}
                  className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="删除分析"
          message="确定要删除这条分析吗？"
          confirmLabel="删除"
          onConfirm={async () => { if (deleteTarget) { await deleteAnalysis(deleteTarget); setDeleteTarget(null); } }}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      </div>
    </PageTransition>
  );
}
