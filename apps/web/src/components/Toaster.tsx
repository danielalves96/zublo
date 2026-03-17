import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToasts, type Toast } from "@/lib/toast";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export function Toaster() {
  const { toasts, addListener } = useToasts();

  useEffect(() => {
    return addListener();
  }, [addListener]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg",
        toast.type === "error" && "border-red-200 dark:border-red-800",
        toast.type === "success" && "border-green-200 dark:border-green-800",
        toast.type === "info" && "border-blue-200 dark:border-blue-800",
      )}
    >
      {icons[toast.type]}
      <span className="text-sm flex-1">{toast.message}</span>
      <X className="h-4 w-4 text-muted-foreground cursor-pointer shrink-0 mt-0.5" />
    </div>
  );
}
