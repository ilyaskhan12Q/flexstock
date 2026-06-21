import React, { useEffect, useRef, useState } from 'react';
import { useToastStore } from '../store/toastStore';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  WifiOff,
  Clock,
  ShieldAlert
} from 'lucide-react';

// ── Per-severity config ───────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  success: {
    Icon: CheckCircle,
    bar: 'bg-emerald-500',
    iconColor: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    bg: 'bg-emerald-500/10',
  },
  error: {
    Icon: XCircle,
    bar: 'bg-red-500',
    iconColor: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/10',
    bg: 'bg-red-500/10',
  },
  warning: {
    Icon: AlertTriangle,
    bar: 'bg-amber-400',
    iconColor: 'text-amber-400',
    border: 'border-amber-400/30',
    glow: 'shadow-amber-400/10',
    bg: 'bg-amber-400/10',
  },
  info: {
    Icon: Info,
    bar: 'bg-blue-500',
    iconColor: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/10',
    bg: 'bg-blue-500/10',
  },
};

// ── Single Toast ──────────────────────────────────────────────────────────────
function Toast({ id, message, hint, severity, duration }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());

  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const { Icon, bar, iconColor, border, glow, bg } = cfg;

  // Slide-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Progress bar countdown
  useEffect(() => {
    if (!duration || duration <= 0) return;
    startRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
    }, 50);

    return () => clearInterval(intervalRef.current);
  }, [duration]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => dismiss(id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${border} ${bg}
        shadow-lg ${glow} backdrop-blur-sm
        max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Progress bar */}
      {duration > 0 && (
        <div
          className={`absolute top-0 left-0 h-0.5 ${bar} transition-none`}
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {message}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {hint}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 mt-0.5 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Toast Container — renders the stack ──────────────────────────────────────
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} />
        </div>
      ))}
    </div>
  );
}
