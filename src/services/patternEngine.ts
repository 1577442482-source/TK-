import type { VideoAnalysis, ReplicablePattern } from '../types';

interface PatternResult {
  patterns: ReplicablePattern[];
  summary: {
    topHookTypes: { type: string; count: number; avgEffectiveness: number }[];
    topEmotionalArcs: { type: string; count: number }[];
    topPacingRhythms: { rhythm: string; count: number; avgEngagement: number }[];
    optimalDuration: { range: string; count: number; avgEngagement: number } | null;
    topCTAStrategies: { strategy: string; count: number }[];
  };
}

export function extractPatterns(analyses: VideoAnalysis[]): PatternResult {
  const completed = analyses.filter(a => a.status === 'complete' && a.contentDeconstruction);

  if (completed.length < 2) {
    return {
      patterns: [],
      summary: {
        topHookTypes: [],
        topEmotionalArcs: [],
        topPacingRhythms: [],
        optimalDuration: null,
        topCTAStrategies: [],
      },
    };
  }

  // 1. Hook type analysis
  const hookTypes = new Map<string, { count: number; totalEffectiveness: number }>();
  for (const a of completed) {
    const hook = a.contentDeconstruction?.hookAnalysis;
    if (hook?.hookType) {
      const entry = hookTypes.get(hook.hookType) || { count: 0, totalEffectiveness: 0 };
      entry.count++;
      entry.totalEffectiveness += hook.effectiveness || 0;
      hookTypes.set(hook.hookType, entry);
    }
  }

  const topHookTypes = Array.from(hookTypes.entries())
    .map(([type, data]) => ({ type, count: data.count, avgEffectiveness: Math.round(data.totalEffectiveness / data.count) }))
    .sort((a, b) => b.count - a.count);

  // 2. Emotional arc analysis
  const emotionalArcs = new Map<string, number>();
  for (const a of completed) {
    const arc = a.contentDeconstruction?.emotionalArc;
    if (arc?.arcType) {
      emotionalArcs.set(arc.arcType, (emotionalArcs.get(arc.arcType) || 0) + 1);
    }
  }

  const topEmotionalArcs = Array.from(emotionalArcs.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Pacing analysis
  const pacingRhythms = new Map<string, { count: number; totalEngagement: number }>();
  for (const a of completed) {
    const pacing = a.contentDeconstruction?.pacingAnalysis;
    if (pacing?.overallRhythm) {
      const entry = pacingRhythms.get(pacing.overallRhythm) || { count: 0, totalEngagement: 0 };
      entry.count++;
      entry.totalEngagement += a.metrics.engagementRate;
      pacingRhythms.set(pacing.overallRhythm, entry);
    }
  }

  const topPacingRhythms = Array.from(pacingRhythms.entries())
    .map(([rhythm, data]) => ({ rhythm, count: data.count, avgEngagement: Math.round((data.totalEngagement / data.count) * 100) / 100 }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // 4. Duration analysis
  const durations = completed
    .map(a => ({ duration: a.video.duration, engagement: a.metrics.engagementRate }))
    .filter(d => d.duration > 0)
    .sort((a, b) => a.duration - b.duration);

  let optimalDuration: PatternResult['summary']['optimalDuration'] = null;
  if (durations.length >= 2) {
    // Group into buckets
    const buckets = new Map<string, { count: number; totalEngagement: number }>();
    for (const d of durations) {
      let range: string;
      if (d.duration <= 15) range = '0-15s';
      else if (d.duration <= 30) range = '15-30s';
      else if (d.duration <= 45) range = '30-45s';
      else if (d.duration <= 60) range = '45-60s';
      else range = '60s+';

      const entry = buckets.get(range) || { count: 0, totalEngagement: 0 };
      entry.count++;
      entry.totalEngagement += d.engagement;
      buckets.set(range, entry);
    }

    const bestBucket = Array.from(buckets.entries())
      .map(([range, data]) => ({ range, count: data.count, avgEngagement: Math.round((data.totalEngagement / data.count) * 100) / 100 }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

    if (bestBucket) optimalDuration = bestBucket;
  }

  // 5. CTA strategy analysis
  const ctaStrategies = new Map<string, number>();
  for (const a of completed) {
    const ctaSegments = a.contentDeconstruction?.segments?.filter(s => s.type === 'cta') || [];
    for (const seg of ctaSegments) {
      const strategy = categorizeCTA(seg.description);
      ctaStrategies.set(strategy, (ctaStrategies.get(strategy) || 0) + 1);
    }
    // Also check key messages for CTA patterns
    const ctaMessages = a.contentDeconstruction?.keyMessages?.filter(m => m.category === 'urgency') || [];
    if (ctaMessages.length > 0) {
      ctaStrategies.set('紧迫感驱动', (ctaStrategies.get('紧迫感驱动') || 0) + ctaMessages.length);
    }
  }

  const topCTAStrategies = Array.from(ctaStrategies.entries())
    .map(([strategy, count]) => ({ strategy, count }))
    .sort((a, b) => b.count - a.count);

  // 6. Build patterns
  const patterns: ReplicablePattern[] = [];
  const exampleIds = completed.slice(0, 5).map(a => a.id);

  if (topHookTypes.length > 0) {
    const top = topHookTypes[0];
    patterns.push({
      id: 'pattern-hook',
      name: `${top.type}式钩子`,
      category: 'hook',
      description: `在 ${top.count}/${completed.length} 个视频中出现，平均有效性 ${top.avgEffectiveness}/100。${getHookAdvice(top.type)}`,
      evidenceCount: top.count,
      averageImpact: top.avgEffectiveness,
      exampleVideoIds: exampleIds,
      exampleUrls: [],
      bestFor: getBestFor(top.type),
      confidence: Math.min(90, Math.round((top.count / completed.length) * 100)),
    });
  }

  if (topEmotionalArcs.length > 0) {
    const top = topEmotionalArcs[0];
    patterns.push({
      id: 'pattern-emotion',
      name: `${top.type}型情感弧线`,
      category: 'structure',
      description: `在 ${top.count}/${completed.length} 个视频中出现，是最常见的情感结构模式。`,
      evidenceCount: top.count,
      averageImpact: 70,
      exampleVideoIds: exampleIds,
      exampleUrls: [],
      bestFor: ['故事类', '教程类', '品牌传播'],
      confidence: Math.min(85, Math.round((top.count / completed.length) * 100)),
    });
  }

  if (topPacingRhythms.length > 0) {
    const top = topPacingRhythms[0];
    patterns.push({
      id: 'pattern-pacing',
      name: `${top.rhythm}节奏策略`,
      category: 'pacing',
      description: `平均互动率 ${top.avgEngagement}%，是在你的数据中表现最好的节奏模式。`,
      evidenceCount: top.count,
      averageImpact: Math.min(100, Math.round(top.avgEngagement * 5)),
      exampleVideoIds: exampleIds,
      exampleUrls: [],
      bestFor: top.rhythm === 'fast' ? ['娱乐类', '挑战类'] : top.rhythm === 'slow' ? ['教程类', '故事类'] : ['综合类'],
      confidence: Math.min(80, Math.round((top.count / completed.length) * 100)),
    });
  }

  if (optimalDuration) {
    patterns.push({
      id: 'pattern-duration',
      name: `最优时长: ${optimalDuration.range}`,
      category: 'structure',
      description: `时长在 ${optimalDuration.range} 的视频平均互动率最高（${optimalDuration.avgEngagement}%），基于 ${optimalDuration.count} 个样本。`,
      evidenceCount: optimalDuration.count,
      averageImpact: 65,
      exampleVideoIds: exampleIds,
      exampleUrls: [],
      bestFor: ['通用'],
      confidence: Math.min(75, Math.round((optimalDuration.count / completed.length) * 100)),
    });
  }

  return {
    patterns,
    summary: { topHookTypes, topEmotionalArcs, topPacingRhythms, optimalDuration, topCTAStrategies },
  };
}

function categorizeCTA(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('关注') || d.includes('follow')) return '关注引导';
  if (d.includes('点赞') || d.includes('like')) return '点赞引导';
  if (d.includes('评论') || d.includes('comment')) return '评论引导';
  if (d.includes('分享') || d.includes('share')) return '分享引导';
  if (d.includes('链接') || d.includes('bio') || d.includes('主页')) return '主页引流';
  return '行动号召';
}

function getHookAdvice(hookType: string): string {
  const advice: Record<string, string> = {
    'question': '提问式钩子能有效激发用户好奇心，适合教育类和揭秘类内容。',
    'statistic': '数据式钩子用具体数字建立权威感，适合商业和科普内容。',
    'problem': '问题式钩子先抛出痛点再给解决方案，转化率最高。',
    'story': '故事式钩子用叙事建立情感连接，适合品牌和个人IP。',
    'visual': '视觉冲击式钩子依赖画面吸引力，适合美妆、美食等视觉品类。',
    'trend': '蹭热点式钩子利用趋势流量，时效性强但衰减快。',
    'challenge': '挑战式钩子激发参与感，适合UGC和互动类内容。',
  };
  return advice[hookType] || '该钩子类型在你的数据中表现突出，值得继续使用和优化。';
}

function getBestFor(hookType: string): string[] {
  const mapping: Record<string, string[]> = {
    'question': ['教育类', '揭秘类', '知识付费'],
    'statistic': ['商业分析', '科普类', '财经类'],
    'problem': ['产品种草', '解决方案', '服务推广'],
    'story': ['品牌故事', '个人IP', 'Vlog'],
    'visual': ['美妆', '美食', '时尚', '旅行'],
    'trend': ['娱乐', '挑战', '热点内容'],
    'challenge': ['互动类', 'UGC', '社群运营'],
  };
  return mapping[hookType] || ['通用'];
}
