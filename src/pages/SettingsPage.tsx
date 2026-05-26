import { useEffect, useState } from 'react';
import { Key, Eye, EyeOff, Trash2, Check, Settings2, Download, Upload, AlertTriangle } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAIStore } from '../stores/aiStore';
import { useAnalysisStore } from '../stores/analysisStore';
import { exportAnalysesAsJSON } from '../services/exportService';
import { DEFAULT_MODEL_PREFERENCES } from '../types';

const PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic (Claude)', models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
  { key: 'openai', label: 'OpenAI (GPT)', models: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'] },
  { key: 'google', label: 'Google (Gemini)', models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
];

const TASK_TYPES = [
  { key: 'deconstructionModel', label: '内容拆解' },
  { key: 'commentModel', label: '评论分析' },
  { key: 'insightModel', label: '洞察生成' },
];

export default function SettingsPage() {
  const { apiKeys, modelPreferences, loadSettings, setApiKey, removeApiKey, setModelPreference, setTemperature } = useAIStore();
  const { analyses, deleteAllAnalyses } = useAnalysisStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showClear, setShowClear] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSaveKey = async (provider: string) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    await setApiKey(provider, key);
    setKeyInputs(prev => ({ ...prev, [provider]: '' }));
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      setImportError('');
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const records = Array.isArray(data) ? data : [data];
        const { saveAnalysis } = await import('../services/storage');
        let imported = 0;
        for (const record of records) {
          if (record.id && record.video && record.metrics) {
            await saveAnalysis(record);
            imported++;
          }
        }
        const { useAnalysisStore } = await import('../stores/analysisStore');
        await useAnalysisStore.getState().loadAllAnalyses();
        alert(`成功导入 ${imported} 条分析记录`);
      } catch {
        setImportError('文件格式错误，请选择 JSON 格式的分析导出文件');
      }
      setImporting(false);
    };
    input.click();
  };

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold gradient-text mb-8">设置</h1>

        <div className="space-y-6 stagger-children">
          {/* API Keys */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Key size={16} strokeWidth={1.75} className="text-amber-400" />
              API Key 管理
            </h2>
            <p className="text-xs text-slate-500 mb-4">API Key 仅存储在浏览器本地，不会上传到任何服务器。</p>
            {PROVIDERS.map(({ key: provider, label }) => {
              const entry = apiKeys.find(k => k.provider === provider);
              return (
                <div key={provider} className="mb-4 p-4 border border-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">{label}</span>
                    {entry && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check size={12} /> 已配置 (··{entry.keyLastFour})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[provider] ? 'text' : 'password'}
                        value={keyInputs[provider] ?? ''}
                        onChange={e => setKeyInputs(prev => ({ ...prev, [provider]: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-white/5 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder={entry ? '输入新 Key 替换' : '输入 API Key'}
                      />
                      <button
                        onClick={() => setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showKeys[provider] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSaveKey(provider)}
                      disabled={!keyInputs[provider]?.trim()}
                      className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors"
                    >
                      保存
                    </button>
                    {entry && (
                      <button onClick={() => removeApiKey(entry.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Model Preferences */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Settings2 size={16} strokeWidth={1.75} className="text-teal-400" />
              模型偏好
            </h2>
            <div className="space-y-4">
              {TASK_TYPES.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}模型</label>
                  <select
                    value={(modelPreferences as any)[key] || DEFAULT_MODEL_PREFERENCES[key as keyof typeof DEFAULT_MODEL_PREFERENCES]}
                    onChange={e => setModelPreference(key.replace('Model', ''), e.target.value)}
                    className="w-full px-3 py-2 border border-white/5 rounded-lg text-sm bg-glass-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {PROVIDERS.flatMap(p => p.models.map(m => (
                      <option key={m} value={m}>{m} ({p.label.split(' ')[0]})</option>
                    )))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">温度 (创造力): {modelPreferences.temperature || DEFAULT_MODEL_PREFERENCES.temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={modelPreferences.temperature || DEFAULT_MODEL_PREFERENCES.temperature}
                  onChange={e => setTemperature(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>精确 (0)</span>
                  <span>创造 (1)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="glass-card rounded-xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">数据管理</h2>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => exportAnalysesAsJSON(analyses)} className="px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2">
                <Download size={14} /> 导出全部 ({analyses.length}条)
              </button>
              <button onClick={handleImport} disabled={importing} className="px-4 py-2 text-sm text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors flex items-center gap-2">
                <Upload size={14} /> {importing ? '导入中...' : '导入数据'}
              </button>
              <button onClick={() => setShowClear(true)} className="px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                <AlertTriangle size={14} /> 清除全部数据
              </button>
            </div>
            {importError && <p className="text-xs text-red-400 mt-2">{importError}</p>}
          </section>
        </div>

        <ConfirmDialog
          open={showClear}
          title="清除全部数据"
          message={`确定要删除全部 ${analyses.length} 条分析记录吗？此操作不可撤销。建议先导出备份。`}
          confirmLabel="确认清除"
          onConfirm={async () => { await deleteAllAnalyses(); setShowClear(false); }}
          onCancel={() => setShowClear(false)}
          danger
        />
      </div>
    </PageTransition>
  );
}
