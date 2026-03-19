import type {
  ChangeEvent,
  KeyboardEvent,
  RefObject,
  FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Bot, FileSpreadsheet, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PendingFile } from "@/components/chat/chat.types";

interface ChatComposerProps {
  fileInputRef: RefObject<HTMLInputElement>;
  input: string;
  isLoading: boolean;
  onCancel: () => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onRemovePendingFile: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pendingFile: PendingFile | null;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export function ChatComposer({
  fileInputRef,
  input,
  isLoading,
  onCancel,
  onFileSelect,
  onInputChange,
  onKeyDown,
  onRemovePendingFile,
  onSubmit,
  pendingFile,
  textareaRef,
}: ChatComposerProps) {
  const { t } = useTranslation();

  return (
    <div className="relative z-20 border-t bg-background/60 p-6 backdrop-blur-xl">
      {pendingFile && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm font-medium text-foreground">
            {pendingFile.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {pendingFile.rows.length} {t("chat.file_rows")}
          </span>
          <button
            onClick={onRemovePendingFile}
            className="ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={t("chat.file_remove")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="group flex items-end gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={onFileSelect}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          title={t("chat.file_attach_hint")}
          className="h-14 w-14 shrink-0 rounded-2xl border border-transparent text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary disabled:opacity-40"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </Button>

        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              pendingFile ? t("chat.file_add_note") : t("chat.placeholder")
            }
            className="min-h-[56px] max-h-[160px] w-full resize-none rounded-[1.25rem] border-primary/10 bg-background/50 py-4 pl-5 pr-12 text-base shadow-inner transition-all hover:border-primary/30 focus-visible:ring-primary/40"
            disabled={isLoading}
            rows={1}
          />
          <div className="pointer-events-none absolute right-4 top-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary/30">
            <Bot className="h-5 w-5" />
          </div>
        </div>

        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onCancel}
            className="h-14 w-14 shrink-0 rounded-2xl shadow-sm transition-all hover:scale-105 active:scale-90"
            title="Cancelar"
          >
            <Square className="h-5 w-5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() && !pendingFile}
            className="h-14 w-14 shrink-0 rounded-2xl bg-primary shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 active:scale-90 disabled:opacity-50"
            title="Enviar"
          >
            <Send className="h-6 w-6" />
          </Button>
        )}
      </form>

      <div className="mt-5 flex items-center justify-center gap-1.5 px-2 text-center text-[12px] text-muted-foreground dark:text-yellow-500">
        <span>{t("chat.disclaimer")}</span>
      </div>
    </div>
  );
}
