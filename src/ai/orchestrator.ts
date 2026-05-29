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
  buildCommentSentimentPrompt,
  parseCommentSentimentResponse,
  buildCommentThemesPrompt,
  parseCommentThemesResponse,
} from './prompts/comment-analysis';

import {
  buildInsightPrompt,
  parseInsightResponse,
  buildWhyAnalysisPrompt,
  parseWhyAnalysisResponse,
  buildEngagementTrendPrompt,
  parseEngagementTrendResponse,
} from './prompts/insight-generation';
import { extractCommentTimestamps, clusterCommentTimestamps } from '../services/engagementTrend';

import {
  buildScriptBreakdownPrompt,
  parseScriptBreakdownResponse,
  buildShotAnalysisPrompt,
  parseShotAnalysisResponse,
} from './prompts/script-breakdown';

import {
  buildTimelineAnalysisPrompt,
  parseTimelineAnalysisResponse,
} from './prompts/timeline-analysis';

function extractErrorMessage(err: unknown): string {
  if (!err) return '未知错误';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    if (err.message) return err.message;
    // AI SDK errors may have nested data
    const e = err as any;
    if (e.cause?.message) return e.cause.message;
    if (e.responseBody) return String(e.responseBody).slice(0, 200);
    if (e.data?.message) return e.data.message;
    if (e.status) return `HTTP ${e.status}`;
    return err.constructor?.name || '未知错误';
  }
  try { return JSON.stringify(err).slice(0, 200); } catch { return '未知错误'; }
}

