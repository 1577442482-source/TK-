import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WandSparkles, ArrowRight, Plus, Trash2, X } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import ProgressBar from '../components/ui/ProgressBar';
import { useAnalysisStore } from '../stores/analysisStore';
import { useAIStore } from '../stores/aiStore';
import { calculateMetrics } from '../services/metricsEngine';
import { validateTikTokUrl } from '../utils/validators';
import { generateId } from '../utils/formatters';
import { runFullAnalysis } from '../ai/orchestrator';
import type { VideoSource, Comment, VideoSegment } from '../types';
import { SEGMENT_TYPES } from '../types';

export default function AnalyzePage() {
  const navigate = useNavigate();
  const { createAnalysis, updateAnalysis } = useAnalysisStore();
  const { isAnalyzing, progress, currentStep } = useAIStore();

  // Form state
  const [url, setUrl] = useState('');
  const [creatorHandle, setCreatorHandle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(0);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [views, setViews] = useState(0);
  const [likes, setLikes] = useState(0);
  const [shares, setShares] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [saves, setSaves] = useState(0);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [notes, setNotes] = useState('');

  const urlValid = !url.trim() || validateTikTokUrl(url);

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (t: string) => setHashtags(hashtags.filter(h => h !== t));

  const addSegment = () => {
    setSegments([...segments, {
      id: generateId(),
      type: 'hook',
      startTime: segments.length > 0 ? segments[segments.length - 1].endTime : 0,
      endTime: (segments.length > 0 ? segments[segments.length - 1].endTime : 0) + 3,
      description: '',
      keyElements: [],
      pacing: 'normal',
    }]);
  };

  const updateSegment = (id: string, field: string, value: unknown) => {
    setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSegment = (id: string) => setSegments(segments.filter(s => s.id !== id));

  const parseComments = useCallback(() => {
    const lines = commentText.trim().split('\n').filter(Boolean);
    const parsed: Comment[] = lines.map((line) => ({
      id: generateId(),
      text: line.replace(/^[\d]+[.、．]\s*/, '').trim(),
      likes: 0,
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      themes: [],
      isQuestion: line.includes('?') || line.includes('？'),
    }));
    setComments(parsed);
  }, [commentText]);

  const handleAnalyze = async () => {
    const video: VideoSource = {
      url: url.trim(),
      creatorHandle: creatorHandle.trim() || undefined,
      description: description.trim() || undefined,
      hashtags,
      duration,
      isManualInput: true,
    };

    const metrics = calculateMetrics({ views, likes, shares, comments: commentCount, saves });
    const analysisId = createAnalysis(video, metrics, comments);

    await updateAnalysis(analysisId, {
      contentDeconstruction: segments.length > 0 ? {
        segments,
        hookAnalysis: { hookType: '', firstWords: '', durationSeconds: 0, effectiveness: 0, reasoning: '' },
        emotionalArc: { points: [], arcType: '', peakIntensity: 0, dominantEmotion: '' },
        keyMessages: [],
        pacingAnalysis: { overallRhythm: 'moderate', cutsPerMinute: 0, averageSegmentDuration: 0, hasPacingVariation: false, energyCurve: '' },
        hashtagAnalysis: { hashtags, totalReach: 0, categoryRelevance: 0, trendingScore: 0, recommendations: [] },
        scriptLength: 0, ttr: 0,
      } : null,
      notes: notes.trim() || undefined,
    });

    // Kick off AI analysis (it handles its own store updates for progress)
    await updateAnalysis(analysisId, { status: 'analyzing' });
    runFullAnalysis(analysisId); // fire-and-forget, AI store manages progress

    navigate(`/analyze/${analysisId}`);
  };

  const canAnalyze = url.trim() || (description.trim() && views > 0);

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold gradient-text">视频分析</h1>
            <p className="text-sm text-slate-400 mt-1">输入视频信息，AI将深度拆解内容和评论</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition-all btn-press flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>分析中...</>
            ) : (
              <><WandSparkles size={16} strokeWidth={1.75} /> 开始分析</>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {isAnalyzing && (
          <div className="mb-6 glass-card rounded-xl p-5 animate-fade-in">
            <ProgressBar value={progress} label={currentStep ? `正在${ANALYSIS_STEP_LABELS[currentStep] || ''}` : '准备中'} />
          </div>
        )}

        <div className="space-y-6 stagger-children">
          {/* Video Info */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-[10px] text-emerald-400 font-bold">1</span>
              视频信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">视频链接</label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors ${urlValid ? 'border-white/5' : 'border-red-500/30'}`}
                  placeholder="https://www.tiktok.com/@user/video/123..."
                />
                {!urlValid && <p className="text-xs text-red-400 mt-1">链接格式不正确</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">创作者账号</label>
                <input value={creatorHandle} onChange={e => setCreatorHandle(e.target.value)} className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="@username" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">视频时长（秒）</label>
                <input type="number" value={duration || ''} onChange={e => setDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="如 45" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">视频描述</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="视频文案/描述..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Hashtags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {hashtags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-300 rounded-full text-xs">
                      #{tag}
                      <button onClick={() => removeHashtag(tag)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                    className="flex-1 px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="输入标签后按回车添加"
                  />
                  <button onClick={addHashtag} className="px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">添加</button>
                </div>
              </div>
            </div>
          </section>

          {/* Metrics */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-teal-500/15 flex items-center justify-center text-[10px] text-teal-400 font-bold">2</span>
              数据指标
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: '播放量', value: views, setter: setViews },
                { label: '点赞数', value: likes, setter: setLikes },
                { label: '分享数', value: shares, setter: setShares },
                { label: '评论数', value: commentCount, setter: setCommentCount },
                { label: '收藏数', value: saves, setter: setSaves },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input
                    type="number"
                    value={value || ''}
                    onChange={e => setter(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Segments */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-cyan-500/15 flex items-center justify-center text-[10px] text-cyan-400 font-bold">3</span>
                脚本分段
              </h2>
              <button onClick={addSegment} className="px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1">
                <Plus size={14} /> 添加分段
              </button>
            </div>
            {segments.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">尚未添加分段。点击"添加分段"手动拆分视频脚本结构。</p>
            ) : (
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div key={seg.id} className="flex items-start gap-3 p-3 border border-white/5 rounded-lg">
                    <span className="text-xs text-slate-500 w-6 pt-2">{i + 1}</span>
                    <select
                      value={seg.type}
                      onChange={e => updateSegment(seg.id, 'type', e.target.value)}
                      className="px-2 py-1.5 border border-white/5 rounded text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {SEGMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <input type="number" value={seg.startTime || ''} onChange={e => updateSegment(seg.id, 'startTime', Number(e.target.value))} className="w-12 px-1 py-1.5 border border-white/5 rounded text-xs bg-transparent text-center" placeholder="0" />
                      <span>s -</span>
                      <input type="number" value={seg.endTime || ''} onChange={e => updateSegment(seg.id, 'endTime', Number(e.target.value))} className="w-12 px-1 py-1.5 border border-white/5 rounded text-xs bg-transparent text-center" placeholder="0" />
                      <span>s</span>
                    </div>
                    <input
                      value={seg.description}
                      onChange={e => updateSegment(seg.id, 'description', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-white/5 rounded text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="分段描述..."
                    />
                    <select
                      value={seg.pacing}
                      onChange={e => updateSegment(seg.id, 'pacing', e.target.value)}
                      className="px-2 py-1.5 border border-white/5 rounded text-xs bg-transparent"
                    >
                      <option value="fast">快节奏</option>
                      <option value="normal">正常</option>
                      <option value="slow">慢节奏</option>
                    </select>
                    <button onClick={() => removeSegment(seg.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Comments */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center text-[10px] text-amber-400 font-bold">4</span>
              评论数据
            </h2>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="粘贴评论，每行一条..."
            />
            <div className="flex items-center justify-between mt-3">
              <button onClick={parseComments} className="px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                解析评论 ({comments.length} 条)
              </button>
              {comments.length > 0 && (
                <span className="text-xs text-slate-400">已解析 {comments.length} 条评论</span>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-500/15 flex items-center justify-center text-[10px] text-slate-400 font-bold">5</span>
              备注
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="为什么分析这个视频？有什么特别想了解的吗？（可选）"
            />
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="px-8 py-3 text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition-all btn-press flex items-center gap-3"
          >
            {isAnalyzing ? '分析中...' : <>开始深度分析 <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

const ANALYSIS_STEP_LABELS: Record<string, string> = {
  content: '内容拆解中...',
  comment: '评论分析中...',
  insight: '生成洞察+综合归因中...',
};
