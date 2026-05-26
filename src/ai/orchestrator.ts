import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getModelForTask, type TaskType, type ModelConfig } from './provider-router';
import { useAIStore } from '../stores/aiStore';
import { useAnalysisStore } from '../stores/analysisStore';

import {
  buildContentDeconstructionPrompt,
  parseContentDeconstructionResponse,
} from './prompts/content-deconstruction';

import {
  buildCommentAnalysisPrompt,
  parseCommentAnalysisResponse,
} from './prompts/comment-analysis';

import {
  buildInsightPrompt,
  parseInsightResponse,
} from './prompts/insight-generation';

function createModel(config: ModelConfig, apiKey: string) {
  switch (config.provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(config.model);
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(config.model);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(config.model);
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

function getApiKey(provider: string): string {
  try {
    const keys = JSON.parse(localStorage.getItem('tk_ai_keys') || '{}');
    const encoded = keys[provider];
    return encoded ? atob(encoded) : '';
  } catch {
    return '';
  }
}

export async function runFullAnalysis(analysisId: string): Promise<void> {
  const aiStore = useAIStore.getState();
  const analysisStore = useAnalysisStore.getState();
  const analysis = analysisStore.analyses.find((a) => a.id === analysisId);
  if (!analysis) return;

  const { modelPreferences } = aiStore;
  const steps: { key: TaskType; label: string; progress: number }[] = [
    { key: 'deconstruction', label: '内容拆解中...', progress: 25 },
    { key: 'comment', label: '评论分析中...', progress: 50 },
    { key: 'insight', label: '生成洞察+综合归因中...', progress: 90 },
  ];

  let contentDeconstruction = analysis.contentDeconstruction;
  let commentAnalysis = analysis.commentAnalysis;

  aiStore.startAnalysis();

  for (const step of steps) {
    const config = getModelForTask(step.key, modelPreferences);
    const apiKey = getApiKey(config.provider);
    if (!apiKey) {
      aiStore.setError(`未配置 ${config.provider} 的 API Key。请在设置页面添加。`);
      return;
    }

    aiStore.setStep(step.key, step.progress);

    try {
      const model = createModel(config, apiKey);
      let prompt: string;

      switch (step.key) {
        case 'deconstruction': {
          prompt = buildContentDeconstructionPrompt({
            description: analysis.video.description,
            hashtags: analysis.video.hashtags,
            duration: analysis.video.duration,
            segments: analysis.contentDeconstruction?.segments || [],
            creatorHandle: analysis.video.creatorHandle,
          });

          const result = await generateText({ model, prompt, temperature: modelPreferences.temperature });
          const parsed = parseContentDeconstructionResponse(result.text);
          if (parsed) {
            contentDeconstruction = parsed;
            await analysisStore.updateAnalysis(analysisId, { contentDeconstruction: parsed });
          }
          break;
        }

        case 'comment': {
          if (!analysis.rawComments || analysis.rawComments.length === 0) {
            break;
          }

          prompt = buildCommentAnalysisPrompt({
            comments: analysis.rawComments,
            videoDescription: analysis.video.description,
            videoHashtags: analysis.video.hashtags,
          });

          const result = await generateText({ model, prompt, temperature: modelPreferences.temperature });
          const parsed = parseCommentAnalysisResponse(result.text);
          if (parsed) {
            commentAnalysis = { ...parsed, totalComments: analysis.commentAnalysis?.totalComments || 0 };
            await analysisStore.updateAnalysis(analysisId, { commentAnalysis });
          }
          break;
        }

        case 'insight': {
          prompt = buildInsightPrompt({
            contentDeconstruction: contentDeconstruction || analysis.contentDeconstruction,
            commentAnalysis: commentAnalysis || analysis.commentAnalysis,
            metrics: analysis.metrics,
            videoDescription: analysis.video.description,
            videoHashtags: analysis.video.hashtags,
          });

          const result = await generateText({ model, prompt, temperature: modelPreferences.temperature * 0.7 });
          const parsed = parseInsightResponse(result.text);
          if (parsed.insights.length > 0 || parsed.whyAnalysis) {
            await analysisStore.updateAnalysis(analysisId, {
              insights: parsed.insights,
              whyAnalysis: parsed.whyAnalysis,
            });
          }
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`AI分析步骤 [${step.key}] 失败:`, message);
      // Continue to next step instead of aborting completely
    }
  }

  aiStore.finishAnalysis();
  await analysisStore.updateAnalysis(analysisId, { status: 'complete' });
}