async function generateWithRetry(opts: any, retries = 3): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const merged = { ...opts, maxRetries: 0 };
      if (!merged.timeout) merged.timeout = 120000; // 2min default for free models
      return await generateText(merged);
    } catch (err) {
      const msg = extractErrorMessage(err);
      const isRateError = msg.includes('429') || msg.includes('rate') || msg.includes('Provider returned error');
      const isRetryable = isRateError || msg.includes('timeout') || msg.includes('ECONNRESET') || msg.includes('503') || msg.includes('upstream') || msg.includes('unavailable');
      if (i < retries && isRetryable) {
        const delay = Math.pow(2, i + 2) * 2000; // 8s, 16s, 32s backoff
        console.warn(`生成重试 ${i + 1}/${retries}，等待 ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else if (i < retries) {
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err;
      }
    }
  }
}

function isFreeModel(modelName: string): boolean {
  return modelName.includes(':free');
}

function isClaudeModel(modelName: string): boolean {
  return modelName.toLowerCase().includes('claude');
}

function applyProviderCompatibilityOptions(opts: any, config: ModelConfig): any {
  if (config.provider !== 'onetoken' || !isClaudeModel(config.model)) {
    return opts;
  }

  return {
    ...opts,
    providerOptions: {
      ...opts.providerOptions,
      openai: {
        ...opts.providerOptions?.openai,
        // OneToken forwards Claude models to Anthropic, whose messages array rejects system roles.
        systemMessageMode: 'remove',
      },
    },
  };
}

async function generateForModel(opts: any, config: ModelConfig, retries = 3): Promise<any> {
  return generateWithRetry(applyProviderCompatibilityOptions(opts, config), retries);
}

function contentToText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.input_text === 'string') return part.input_text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return content == null ? '' : String(content);
}

function prependTextToUserMessage(message: any, text: string): any {
  if (typeof message.content === 'string') {
    return { ...message, content: `${text}\n\n${message.content}` };
  }

  if (Array.isArray(message.content)) {
    return { ...message, content: [{ type: 'text', text }, ...message.content] };
  }

  return { ...message, content: text };
}

function sanitizeMessagesForAnthropicRelay(messages: any[]): { messages: any[]; changed: boolean } {
  const systemTexts: string[] = [];
  const nextMessages: any[] = [];

  for (const message of messages) {
    if (message?.role === 'system' || message?.role === 'developer') {
      const text = contentToText(message.content);
      if (text) systemTexts.push(text);
      continue;
    }
    nextMessages.push(message);
  }

  if (systemTexts.length === 0) {
    return { messages, changed: false };
  }

  const systemText = systemTexts.join('\n\n');
  const firstUserIndex = nextMessages.findIndex((message) => message?.role === 'user');

  if (firstUserIndex >= 0) {
    nextMessages[firstUserIndex] = prependTextToUserMessage(nextMessages[firstUserIndex], systemText);
  } else {
    nextMessages.unshift({ role: 'user', content: systemText });
  }

  return { messages: nextMessages, changed: true };
}

function sanitizeClaudeRelayRequestInit(init?: RequestInit): RequestInit | undefined {
  if (!init || typeof init.body !== 'string') {
    return init;
  }

  try {
    const body = JSON.parse(init.body);
    let changed = false;

    if (Array.isArray(body.messages)) {
      const result = sanitizeMessagesForAnthropicRelay(body.messages);
      body.messages = result.messages;
      changed ||= result.changed;
    }

    if (Array.isArray(body.input)) {
      const result = sanitizeMessagesForAnthropicRelay(body.input);
      body.input = result.messages;
      changed ||= result.changed;
    }

    return changed ? { ...init, body: JSON.stringify(body) } : init;
  } catch {
    return init;
  }
}

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
    case 'openrouter': {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'TikTok Video Analyzer',
        },
      });
      return openrouter(config.model);
    }
    case 'deepseek': {
      const deepseek = createOpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
      return deepseek(config.model);
    }
    case 'doubao': {
      const doubao = createOpenAI({
        apiKey,
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      });
      return doubao(config.model);
    }
    case 'onetoken': {
      const onetoken = createOpenAI({
        apiKey,
        baseURL: 'https://onetoken.one/v1',
        fetch: async (url, init) => {
          const requestInit = isClaudeModel(config.model)
            ? sanitizeClaudeRelayRequestInit(init)
            : init;
          const res = await fetch(url, requestInit);
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const clone = res.clone();
            try {
              const json = await clone.json();
              // Unwrap {code, data} relay response format
              if (json.code !== undefined && json.data) {
                return new Response(JSON.stringify(json.data), {
                  status: res.status,
                  headers: res.headers,
                });
              }
            } catch {}
          }
          return res;
        },
      });
      if (isClaudeModel(config.model)) {
        // Avoid the Responses API shape for Claude relays; Chat Completions maps cleanly.
        return onetoken.chat(config.model);
      }
      return onetoken(config.model);
    }
    case 'comeu': {
      const COMEU_MODEL_MAP: Record<string, string> = {
        'gpt-5.5-comeu': 'gpt-5.5',
        'gpt-5.4-comeu': 'gpt-5.4',
        'gpt-5.4-mini-comeu': 'gpt-5.4-mini',
        'gpt-5.3-codex-comeu': 'gpt-5.3-codex',
      };
      const realModel = COMEU_MODEL_MAP[config.model] || config.model.replace('-comeu', '');
      const comeu = createOpenAI({
        apiKey,
        baseURL: 'https://comeu.ai/v1',
      });
      // Use .chat() to force Chat Completions API — @ai-sdk/openai v3 defaults to
      // Responses API which comeu.ai's New API backend doesn't fully support
      return comeu.chat(realModel);
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
    { key: 'script-shot', label: '脚本拆解+分镜分析中...', progress: 12 },
    { key: 'deconstruction', label: '内容拆解中...', progress: 30 },
    { key: 'timeline', label: '时间线分析中...', progress: 48 },
    { key: 'comment', label: '评论分析中...', progress: 65 },
    { key: 'insight', label: '生成洞察+综合归因中...', progress: 85 },
  ];

  let contentDeconstruction = analysis.contentDeconstruction;
  let commentAnalysis = analysis.commentAnalysis;

  aiStore.startAnalysis();

  let anyStepFailed = false;

  for (const step of steps) {
    const config = getModelForTask(step.key, modelPreferences);
    const apiKey = getApiKey(config.provider);
    if (!apiKey) {
      const providerLabels: Record<string, string> = {
        anthropic: 'Anthropic (Claude)',
        openai: 'OpenAI (GPT)',
        google: 'Google (Gemini)',
        openrouter: 'OpenRouter',
        deepseek: 'DeepSeek',
        doubao: '豆包 火山引擎',
        onetoken: 'OneToken 中转站',
        comeu: 'ComeU 中转站',
      };
      const label = providerLabels[config.provider] || config.provider;
      let hint = '';
      if (config.provider === 'google') {
        hint = '（请从 aistudio.google.com 创建 API Key，不是 Google Cloud Console）';
      }
      aiStore.setError(`[${step.label}] 缺少 ${label} 的 API Key（当前使用模型: ${config.model}）。请在设置页面添加 ${label} 的 API Key，或在模型偏好中切换到已配置的模型。${hint}`);
      await analysisStore.updateAnalysis(analysisId, { status: 'error' });
      return;
    }

    aiStore.setStep(step.key, step.progress);

    try {
      const model = createModel(config, apiKey);
      let prompt: string;

      switch (step.key) {
        case 'script-shot': {
          const scriptInput = {
            description: analysis.video.description,
            hashtags: analysis.video.hashtags,
            creatorHandle: analysis.video.creatorHandle,
            duration: analysis.video.duration,
            segments: analysis.contentDeconstruction?.segments?.map(s => ({
              type: s.type,
              startTime: s.startTime,
              endTime: s.endTime,
              description: s.description,
            })),
          };

          const temp = modelPreferences.temperature;

          // Run script breakdown and shot analysis in parallel
          const [scriptResult, shotResult] = await Promise.allSettled([
            (async () => {
              const prompt = buildScriptBreakdownPrompt(scriptInput);
              const opts: any = { model, prompt, timeout: 120000 };
              if (config.provider !== 'openrouter') opts.temperature = temp;
              const result = await generateForModel(opts, config);
              return parseScriptBreakdownResponse(result.text);
            })(),
            (async () => {
              const prompt = buildShotAnalysisPrompt(scriptInput);
              const opts: any = { model, prompt, timeout: 120000 };
              if (config.provider !== 'openrouter') opts.temperature = temp;
              const result = await generateForModel(opts, config);
              return parseShotAnalysisResponse(result.text);
            })(),
          ]);

          let scriptParsed: ScriptBreakdown | null = null;
          let shotParsed: ShotAnalysis | null = null;

          if (scriptResult.status === 'fulfilled' && scriptResult.value) {
            scriptParsed = scriptResult.value;
          } else {
            console.error('脚本拆解失败:', scriptResult.status === 'rejected' ? extractErrorMessage(scriptResult.reason) : 'JSON解析失败');
            anyStepFailed = true;
          }

          if (shotResult.status === 'fulfilled' && shotResult.value) {
            shotParsed = shotResult.value;
          } else {
            console.error('分镜分析失败:', shotResult.status === 'rejected' ? extractErrorMessage(shotResult.reason) : 'JSON解析失败');
            anyStepFailed = true;
          }

          if (scriptParsed || shotParsed) {
            await analysisStore.updateAnalysis(analysisId, {
              scriptBreakdown: scriptParsed,
              shotAnalysis: shotParsed,
            });
          }
          break;
        }

        case 'deconstruction': {
          prompt = buildContentDeconstructionPrompt({
            description: analysis.video.description,
            hashtags: analysis.video.hashtags,
            duration: analysis.video.duration,
            segments: analysis.contentDeconstruction?.segments || [],
            creatorHandle: analysis.video.creatorHandle,
          });

          const callOpts: any = { model, prompt, timeout: 120000 };
          if (config.provider !== 'openrouter') {
            callOpts.temperature = modelPreferences.temperature;
          }
          const result = await generateForModel(callOpts, config);
          const parsed = parseContentDeconstructionResponse(result.text);
          if (parsed) {
            contentDeconstruction = parsed;
            await analysisStore.updateAnalysis(analysisId, { contentDeconstruction: parsed });
          } else {
            console.error('内容拆解JSON解析失败，AI返回:', result.text.slice(0, 200));
            anyStepFailed = true;
            aiStore.addWarning('内容拆解JSON解析失败（模型输出格式异常）');
          }
          break;
        }

        case 'timeline': {
          prompt = buildTimelineAnalysisPrompt({
            description: analysis.video.description,
            hashtags: analysis.video.hashtags,
            duration: analysis.video.duration,
            creatorHandle: analysis.video.creatorHandle,
            existingSegments: contentDeconstruction?.segments?.map(s => ({
              type: s.type,
              startTime: s.startTime,
              endTime: s.endTime,
              description: s.description,
            })),
          });

          const timelineCallOpts: any = { model, prompt, timeout: 120000 };
          if (config.provider !== 'openrouter') {
            timelineCallOpts.temperature = modelPreferences.temperature;
          }
          const timelineResult = await generateForModel(timelineCallOpts, config);
          const timelineParsed = parseTimelineAnalysisResponse(timelineResult.text);
          if (timelineParsed) {
            await analysisStore.updateAnalysis(analysisId, { timelineAnalysis: timelineParsed });
          } else {
            console.error('时间线分析JSON解析失败，AI返回:', timelineResult.text.slice(0, 200));
            anyStepFailed = true;
            aiStore.addWarning('时间线分析JSON解析失败（模型输出格式异常）');
          }
          break;
        }

        case 'comment': {
          if (!analysis.rawComments || analysis.rawComments.length === 0) {
            console.warn('评论分析跳过: 无评论数据');
            break;
          }

          // Split into two lighter calls for free model reliability
          const commentInput = {
            comments: analysis.rawComments,
            videoDescription: analysis.video.description,
            videoHashtags: analysis.video.hashtags,
          };

          // Call 1: Sentiment + Keywords + Summary (lighter)
          let sentimentData: Partial<typeof commentAnalysis> | null = null;
          try {
            const sPrompt = buildCommentSentimentPrompt(commentInput);
            const sOpts: any = { model, prompt: sPrompt, timeout: 120000 };
            if (config.provider !== 'openrouter') {
              sOpts.temperature = modelPreferences.temperature;
            }
            const sResult = await generateForModel(sOpts, config);
            sentimentData = parseCommentSentimentResponse(sResult.text);
            if (!sentimentData) {
              console.error('评论分析#1 JSON解析失败，AI返回:', sResult.text.slice(0, 200));
              aiStore.addWarning('评论情感分析JSON解析失败');
              anyStepFailed = true;
            }
          } catch (err) {
            const msg = extractErrorMessage(err);
            console.error('评论分析#1 调用失败:', msg);
            aiStore.addWarning(`评论情感分析失败: ${msg.slice(0, 80)}`);
            anyStepFailed = true;
          }

          // Call 2: Themes + Questions + Patterns (independent)
          let themesData: Partial<typeof commentAnalysis> | null = null;
          try {
            const tPrompt = buildCommentThemesPrompt(commentInput);
            const tOpts: any = { model, prompt: tPrompt, timeout: 120000 };
            if (config.provider !== 'openrouter') {
              tOpts.temperature = modelPreferences.temperature;
            }
            const tResult = await generateForModel(tOpts, config);
            themesData = parseCommentThemesResponse(tResult.text);
            if (!themesData) {
              console.error('评论分析#2 JSON解析失败，AI返回:', tResult.text.slice(0, 200));
              aiStore.addWarning('评论主题分析JSON解析失败');
              anyStepFailed = true;
            }
          } catch (err) {
            const msg = extractErrorMessage(err);
            console.error('评论分析#2 调用失败:', msg);
            aiStore.addWarning(`评论主题分析失败: ${msg.slice(0, 80)}`);
            anyStepFailed = true;
          }

          // Merge results (show partial data even if one call failed)
          const merged: any = {
            totalComments: analysis.rawComments?.length || 0,
            sentimentDistribution: sentimentData?.sentimentDistribution || { positive: 0, negative: 0, neutral: 100, mixed: 0, overallScore: 0 },
            topKeywords: sentimentData?.topKeywords || [],
            summary: sentimentData?.summary || '',
            themeClusters: themesData?.themeClusters || [],
            userQuestions: themesData?.userQuestions || [],
            engagementPatterns: themesData?.engagementPatterns || [],
            contentCorrelation: themesData?.contentCorrelation || '',
          };

          if (sentimentData || themesData) {
            commentAnalysis = merged;
            await analysisStore.updateAnalysis(analysisId, { commentAnalysis: merged });
          }
          break;
        }

        case 'insight': {
          // Split into two lighter calls to avoid free model limits
          try {
            const insightPrompt = buildInsightPrompt({
              contentDeconstruction: contentDeconstruction || analysis.contentDeconstruction,
              commentAnalysis: commentAnalysis || analysis.commentAnalysis,
              metrics: analysis.metrics,
              videoDescription: analysis.video.description,
              videoHashtags: analysis.video.hashtags,
              skipWhyAnalysis: true,
            });

            const insightCallOpts: any = {
              model,
              prompt: insightPrompt,
              maxRetries: 2,
              timeout: 90000,
            };
            if (config.provider !== 'openrouter') {
              insightCallOpts.temperature = modelPreferences.temperature * 0.7;
            }
            const insightResult = await generateForModel(insightCallOpts, config);
            const insightParsed = parseInsightResponse(insightResult.text);

            if (insightParsed.insights.length > 0) {
              await analysisStore.updateAnalysis(analysisId, { insights: insightParsed.insights });
            }

            // Second call: whyAnalysis only
            const whyPrompt = buildWhyAnalysisPrompt({
              contentDeconstruction: contentDeconstruction || analysis.contentDeconstruction,
              commentAnalysis: commentAnalysis || analysis.commentAnalysis,
              metrics: analysis.metrics,
            });

            const whyCallOpts: any = {
              model,
              prompt: whyPrompt,
              maxRetries: 2,
              timeout: 90000,
            };
            if (config.provider !== 'openrouter') {
              whyCallOpts.temperature = modelPreferences.temperature * 0.7;
            }
            const whyResult = await generateForModel(whyCallOpts, config);
            const whyParsed = parseWhyAnalysisResponse(whyResult.text);
            if (whyParsed) {
              await analysisStore.updateAnalysis(analysisId, { whyAnalysis: whyParsed });
            }

            // Third call: engagement trend (comment timestamps + cross-data peaks)
            try {
              const rawComments = analysis.rawComments || [];
              const duration = analysis.video.duration || 60;
              const timeRefs = extractCommentTimestamps(rawComments, duration);
              const clustered = clusterCommentTimestamps(timeRefs);

              const trendPrompt = buildEngagementTrendPrompt({
                commentTimestamps: clustered,
                scriptBreakdown: analysis.scriptBreakdown,
                shotAnalysis: analysis.shotAnalysis,
                timelineAnalysis: analysis.timelineAnalysis,
                contentDeconstruction: contentDeconstruction || analysis.contentDeconstruction,
                duration,
              });

              const trendOpts: any = { model, prompt: trendPrompt, timeout: 90000 };
              if (config.provider !== 'openrouter') {
                trendOpts.temperature = modelPreferences.temperature * 0.7;
              }
              const trendResult = await generateForModel(trendOpts, config);
              const trendParsed = parseEngagementTrendResponse(trendResult.text);
              if (trendParsed) {
                await analysisStore.updateAnalysis(analysisId, { engagementTrend: trendParsed });
              }
            } catch (trendErr) {
              console.warn('参与度趋势分析跳过:', extractErrorMessage(trendErr));
            }

            if (!insightParsed.insights.length && !whyParsed) {
              anyStepFailed = true;
            }
          } catch (innerErr) {
            const message = extractErrorMessage(innerErr);
            console.error('洞察生成失败:', message);
            anyStepFailed = true;
          }
          break;
        }
      }
    } catch (err) {
      let message = extractErrorMessage(err);
      console.error(`AI分析步骤 [${step.key}] 失败:`, message);
      if (config.provider === 'google' && message.includes('denied access')) {
        message += ' (请从 aistudio.google.com 创建 API Key，不是 Google Cloud Console)';
      }
      anyStepFailed = true;
      aiStore.addWarning(`${step.label}失败: ${message}`);
      // Continue to next step instead of aborting completely
    }

    // Rate-limit delay between steps for free models (avoid 429)
    if (isFreeModel(config.model)) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  aiStore.finishAnalysis();
  const finalStatus = anyStepFailed ? 'partial' : 'complete';
  await analysisStore.updateAnalysis(analysisId, { status: finalStatus });
}
