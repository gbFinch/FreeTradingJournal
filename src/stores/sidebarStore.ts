import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

function getInitialCollapsed(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  }
  return false;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: getInitialCollapsed(),
  toggleCollapsed: () => {
    set((state) => {
      const newCollapsed = !state.isCollapsed;
      localStorage.setItem('sidebarCollapsed', String(newCollapsed));
      return { isCollapsed: newCollapsed };
    });
  },
}));
