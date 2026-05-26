export type AIProvider = 'anthropic' | 'openai' | 'google';
export type TaskType = 'deconstruction' | 'comment' | 'insight' | 'why';

export interface ModelConfig {
  model: string;
  provider: AIProvider;
}

const MODEL_TO_PROVIDER: Record<string, AIProvider> = {
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
    temperature: number;
  }
): ModelConfig {
  const modelMap: Record<TaskType, string> = {
    deconstruction: preferences.deconstructionModel,
    comment: preferences.commentModel,
    insight: preferences.insightModel,
    why: preferences.insightModel,
  };

  const model = modelMap[taskType] || 'claude-sonnet-4-6';
  return {
    model,
    provider: getProviderForModel(model),
  };
}
