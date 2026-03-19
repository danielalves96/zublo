import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronRight,
  FileSpreadsheet,
  RotateCcw,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUGGESTED_PROMPTS } from "@/components/chat/constants";
import { extractFileChip } from "@/components/chat/utils";
import type { ChatMessage } from "@/types";

interface ChatMessagesPanelProps {
  avatarUrl: string | null;
  hasUserSentMessage: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  onRetry: (index: number) => void;
  onSuggestedPrompt: (prompt: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
  userName?: string;
}

export function ChatMessagesPanel({
  avatarUrl,
  hasUserSentMessage,
  isLoading,
  messages,
  onRetry,
  onSuggestedPrompt,
  scrollRef,
  userName,
}: ChatMessagesPanelProps) {
  const { t } = useTranslation();

  return (
    <div
      ref={scrollRef}
      className="scrollbar-track-transparent scrollbar-thumb-primary/10 relative z-10 flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin"
    >
      <AnimatePresence initial={false}>
        {messages.map((message, index) => {
          const fileChip =
            message.role === "user" ? extractFileChip(message.content) : null;

          return (
            <div key={index} className="flex w-full flex-col gap-2">
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex items-start gap-3.5",
                  message.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 shrink-0 overflow-hidden rounded-2xl border shadow-md transition-transform hover:scale-105",
                    message.role === "user"
                      ? "border-primary/50 bg-primary text-primary-foreground"
                      : "border-primary/20 bg-background text-primary",
                  )}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    {message.role === "user" ? (
                      avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={userName ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5" />
                      )
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    "max-w-[80%] rounded-3xl px-5 py-3.5 text-sm shadow-sm ring-1 md:text-base",
                    message.role === "user"
                      ? "rounded-tr-none bg-primary text-primary-foreground ring-primary/20"
                      : "rounded-tl-none border-transparent bg-background/80 text-foreground ring-border/50",
                  )}
                >
                  {message.role === "user" ? (
                    fileChip?.chip ? (
                      <>
                        {fileChip.text && (
                          <p className="mb-2 whitespace-pre-wrap leading-relaxed">
                            {fileChip.text}
                          </p>
                        )}
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                          <FileSpreadsheet className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="text-sm font-medium">
                            {fileChip.chip}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )
                  ) : (
                    <div className="prose-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc space-y-0.5">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal space-y-0.5">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          code: ({ children }) => (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="mb-2 overflow-x-auto rounded-xl bg-muted p-3 text-xs">
                              {children}
                            </pre>
                          ),
                          h1: ({ children }) => (
                            <h1 className="mb-1 text-base font-bold">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-1 text-sm font-bold">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-1 text-sm font-semibold">
                              {children}
                            </h3>
                          ),
                          table: ({ children }) => (
                            <div className="mb-2 overflow-x-auto">
                              <table className="w-full border-collapse text-xs">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border/50 bg-muted px-2 py-1 text-left font-semibold">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border/50 px-2 py-1">
                              {children}
                            </td>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="mb-2 border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>

              {message.isError && index === messages.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="-mt-4 flex w-full justify-center gap-2 pl-[3.25rem]"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full shadow-sm"
                    onClick={() => onRetry(index)}
                    disabled={isLoading}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Tentar Novamente
                  </Button>
                </motion.div>
              )}
            </div>
          );
        })}
      </AnimatePresence>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
          aria-label={t("chat.ai_thinking")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-background shadow-sm">
            <Bot className="h-5 w-5 animate-pulse text-primary" />
          </div>
          <div className="rounded-3xl rounded-tl-none bg-background/40 px-5 py-3.5 shadow-sm ring-1 ring-border/50">
            <div className="flex h-6 items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
            </div>
          </div>
        </motion.div>
      )}

      {!hasUserSentMessage && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-2 flex flex-wrap gap-2"
        >
          {SUGGESTED_PROMPTS.map((promptKey) => (
            <button
              key={promptKey}
              onClick={() => onSuggestedPrompt(t(promptKey))}
              className="flex items-center gap-1.5 rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-2 text-xs text-foreground transition-all hover:scale-[1.02] hover:border-primary/30 hover:bg-primary/10 active:scale-95"
            >
              <ChevronRight className="h-3 w-3 text-primary/60" />
              {t(promptKey)}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
