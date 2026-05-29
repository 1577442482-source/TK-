export type AIProvider = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'deepseek' | 'doubao' | 'onetoken' | 'comeu';
export type TaskType = 'deconstruction' | 'comment' | 'insight' | 'why' | 'script-shot' | 'timeline';

export interface ModelConfig {
  model: string;
  provider: AIProvider;
}

export const MODEL_TO_PROVIDER: Record<string, AIProvider> = {
  // Anthropic
  'claude-opus-4-7': 'anthropic',
  'claude-sonnet-4-6': 'anthropic',
  'claude-haiku-4-5': 'anthropic',
  // OpenAI
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'o4-mini': 'openai',
  // Google
  'gemini-2.5-flash': 'google',
  'gemini-2.5-pro': 'google',
  // OpenRouter (free models — verified clean JSON output)
  'openai/gpt-oss-120b:free': 'openrouter',
  'baidu/cobuddy:free': 'openrouter',
  // 豆包 (火山引擎)
  'doubao-seed-1-6-vision-250815': 'doubao',
  'Doubao-1.5-vision-pro': 'doubao',
  'Doubao-1.5-thinking-pro-vision': 'doubao',
  'doubao-seed-1-6-250815': 'doubao',
  'Doubao-1.5-pro': 'doubao',
  // DeepSeek
  'deepseek-chat': 'deepseek',
  'deepseek-reasoner': 'deepseek',
  // OpenRouter (free vision models)
  'google/gemma-4-31b-it:free': 'openrouter',
  'google/gemma-3-12b-it:free': 'openrouter',
  'qwen/qwen3-vl-30b-a3b-thinking:free': 'openrouter',
  'nvidia/nemotron-nano-12b-v2-vl:free': 'openrouter',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'openrouter',
  // ComeU (OpenAI-compatible relay, WeChat/Alipay top-up)
  'gpt-5.5-comeu': 'comeu',
  'gpt-5.4-comeu': 'comeu',
  'gpt-5.4-mini-comeu': 'comeu',
  'gpt-5.3-codex-comeu': 'comeu',
  // OneToken (OpenAI-compatible relay, one key for all models)
  'gpt-5.1': 'onetoken',
  'gpt-5': 'onetoken',
  'gpt-5.2': 'onetoken',
  'claude-sonnet-4-5': 'onetoken',
  'gemini-3-flash-preview': 'onetoken',
  'gemini-3-flash': 'onetoken',
  'deepseek-v3.2': 'onetoken',
  'qwen3-max': 'onetoken',
};

export function getProviderForModel(modelName: string): AIProvider {
  return MODEL_TO_PROVIDER[modelName] || 'anthropic';
}

export function getModelForTask(
  taskType: TaskType,
  preferences: {
    deconstructionModel: string;
    commentModel: string;
    insightModel: string;
    scriptShotModel: string;
    temperature: number;
  }
): ModelConfig {
  const modelMap: Record<TaskType, string> = {
    deconstruction: preferences.deconstructionModel,
    comment: preferences.commentModel,
    insight: preferences.insightModel,
    why: preferences.insightModel,
    'script-shot': preferences.scriptShotModel,
    timeline: preferences.deconstructionModel,
  };

  const model = modelMap[taskType] || 'claude-sonnet-4-6';
  return {
    model,
    provider: getProviderForModel(model),
  };
}
