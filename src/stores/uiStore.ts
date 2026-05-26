import { create } from 'zustand';

interface UIStore {
  sidebarCollapsed: boolean;
  activeTab: string;
  expandedInsightCategories: Record<string, boolean>;

  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  toggleInsightCategory: (category: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activeTab: 'performance',
  expandedInsightCategories: {},

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleInsightCategory: (category) =>
    set((s) => ({
      expandedInsightCategories: {
        ...s.expandedInsightCategories,
        [category]: !s.expandedInsightCategories[category],
      },
    })),
}));
