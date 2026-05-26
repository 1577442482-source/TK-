import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="glass-card rounded-xl p-10 text-center m-6">
          <AlertTriangle size={40} strokeWidth={1.5} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-200 mb-2">页面出现错误</h2>
          <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={14} /> 刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
