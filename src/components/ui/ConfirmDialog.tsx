interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = '确认', onConfirm, onCancel, danger }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onCancel}>
      <div className="glass-card rounded-2xl shadow-xl w-full max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-white/5">
          <h3 className="text-lg font-bold text-slate-200">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-400">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 rounded-lg transition-colors">取消</button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-all btn-press ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
