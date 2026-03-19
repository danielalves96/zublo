import type { ChangeEvent, KeyboardEvent, MouseEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Loader2,
  MessageSquare,
  PencilLine,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversationGroup } from "@/components/chat/chat.types";

interface ChatSidebarProps {
  conversationGroups: ChatConversationGroup[];
  convsLoading: boolean;
  currentConvId: string | null;
  editInputRef: RefObject<HTMLInputElement>;
  editTitle: string;
  editingConvId: string | null;
  hasConversations: boolean;
  onClose: () => void;
  onConfirmRename: () => void;
  onDeleteConversation: (convId: string, event: MouseEvent) => void;
  onEditTitleChange: (value: string) => void;
  onLoadConversation: (convId: string) => void;
  onNewConversation: () => void;
  onStartRename: (
    convId: string,
    currentTitle: string,
    event: MouseEvent,
  ) => void;
  onStopRename: () => void;
  sidebarOpen: boolean;
}

export function ChatSidebar({
  conversationGroups,
  convsLoading,
  currentConvId,
  editInputRef,
  editTitle,
  editingConvId,
  hasConversations,
  onClose,
  onConfirmRename,
  onDeleteConversation,
  onEditTitleChange,
  onLoadConversation,
  onNewConversation,
  onStartRename,
  onStopRename,
  sidebarOpen,
}: ChatSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col overflow-hidden rounded-[2rem] border bg-card/70 shadow-xl backdrop-blur-xl",
        sidebarOpen
          ? "fixed inset-y-0 left-0 z-30 rounded-none border-r lg:relative lg:inset-auto lg:z-auto lg:rounded-[2rem] lg:border"
          : "hidden",
      )}
    >
      <div className="flex items-center justify-between border-b px-4 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {t("chat.conversations_title")}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 pb-2 pt-3">
        <button
          onClick={onNewConversation}
          className="flex w-full items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-sm text-foreground transition-all hover:border-primary/30 hover:bg-primary/10"
        >
          <Plus className="h-4 w-4 text-primary" />
          {t("chat.new_conversation")}
        </button>
      </div>

      <div className="scrollbar-track-transparent scrollbar-thumb-primary/10 flex-1 space-y-3 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {convsLoading && !hasConversations && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!convsLoading && !hasConversations && (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {t("chat.no_conversations")}
          </p>
        )}

        {conversationGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>

            {group.items.map((conversation) => (
              <div key={conversation.id} className="group/item relative">
                {editingConvId === conversation.id ? (
                  <div className="flex items-center gap-1 px-1 py-0.5">
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        onEditTitleChange(event.target.value)
                      }
                      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Enter") {
                          onConfirmRename();
                        }
                        if (event.key === "Escape") {
                          onStopRename();
                        }
                      }}
                      onBlur={onConfirmRename}
                      placeholder={t("chat.rename_placeholder")}
                      className="min-w-0 flex-1 rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onConfirmRename();
                      }}
                      className="shrink-0 text-primary transition-colors hover:text-primary/80"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onLoadConversation(conversation.id)}
                    className={cn(
                      "w-full truncate rounded-xl px-3 py-2.5 pr-16 text-left text-xs transition-all hover:bg-primary/8",
                      conversation.id === currentConvId
                        ? "bg-primary/10 font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title={conversation.title}
                  >
                    {conversation.title}
                  </button>
                )}

                {editingConvId !== conversation.id && (
                  <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover/item:flex">
                    <button
                      onClick={(event) =>
                        onStartRename(conversation.id, conversation.title, event)
                      }
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title={t("chat.rename_placeholder")}
                    >
                      <PencilLine className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(event) =>
                        onDeleteConversation(conversation.id, event)
                      }
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title={t("chat.delete_conversation_confirm")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
