import type { ScriptBreakdown, ShotAnalysis } from '../../types';

export interface ScriptShotInput {
  description?: string;
  hashtags: string[];
  creatorHandle?: string;
  duration?: number;
  segments?: { type: string; startTime: number; endTime: number; description: string }[];
}

// ============================================================
// Script Breakdown
// ============================================================

export function buildScriptBreakdownPrompt(input: ScriptShotInput): string {
  const segmentsText = input.segments?.length
    ? `\n已知分段：\n${input.segments.map(s => `- [${s.startTime}s-${s.endTime}s] ${s.type}: ${s.description}`).join('\n')}`
    : '';

  return `你是一个 TikTok 短视频脚本分析师。根据视频元数据${
    input.segments?.length ? '和已有内容分段' : ''
  }，推演这个视频的脚本结构和文案技巧。

## 视频信息
- 作者: ${input.creatorHandle || '未知'}
- 标题/文案: ${input.description || '无'}
- Hashtags: ${input.hashtags.join(', ') || '无'}
- 时长: ${input.duration || 0}s${segmentsText}

## 任务
根据以上信息，反推视频的脚本结构和文案策略。请注意：
- TikTok 短视频脚本讲究"黄金3秒"钩子 + 快节奏 + 强情绪 + 明确CTA
- 根据标题/hashtags/作者风格推测脚本的叙事思路
- 每段的分析要具体，不能泛泛而谈

返回 JSON（不要 markdown 包裹）：
{
  "scriptStructure": {
    "hookType": "悬念/反差/提问/夸张/数据冲击/情感共鸣/痛点直击/其他",
    "hookScript": "推测的钩子脚本文案（精确到字）",
    "narrativeArc": "问题-解决方案/前后对比/教学步骤/日常Vlog/产品测评/挑战/观点输出/其他",
    "keyLines": ["金句或关键台词1", "金句2"],
    "copywritingTechniques": ["使用的文案技巧（如：重复递进、数字冲击、情感共鸣、认知反差、从众心理等）"],
    "toneAndVoice": "博主语调人设分析（如：专家型、闺蜜型、搞笑型、冷酷型等）"
  },
  "segmentScripts": [
    {
      "segment": "hook/intro/body/cta/outro",
      "purpose": "该段的目的",
      "scriptText": "推测该段的脚本文案",
      "technique": "使用的文案技巧",
      "effectiveness": 0-100
    }
  ],
  "overallScore": {
    "hookStrength": 0-100,
    "structureClarity": 0-100,
    "emotionalAppeal": 0-100,
    "callToAction": 0-100,
    "overall": 0-100
  }
}`;
}

export function parseScriptBreakdownResponse(json: string): ScriptBreakdown | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      scriptStructure: {
        hookType: data.scriptStructure?.hookType || '',
        hookScript: data.scriptStructure?.hookScript || '',
        narrativeArc: data.scriptStructure?.narrativeArc || '',
        keyLines: data.scriptStructure?.keyLines || [],
        copywritingTechniques: data.scriptStructure?.copywritingTechniques || [],
        toneAndVoice: data.scriptStructure?.toneAndVoice || '',
      },
      segmentScripts: (data.segmentScripts || []).map((s: any) => ({
        segment: s.segment || '',
        purpose: s.purpose || '',
        scriptText: s.scriptText || '',
        technique: s.technique || '',
        effectiveness: s.effectiveness || 0,
      })),
      overallScore: {
        hookStrength: data.overallScore?.hookStrength || 0,
        structureClarity: data.overallScore?.structureClarity || 0,
        emotionalAppeal: data.overallScore?.emotionalAppeal || 0,
        callToAction: data.overallScore?.callToAction || 0,
        overall: data.overallScore?.overall || 0,
      },
    };
  } catch {
    return null;
  }
}

// ============================================================
// Shot Analysis
// ============================================================

export function buildShotAnalysisPrompt(input: ScriptShotInput): string {
  return `你是一个 TikTok 短视频分镜/剪辑分析专家。根据视频元数据，推演这个视频的镜头语言和剪辑节奏。

## 视频信息
- 作者: ${input.creatorHandle || '未知'}
- 标题/文案: ${input.description || '无'}
- Hashtags: ${input.hashtags.join(', ') || '无'}
- 时长: ${input.duration || 0}s

## 任务
根据视频的主题、风格和时长，反推其可能的分镜设计和剪辑逻辑。
- TikTok 视频节奏快，平均镜头时长 1-3 秒
- 常见手法：跳切、缩放转场、匹配剪辑、文字弹窗
- 不同类型的视频有典型的分镜模式（口播类少切镜、教程类多特写、Vlog 类多场景切换）

返回 JSON（不要 markdown 包裹）：
{
  "shotBreakdown": [
    {
      "shotNumber": 1,
      "startTime": 0,
      "endTime": 3,
      "shotType": "特写/中景/远景/俯拍/跟拍/POV/自拍/产品展示/文字画面",
      "cameraMovement": "推/拉/摇/移/固定/手持晃动/快速摇镜",
      "composition": "构图方式描述（如：居中构图、三分法、引导线等）",
      "transition": "硬切/淡入淡出/滑动/旋转/缩放/匹配剪辑",
      "visualSubject": "画面主体是什么",
      "onScreenText": ["屏幕上显示的文字"],
      "energyLevel": 0-100
    }
  ],
  "visualRhythm": {
    "avgShotDuration": 2.5,
    "pacePattern": "快节奏/慢节奏/渐变加速/张弛交替/前快后慢",
    "editingStyle": "剪辑风格总体描述",
    "transitionPattern": "转场使用规律"
  },
  "visualStructure": {
    "openingVisual": "开场视觉描述（前3秒）",
    "climaxVisual": "高潮/最精彩画面的视觉描述",
    "closingVisual": "结尾视觉描述",
    "visualContinuity": 0-100
  }
}`;
}

export function parseShotAnalysisResponse(json: string): ShotAnalysis | null {
  try {
    let cleaned = json.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    const data = JSON.parse(cleaned);

    return {
      shotBreakdown: (data.shotBreakdown || []).map((s: any) => ({
        shotNumber: s.shotNumber || 0,
        startTime: s.startTime || 0,
        endTime: s.endTime || 0,
        shotType: s.shotType || '',
        cameraMovement: s.cameraMovement || '',
        composition: s.composition || '',
        transition: s.transition || '',
        visualSubject: s.visualSubject || '',
        onScreenText: s.onScreenText || [],
        energyLevel: s.energyLevel || 0,
      })),
      visualRhythm: {
        avgShotDuration: data.visualRhythm?.avgShotDuration || 0,
        pacePattern: data.visualRhythm?.pacePattern || '',
        editingStyle: data.visualRhythm?.editingStyle || '',
        transitionPattern: data.visualRhythm?.transitionPattern || '',
      },
      visualStructure: {
        openingVisual: data.visualStructure?.openingVisual || '',
        climaxVisual: data.visualStructure?.climaxVisual || '',
        closingVisual: data.visualStructure?.closingVisual || '',
        visualContinuity: data.visualStructure?.visualContinuity || 0,
      },
    };
  } catch {
    return null;
  }
}
