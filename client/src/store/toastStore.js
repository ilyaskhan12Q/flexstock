import { create } from 'zustand';

let toastId = 0;

/**
 * useToastStore — global toast queue.
 *
 * Each toast: { id, message, hint, severity, duration }
 * severity: 'success' | 'error' | 'warning' | 'info'
 */
export const useToastStore = create((set) => ({
  toasts: [],

  push: ({ message, hint = '', severity = 'info', duration = 5000 }) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, hint, severity, duration }] }));

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }

    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  dismissAll: () => set({ toasts: [] }),
}));

// ── Convenience helpers ────────────────────────────────────────────────────────

/** Show a success toast */
export const toastSuccess = (message, hint = '', duration = 4000) =>
  useToastStore.getState().push({ message, hint, severity: 'success', duration });

/** Show an error toast (longer duration so user can read it) */
export const toastError = (message, hint = '', duration = 7000) =>
  useToastStore.getState().push({ message, hint, severity: 'error', duration });

/** Show a warning toast */
export const toastWarning = (message, hint = '', duration = 5000) =>
  useToastStore.getState().push({ message, hint, severity: 'warning', duration });

/** Show an info toast */
export const toastInfo = (message, hint = '', duration = 4000) =>
  useToastStore.getState().push({ message, hint, severity: 'info', duration });

/**
 * toastApiError — call from any catch block.
 * Pass the raw Axios error + the extractError function from useApiError().
 *
 * Usage:
 *   import { toastApiError } from '../store/toastStore';
 *   import { extractError } from '../hooks/useApiError';
 *   ...
 *   catch (err) { toastApiError(err, extractError); }
 */
export const toastApiError = (error, extractErrorFn) => {
  const parsed = extractErrorFn(error);
  const fn = parsed.severity === 'warning' ? toastWarning : toastError;
  fn(parsed.message, parsed.hint, parsed.severity === 'error' ? 7000 : 5000);
};
