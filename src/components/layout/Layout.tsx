import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  WandSparkles, Library, GitCompare, Lightbulb, Settings,
  Film, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import ErrorBoundary from '../ui/ErrorBoundary';

const NAV_ITEMS = [
  { to: '/analyze', label: '视频分析', icon: WandSparkles },
  { to: '/library', label: '分析库', icon: Library },
  { to: '/compare', label: '视频对比', icon: GitCompare },
  { to: '/patterns', label: '模式库', icon: Lightbulb },
  { to: '/settings', label: '设置', icon: Settings },
];

export default function Layout() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-mesh-flow">
      {/* Mesh orbs */}
      <div className="mesh-orb-1" style={{ top: '10%', left: '5%' }} />
      <div className="mesh-orb-2" style={{ top: '55%', right: '8%' }} />
      <div className="mesh-orb-3" style={{ bottom: '12%', left: '40%' }} />

      {/* Sidebar */}
      <aside className={`glass-sidebar shrink-0 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-[60px]' : 'w-[220px]'} relative z-10`}>
        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/5 flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Film size={20} strokeWidth={1.75} className="text-emerald-400" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-200 whitespace-nowrap">TK视频分析</div>
              <div className="text-[10px] text-slate-500 whitespace-nowrap">Content Lab</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300 border-l-[3px] border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-[3px] border-transparent'
                }`}
              >
                <Icon size={18} strokeWidth={1.75} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 py-3 border-t border-white/5">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!sidebarCollapsed && <span>收起侧栏</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto relative z-[1]">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
