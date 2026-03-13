import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const listeners: Array<(toast: Toast) => void> = [];

export function addToast(message: string, type: ToastType = "info") {
  const toast: Toast = {
    id: Date.now().toString(),
    message,
    type,
  };
  listeners.forEach((l) => l(toast));
}

export function toast(message: string) {
  addToast(message, "success");
}
toast.error = (message: string) => addToast(message, "error");
toast.success = (message: string) => addToast(message, "success");
toast.info = (message: string) => addToast(message, "info");

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addListener = useCallback(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 5000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { toasts, addListener };
}
