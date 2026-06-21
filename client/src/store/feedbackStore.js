import { create } from 'zustand';

export const useFeedbackStore = create((set) => ({
  open: false,
  isSuccess: true,
  title: '',
  message: '',
  showSuccess: (title, message) => set({ open: true, isSuccess: true, title, message }),
  showError: (title, message) => set({ open: true, isSuccess: false, title, message }),
  close: () => set({ open: false })
}));
