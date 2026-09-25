"use client";

import { create } from "zustand";

export interface WorkspaceState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarWidth: 256,
  sidebarCollapsed: false,
  isMobileSidebarOpen: false,
  setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
  setSidebarCollapsed: (collapsed: boolean) =>
    set({ sidebarCollapsed: collapsed, sidebarWidth: collapsed ? 64 : 256 }),
  setMobileSidebarOpen: (open: boolean) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
}));
