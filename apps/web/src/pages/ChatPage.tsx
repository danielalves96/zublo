import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  User,
  Bot,
  Sparkles,
  Loader2,
  Plus,
  ChevronRight,
  FileSpreadsheet,
  X,
  MessageSquare,
  Trash2,
  PencilLine,
  Check,
  PanelLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { aiService } from "@/services/ai";
import { usersService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import type { ChatMessage, ChatConversation } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MAX_SPREADSHEET_ROWS = 150;
const MAX_FILE_SIZE_MB = 5;
const FILE_MARKER = "[planilha:";

interface PendingFile {
  name: string;
  rows: Record<string, unknown>[];
  headers: string[];
}

async function triggerExportDownload(
  format: string,
  filename: string,
  data: unknown[],
) {
  try {
    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Subscriptions");
      XLSX.writeFile(wb, filename);
    } else {
      const blob = new Blob(
        [JSON.stringify({ subscriptions: data }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (_) {
    return;
  }
}

function extractFileChip(content: string): {
  text: string;
  chip: string | null;
} {
  if (content.startsWith(FILE_MARKER)) {
    const end = content.indexOf("]");
    return {
      text: "",
      chip: end !== -1 ? content.slice(FILE_MARKER.length, end) : null,
    };
  }
  const sep = "\n\n" + FILE_MARKER;
  const idx = content.indexOf(sep);
  if (idx !== -1) {
    const rest = content.slice(idx + sep.length);
    const end = rest.indexOf("]");
    return {
      text: content.slice(0, idx),
      chip: end !== -1 ? rest.slice(0, end) : null,
    };
  }
  return { text: content, chip: null };
}

function buildConversationTitle(displayContent: string): string {
  return (
    (displayContent || "")
      .replace(/\[planilha:[^\]]*\]/gi, "")
      .replace(/\[PLANILHA ANEXADA:[^\]]*\]/g, "")
      .trim()
      .slice(0, 80) || "New Conversation"
  );
}

/** Groups conversations into labelled buckets for the sidebar. */
function groupConversations(
  convs: ChatConversation[],
  labels: Record<string, string>,
): { label: string; items: ChatConversation[] }[] {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);
  const last30 = new Date(today);
  last30.setDate(last30.getDate() - 30);

  const buckets: Record<string, ChatConversation[]> = {
    today: [],
    yesterday: [],
    last7: [],
    last30: [],
    older: [],
  };

  for (const c of convs) {
    const d = new Date(c.updated);
    d.setHours(0, 0, 0, 0);
    if (d >= today) buckets.today.push(c);
    else if (d >= yesterday) buckets.yesterday.push(c);
    else if (d >= last7) buckets.last7.push(c);
    else if (d >= last30) buckets.last30.push(c);
    else buckets.older.push(c);
  }

  return (
    [
      { key: "today", label: labels.today },
      { key: "yesterday", label: labels.yesterday },
      { key: "last7", label: labels.last7 },
      { key: "last30", label: labels.last30 },
      { key: "older", label: labels.older },
    ] as const
  )
    .filter((g) => buckets[g.key].length > 0)
    .map((g) => ({ label: g.label, items: buckets[g.key] }));
}

const SUGGESTED_PROMPTS = [
  "chat.suggested_1",
  "chat.suggested_2",
  "chat.suggested_3",
  "chat.suggested_4",
];

export function ChatPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const avatarUrl = user ? usersService.avatarUrl(user) : null;
  const qc = useQueryClient();

  const welcomeMessage = useMemo<ChatMessage>(
    () => ({
      role: "assistant",
      content: t("chat.welcome"),
    }),
    [t],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  // Open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [pendingDeleteConvId, setPendingDeleteConvId] = useState<string | null>(
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Derived — avoids a separate state just for "has the user sent anything?"
  const hasUserSentMessage = messages.some((m) => m.role === "user");

  // ── Scroll to bottom on new messages ──────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // ── Focus edit input when rename starts ───────────────────────
  useEffect(() => {
    if (editingConvId) editInputRef.current?.focus();
  }, [editingConvId]);

  // ── Load conversation list on mount ───────────────────────────
  const refreshConversations = useCallback(async () => {
    if (authLoading || !user?.id) return;
    setConvsLoading(true);
    try {
      const data = await aiService.getConversations();
      const convs = Array.isArray(
        (data as { conversations?: ChatConversation[] }).conversations,
      )
        ? (data as { conversations: ChatConversation[] }).conversations
        : [];
      setConversations(convs);
    } catch (err) {
      console.error("[chat] Failed to load conversations", err);
    } finally {
      setConvsLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      refreshConversations();
    }
  }, [authLoading, user?.id, refreshConversations]);

  // ── New conversation ───────────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    setMessages([welcomeMessage]);
    setCurrentConvId(null);
    setPendingFile(null);
    setInput("");
    if (window.innerWidth < 1024) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load existing conversation ────────────────────────────────
  const handleLoadConversation = useCallback(
    async (convId: string) => {
      if (convId === currentConvId) {
        if (window.innerWidth < 1024) setSidebarOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await aiService.getConversationMessages(convId);
        setMessages(
          data.messages.length > 0 ? data.messages : [welcomeMessage],
        );
        setCurrentConvId(convId);
        setPendingFile(null);
        setInput("");
        if (window.innerWidth < 1024) setSidebarOpen(false);
      } catch {
        toast.error(t("chat.error_generic"));
      } finally {
        setIsLoading(false);
      }
    },
    [currentConvId, t, welcomeMessage],
  );

  // ── Delete conversation ───────────────────────────────────────
  const handleDeleteConversation = useCallback(
    (convId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setPendingDeleteConvId(convId);
    },
    [],
  );

  const handleConfirmDeleteConversation = useCallback(async () => {
    if (!pendingDeleteConvId) return;
    try {
      await aiService.deleteConversation(pendingDeleteConvId);
      setConversations((prev) =>
        prev.filter((c) => c.id !== pendingDeleteConvId),
      );
      if (pendingDeleteConvId === currentConvId) handleNewConversation();
    } catch {
      toast.error(t("chat.error_generic"));
    } finally {
      setPendingDeleteConvId(null);
    }
  }, [pendingDeleteConvId, currentConvId, handleNewConversation, t]);

  // ── Rename conversation ───────────────────────────────────────
  const handleStartRename = useCallback(
    (convId: string, currentTitle: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingConvId(convId);
      setEditTitle(currentTitle);
    },
    [],
  );

  const handleConfirmRename = useCallback(async () => {
    if (!editingConvId || !editTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    try {
      await aiService.renameConversation(editingConvId, editTitle.trim());
      setConversations((prev) =>
        prev.map((c) =>
          c.id === editingConvId ? { ...c, title: editTitle.trim() } : c,
        ),
      );
    } catch {
      toast.error(t("chat.error_generic"));
    } finally {
      setEditingConvId(null);
    }
  }, [editingConvId, editTitle, t]);

  // ── File select ───────────────────────────────────────────────
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "csv") {
        toast.error(t("chat.file_type_error"));
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(t("chat.file_size_error", { mb: MAX_FILE_SIZE_MB }));
        return;
      }

      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        let wb: ReturnType<typeof XLSX.read>;
        if (ext === "csv") {
          wb = XLSX.read(new TextDecoder().decode(buffer), { type: "string" });
        } else {
          wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
        }
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<
          string,
          unknown
        >[];
        if (rows.length === 0) {
          toast.error(t("chat.file_empty_error"));
          return;
        }
        setPendingFile({
          name: file.name,
          rows,
          headers: Object.keys(rows[0]),
        });
      } catch {
        toast.error(t("chat.file_parse_error"));
      }
    },
    [t],
  );

  // ── Send message ──────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput ?? input).trim();
      if ((!text && !pendingFile) || isLoading) return;

      let aiContent = text;
      let displayContent = text;

      if (pendingFile) {
        const rows = pendingFile.rows.slice(0, MAX_SPREADSHEET_ROWS);
        const truncated = pendingFile.rows.length > MAX_SPREADSHEET_ROWS;
        const spreadsheetBlock =
          `[PLANILHA ANEXADA: ${pendingFile.name} | ${pendingFile.rows.length} ${t("chat.file_rows")} | Colunas: ${pendingFile.headers.join(", ")}]\n` +
          "```json\n" +
          JSON.stringify(rows) +
          "\n```" +
          (truncated
            ? `\n(Nota: apenas as primeiras ${MAX_SPREADSHEET_ROWS} de ${pendingFile.rows.length} linhas foram incluídas)`
            : "");

        aiContent = text ? `${text}\n\n${spreadsheetBlock}` : spreadsheetBlock;
        const chipLabel = `${pendingFile.name} (${pendingFile.rows.length} ${t("chat.file_rows")})`;
        displayContent = text
          ? `${text}\n\n${FILE_MARKER}${chipLabel}]`
          : `${FILE_MARKER}${chipLabel}]`;
        setPendingFile(null);
      }

      const displayMsg: ChatMessage = { role: "user", content: displayContent };
      const aiMsg: ChatMessage = { role: "user", content: aiContent };

      setMessages((prev) => [...prev, displayMsg]);
      setInput("");
      setIsLoading(true);

      try {
        // Send only the new message; backend loads history from DB for existing conversations.
        const response = await aiService.chat(
          [aiMsg],
          currentConvId,
          displayContent,
        );

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.message },
        ]);

        // Update conversation tracking
        if (!currentConvId) {
          const newConvId = response.conversation_id;
          const nowIso = new Date().toISOString();
          const optimisticTitle =
            (response as { conversation_title?: string }).conversation_title ||
            buildConversationTitle(displayContent);

          setCurrentConvId(newConvId);
          // Optimistic sidebar insert so the conversation appears immediately
          setConversations((prev) => {
            if (!newConvId) return prev;
            const alreadyExists = prev.some((c) => c.id === newConvId);
            if (alreadyExists) return prev;
            return [
              {
                id: newConvId,
                title: optimisticTitle,
                created: nowIso,
                updated: nowIso,
              },
              ...prev,
            ];
          });
          refreshConversations();
        } else {
          // Bump this conversation to the top of the list
          setConversations((prev) => {
            const idx = prev.findIndex(
              (c) => c.id === response.conversation_id,
            );
            if (idx < 0) {
              const nowIso = new Date().toISOString();
              return [
                {
                  id: response.conversation_id,
                  title: buildConversationTitle(displayContent),
                  created: nowIso,
                  updated: nowIso,
                },
                ...prev,
              ];
            }
            const updated = { ...prev[idx], updated: new Date().toISOString() };
            return [updated, ...prev.filter((_, i) => i !== idx)];
          });
          refreshConversations();
        }

        // Cache invalidation for mutations
        if (
          response.actions_taken &&
          response.actions_taken.length > 0 &&
          user?.id
        ) {
          const uid = user.id;
          let didSub = false,
            didCat = false,
            didPm = false,
            didHh = false,
            didCur = false;
          for (const action of response.actions_taken) {
            const type = (action as { type?: string }).type;
            const result = action.result as {
              name?: string;
              format?: string;
              filename?: string;
              data?: unknown[];
            };
            if (type === "subscription") {
              didSub = true;
              if (action.tool === "create_subscription")
                toast.success(
                  t("chat.subscription_created", { name: result.name ?? "" }),
                );
            }
            if (type === "category") didCat = true;
            if (type === "payment_method") didPm = true;
            if (type === "household") didHh = true;
            if (type === "currency") didCur = true;
            if (type === "export" && result.data && result.filename)
              triggerExportDownload(
                result.format ?? "json",
                result.filename,
                result.data,
              );
          }
          if (didSub) {
            qc.invalidateQueries({
              queryKey: queryKeys.subscriptions.all(uid),
            });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(uid) });
          }
          if (didCat)
            qc.invalidateQueries({ queryKey: queryKeys.categories.all(uid) });
          if (didPm)
            qc.invalidateQueries({
              queryKey: queryKeys.paymentMethods.all(uid),
            });
          if (didHh)
            qc.invalidateQueries({ queryKey: queryKeys.household.all(uid) });
          if (didCur) {
            qc.invalidateQueries({ queryKey: queryKeys.currencies.all(uid) });
            qc.invalidateQueries({ queryKey: queryKeys.mainCurrency(uid) });
          }
        }
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : t("chat.error_generic");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: t("chat.error_message", { error: msg }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      input,
      pendingFile,
      isLoading,
      currentConvId,
      user,
      qc,
      t,
      refreshConversations,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Date group labels (memoised-ish via inline object) ────────
  const dateLabels = {
    today: t("chat.today"),
    yesterday: t("chat.yesterday"),
    last7: t("chat.last_7_days"),
    last30: t("chat.last_30_days"),
    older: t("chat.older"),
  };
  const groups = groupConversations(conversations, dateLabels);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-140px)] max-w-6xl mx-auto gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmDialog
        open={!!pendingDeleteConvId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConvId(null);
        }}
        title={t("delete")}
        description={t("chat.delete_conversation_confirm")}
        onConfirm={handleConfirmDeleteConversation}
      />

      {/* ── Mobile overlay ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          "w-64 shrink-0 flex flex-col overflow-hidden",
          "rounded-[2rem] border shadow-xl",
          "bg-card/70 backdrop-blur-xl",
          // Mobile: fixed overlay when open; desktop: in document flow
          sidebarOpen
            ? "fixed inset-y-0 left-0 z-30 rounded-none border-r lg:relative lg:inset-auto lg:z-auto lg:rounded-[2rem] lg:border"
            : "hidden",
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {t("chat.conversations_title")}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New conversation button */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 text-sm px-3 py-2.5 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/15 hover:border-primary/30 text-foreground transition-all"
          >
            <Plus className="w-4 h-4 text-primary" />
            {t("chat.new_conversation")}
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
          {convsLoading && conversations.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!convsLoading && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-2">
              {t("chat.no_conversations")}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 py-1">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <div key={conv.id} className="relative group/item">
                  {editingConvId === conv.id ? (
                    <div className="flex items-center gap-1 px-1 py-0.5">
                      <input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmRename();
                          if (e.key === "Escape") setEditingConvId(null);
                        }}
                        onBlur={handleConfirmRename}
                        placeholder={t("chat.rename_placeholder")}
                        className="flex-1 text-xs bg-background border border-primary/30 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 min-w-0"
                      />
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleConfirmRename();
                        }}
                        className="text-primary hover:text-primary/80 transition-colors shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleLoadConversation(conv.id)}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2.5 rounded-xl transition-all",
                        "hover:bg-primary/8 truncate pr-16",
                        conv.id === currentConvId
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      title={conv.title}
                    >
                      {conv.title}
                    </button>
                  )}
                  {editingConvId !== conv.id && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/item:flex items-center gap-0.5">
                      <button
                        onClick={(e) =>
                          handleStartRename(conv.id, conv.title, e)
                        }
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t("chat.rename_placeholder")}
                      >
                        <PencilLine className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t("chat.delete_conversation_confirm")}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main chat column ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label={t("chat.conversations_title")}
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="p-2.5 bg-primary/10 rounded-2xl shadow-sm border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                {t("chat.title")}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {t("chat.subtitle")}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {t("chat.new_conversation")}
            </span>
          </Button>
        </div>

        {/* Chat card */}
        <Card className="flex-1 flex flex-col overflow-hidden rounded-[2rem] border shadow-xl bg-card/40 backdrop-blur-md relative min-h-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent relative z-10"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const chip =
                  msg.role === "user" ? extractFileChip(msg.content) : null;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                      "flex items-start gap-3.5",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-md transition-transform hover:scale-105 overflow-hidden",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground border-primary/50"
                          : "bg-background text-primary border-primary/20",
                      )}
                    >
                      {msg.role === "user" ? (
                        avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={user?.name ?? ""}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5" />
                        )
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>

                    <div
                      className={cn(
                        "max-w-[80%] rounded-3xl px-5 py-3.5 text-sm md:text-base shadow-sm ring-1",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none ring-primary/20"
                          : "bg-background/80 text-foreground border-transparent rounded-tl-none ring-border/50",
                      )}
                    >
                      {msg.role === "user" ? (
                        chip?.chip ? (
                          <>
                            {chip.text && (
                              <p className="whitespace-pre-wrap leading-relaxed mb-2">
                                {chip.text}
                              </p>
                            )}
                            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                              <FileSpreadsheet className="w-4 h-4 shrink-0 opacity-80" />
                              <span className="text-sm font-medium">
                                {chip.chip}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
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
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-muted p-3 rounded-xl text-xs overflow-x-auto mb-2">
                                  {children}
                                </pre>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-base font-bold mb-1">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-sm font-bold mb-1">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold mb-1">
                                  {children}
                                </h3>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto mb-2">
                                  <table className="w-full text-xs border-collapse">
                                    {children}
                                  </table>
                                </div>
                              ),
                              th: ({ children }) => (
                                <th className="border border-border/50 px-2 py-1 bg-muted font-semibold text-left">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="border border-border/50 px-2 py-1">
                                  {children}
                                </td>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground mb-2">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-4"
                aria-label={t("chat.ai_thinking")}
              >
                <div className="w-10 h-10 rounded-2xl bg-background border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="bg-background/40 ring-1 ring-border/50 rounded-3xl rounded-tl-none px-5 py-3.5 shadow-sm">
                  <div className="flex gap-1.5 items-center h-6">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Suggested prompts */}
            {!hasUserSentMessage && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2 mt-2"
              >
                {SUGGESTED_PROMPTS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleSend(t(key))}
                    className="flex items-center gap-1.5 text-xs bg-primary/5 hover:bg-primary/10 border border-primary/15 hover:border-primary/30 text-foreground rounded-2xl px-3.5 py-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <ChevronRight className="w-3 h-3 text-primary/60" />
                    {t(key)}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Input area */}
          <div className="p-6 bg-background/60 border-t backdrop-blur-xl relative z-20">
            {pendingFile && (
              <div className="flex items-center gap-2.5 mb-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2.5">
                <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {pendingFile.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {pendingFile.rows.length} {t("chat.file_rows")}
                </span>
                <button
                  onClick={() => setPendingFile(null)}
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label={t("chat.file_remove")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                title={t("chat.file_attach_hint")}
                className="rounded-2xl h-14 w-14 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all disabled:opacity-40"
              >
                <FileSpreadsheet className="w-5 h-5" />
              </Button>

              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    pendingFile
                      ? t("chat.file_add_note")
                      : t("chat.placeholder")
                  }
                  className="w-full bg-background/50 border-primary/10 hover:border-primary/30 focus-visible:ring-primary/40 rounded-[1.25rem] min-h-[56px] max-h-[160px] pl-5 pr-12 py-4 text-base shadow-inner transition-all resize-none"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="absolute right-4 top-4 text-muted-foreground/30 group-focus-within:text-primary/30 transition-colors pointer-events-none">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <Button
                type="submit"
                size="icon"
                disabled={isLoading || (!input.trim() && !pendingFile)}
                className="rounded-2xl h-14 w-14 shrink-0 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-90 hover:scale-105 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[12px] dark:text-yellow-500 text-muted-foreground text-center px-2">
              <span>{t("chat.disclaimer")}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
