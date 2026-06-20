import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const newNotif = {
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 50) // keep last 50
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  }
}));
