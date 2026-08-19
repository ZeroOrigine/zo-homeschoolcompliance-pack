"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastState {
  message: string;
  variant: ToastVariant;
}

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms; set 0 to disable auto-dismiss entirely. */
  duration?: number;
  onDismiss: () => void;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-emerald-700",
  error: "bg-red-700",
  info: "bg-slate-800",
};

/**
 * Shared toast notification — fixes QA-042.
 *
 * Replaces the ad-hoc `fixed bottom-4 right-4` toast blocks on the
 * calendar/students/settings/documents pages:
 *
 * - On narrow viewports the toast sits at `bottom-20` (clear of bottom
 *   action rows such as the calendar modal's Save/Cancel buttons) and spans
 *   `left-4 right-4`; from `sm:` up it returns to the bottom-right corner.
 * - Respects iOS safe-area insets via `env(safe-area-inset-bottom)`.
 * - Always renders an explicit close button with a 44x44px touch target
 *   (h-11/w-11) so it can be dismissed by touch before the auto-timeout.
 * - The auto-dismiss timer pauses while the toast is hovered or focused.
 *
 * Usage:
 *
 *   const { toast, showToast, dismissToast } = useToast();
 *   showToast("Deadline saved", "success");
 *   ...
 *   {toast && (
 *     <Toast message={toast.message} variant={toast.variant} onDismiss={dismissToast} />
 *   )}
 */
export function Toast({
  message,
  variant = "info",
  duration = 4000,
  onDismiss,
}: ToastProps) {
  const [paused, setPaused] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (duration <= 0 || paused) return;
    const timer = setTimeout(() => dismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration, message, paused]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`fixed left-4 right-4 bottom-20 z-50 flex items-center justify-between gap-2 rounded-lg py-2 pl-4 pr-1 text-white shadow-lg sm:left-auto sm:bottom-4 sm:max-w-sm ${VARIANT_CLASSES[variant]}`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => {
          setPaused(true);
          onDismiss();
        }}
        aria-label="Dismiss notification"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Minimal state helper so pages can drop their ad-hoc `useState` toast
 * blocks and adopt the shared component with one line.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      setToast({ message, variant });
    },
    []
  );

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}

export default Toast;
