import { create } from 'zustand';
import type { ApiKeyEntry, ModelPreferences } from '../types';
import { DEFAULT_MODEL_PREFERENCES } from '../types';
import * as storage from '../services/storage';
import { generateId } from '../utils/formatters';
import { MODEL_TO_PROVIDER } from '../ai/provider-router';

interface AIStore {
  apiKeys: ApiKeyEntry[];
  modelPreferences: ModelPreferences;
  isAnalyzing: boolean;
  currentStep: string | null;
  progress: number;
  error: string | null;
  warnings: string[];
  settingsLoaded: boolean;

  loadSettings: () => Promise<void>;
  setApiKey: (provider: string, key: string) => Promise<void>;
  removeApiKey: (id: string) => Promise<void>;
  setModelPreference: (taskType: string, model: string) => void;
  setTemperature: (value: number) => void;
  getApiKeyForProvider: (provider: string) => string | null;
  startAnalysis: () => void;
  setStep: (step: string, progress: number) => void;
  finishAnalysis: () => void;
  setError: (error: string) => void;
  addWarning: (warning: string) => void;
  clearError: () => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  apiKeys: [],
  modelPreferences: DEFAULT_MODEL_PREFERENCES,
  isAnalyzing: false,
  currentStep: null,
  progress: 0,
  error: null,
  warnings: [],
  settingsLoaded: false,

  loadSettings: async () => {
    if (get().settingsLoaded) return;
    const keys = await storage.getSetting<ApiKeyEntry[]>('apiKeys');
    const prefs = await storage.getSetting<ModelPreferences>('modelPreferences');
    if (keys) set({ apiKeys: keys });
    if (prefs) {
      // Only keep saved model names that still exist in the provider map
      const valid: any = { ...DEFAULT_MODEL_PREFERENCES };
      const modelKeys = ['deconstructionModel', 'commentModel', 'insightModel', 'scriptShotModel'] as const;
      for (const k of modelKeys) {
        if (prefs[k] && prefs[k] in MODEL_TO_PROVIDER) {
          valid[k] = prefs[k];
        }
      }
      if (typeof prefs.temperature === 'number') valid.temperature = prefs.temperature;
      set({ modelPreferences: valid });
      storage.saveSetting('modelPreferences', valid);
    }
    set({ settingsLoaded: true });
  },

  setApiKey: async (provider, key) => {
    const id = generateId();
    const entry: ApiKeyEntry = {
      id,
      provider: provider as ApiKeyEntry['provider'],
      keyLastFour: key.slice(-4),
      isValid: key.length > 10,
      verifiedAt: undefined,
    };
    // Store the actual key in localStorage (base64 obfuscated)
    const keys = JSON.parse(localStorage.getItem('tk_ai_keys') || '{}');
    keys[provider] = btoa(key);
    localStorage.setItem('tk_ai_keys', JSON.stringify(keys));

    const updated = [...get().apiKeys.filter((k) => k.provider !== provider), entry];
    set({ apiKeys: updated });
    await storage.saveSetting('apiKeys', updated);
  },

  removeApiKey: async (id) => {
    const entry = get().apiKeys.find((k) => k.id === id);
    if (entry) {
      const keys = JSON.parse(localStorage.getItem('tk_ai_keys') || '{}');
      delete keys[entry.provider];
      localStorage.setItem('tk_ai_keys', JSON.stringify(keys));
    }
    const updated = get().apiKeys.filter((k) => k.id !== id);
    set({ apiKeys: updated });
    await storage.saveSetting('apiKeys', updated);
  },

  setModelPreference: (taskType, model) => {
    set((s) => ({
      modelPreferences: { ...s.modelPreferences, [`${taskType}Model`]: model },
    }));
    storage.saveSetting('modelPreferences', get().modelPreferences);
  },

  setTemperature: (value) => {
    set((s) => ({
      modelPreferences: { ...s.modelPreferences, temperature: value },
    }));
    storage.saveSetting('modelPreferences', get().modelPreferences);
  },

  getApiKeyForProvider: (provider) => {
    try {
      const keys = JSON.parse(localStorage.getItem('tk_ai_keys') || '{}');
      const encoded = keys[provider];
      return encoded ? atob(encoded) : null;
    } catch {
      return null;
    }
  },

  startAnalysis: () => set({ isAnalyzing: true, currentStep: 'visual', progress: 0, error: null, warnings: [] }),
  setStep: (step, progress) => set({ currentStep: step, progress }),
  finishAnalysis: () => set({ isAnalyzing: false, currentStep: null, progress: 100 }),
  setError: (error) => set({ isAnalyzing: false, error, progress: 0 }),
  addWarning: (warning) => set((s) => ({ warnings: [...s.warnings, warning] })),
  clearError: () => set({ error: null, warnings: [] }),
}));
