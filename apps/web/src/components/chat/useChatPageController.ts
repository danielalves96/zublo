import { useQueryClient } from "@tanstack/react-query";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  ChatConversationGroup,
  PendingFile,
} from "@/components/chat/chat.types";
import {
  FILE_MARKER,
  MAX_FILE_SIZE_MB,
  MAX_SPREADSHEET_ROWS,
} from "@/components/chat/constants";
import {
  buildConversationTitle,
  groupConversations,
  triggerExportDownload,
} from "@/components/chat/utils";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { aiService } from "@/services/ai";
import { usersService } from "@/services/users";
import type { ChatConversation, ChatMessage, ChatResponse } from "@/types";

export function useChatPageController() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const avatarUrl = user ? usersService.avatarUrl(user) : null;

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasUserSentMessage = messages.some((message) => message.role === "user");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (editingConvId) {
      editInputRef.current?.focus();
    }
  }, [editingConvId]);

  const refreshConversations = useCallback(async () => {
    if (authLoading || !user?.id) {
      return;
    }

    setConvsLoading(true);

    try {
      const data = await aiService.getConversations();
      const conversationList = Array.isArray(
        (data as { conversations?: ChatConversation[] }).conversations,
      )
        ? (data as { conversations: ChatConversation[] }).conversations
        : [];

      setConversations(conversationList);
    } catch (error) {
      console.error("[chat] Failed to load conversations", error);
    } finally {
      setConvsLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      refreshConversations();
    }
  }, [authLoading, refreshConversations, user?.id]);

  const syncConversationList = useCallback(
    (response: ChatResponse, displayMessage: string, conversationId: string | null) => {
      if (!conversationId) {
        const newConversationId = response.conversation_id;
        const nowIso = new Date().toISOString();
        const optimisticTitle =
          (response as { conversation_title?: string }).conversation_title ||
          buildConversationTitle(displayMessage);

        setCurrentConvId(newConversationId);
        setConversations((prev) => {
          if (!newConversationId) {
            return prev;
          }

          if (prev.some((conversation) => conversation.id === newConversationId)) {
            return prev;
          }

          return [
            {
              id: newConversationId,
              title: optimisticTitle,
              created: nowIso,
              updated: nowIso,
            },
            ...prev,
          ];
        });
      } else {
        setConversations((prev) => {
          const index = prev.findIndex(
            (conversation) => conversation.id === response.conversation_id,
          );

          if (index < 0) {
            const nowIso = new Date().toISOString();
            return [
              {
                id: response.conversation_id,
                title: buildConversationTitle(displayMessage),
                created: nowIso,
                updated: nowIso,
              },
              ...prev,
            ];
          }

          const updatedConversation = {
            ...prev[index],
            updated: new Date().toISOString(),
          };

          return [
            updatedConversation,
            ...prev.filter((_, currentIndex) => currentIndex !== index),
          ];
        });
      }

      refreshConversations();
    },
    [refreshConversations],
  );

  const invalidateActionQueries = useCallback(
    async (actionsTaken?: ChatResponse["actions_taken"]) => {
      if (!actionsTaken?.length || !user?.id) {
        return;
      }

      const userId = user.id;
      let didSubscriptions = false;
      let didCategories = false;
      let didPaymentMethods = false;
      let didHousehold = false;
      let didCurrencies = false;

      for (const action of actionsTaken) {
        const actionType = (action as { type?: string }).type;
        const result = action.result as {
          data?: unknown[];
          filename?: string;
          format?: string;
          name?: string;
        };

        if (actionType === "subscription") {
          didSubscriptions = true;
          if (action.tool === "create_subscription") {
            toast.success(
              t("chat.subscription_created", { name: result.name ?? "" }),
            );
          }
        }

        if (actionType === "category") {
          didCategories = true;
        }
        if (actionType === "payment_method") {
          didPaymentMethods = true;
        }
        if (actionType === "household") {
          didHousehold = true;
        }
        if (actionType === "currency") {
          didCurrencies = true;
        }

        if (actionType === "export" && result.data && result.filename) {
          await triggerExportDownload(
            result.format ?? "json",
            result.filename,
            result.data,
          );
        }
      }

      if (didSubscriptions) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.subscriptions.all(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard(userId),
        });
      }
      if (didCategories) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.categories.all(userId),
        });
      }
      if (didPaymentMethods) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentMethods.all(userId),
        });
      }
      if (didHousehold) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.household.all(userId),
        });
      }
      if (didCurrencies) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.currencies.all(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.mainCurrency(userId),
        });
      }
    },
    [queryClient, t, user?.id],
  );

  const executeChatRequest = useCallback(
    async ({
      aiMessage,
      conversationId,
      displayMessage,
    }: {
      aiMessage: ChatMessage;
      conversationId: string | null;
      displayMessage: string;
    }) => {
      abortControllerRef.current = new AbortController();

      try {
        const response = await aiService.chat(
          [aiMessage],
          conversationId,
          displayMessage,
          abortControllerRef.current.signal,
        );

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.message },
        ]);

        syncConversationList(response, displayMessage, conversationId);
        await invalidateActionQueries(response.actions_taken);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Geração cancelada.",
              isError: true,
            },
          ]);
        } else {
          const message =
            error instanceof Error ? error.message : t("chat.error_generic");

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: t("chat.error_message", { error: message }),
              isError: true,
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [invalidateActionQueries, syncConversationList, t],
  );

  const handleNewConversation = useCallback(() => {
    setMessages([welcomeMessage]);
    setCurrentConvId(null);
    setPendingFile(null);
    setInput("");

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [welcomeMessage]);

  const handleLoadConversation = useCallback(
    async (conversationId: string) => {
      if (conversationId === currentConvId) {
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const data = await aiService.getConversationMessages(conversationId);
        setMessages(data.messages.length > 0 ? data.messages : [welcomeMessage]);
        setCurrentConvId(conversationId);
        setPendingFile(null);
        setInput("");

        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      } catch {
        toast.error(t("chat.error_generic"));
      } finally {
        setIsLoading(false);
      }
    },
    [currentConvId, t, welcomeMessage],
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string, event: MouseEvent) => {
      event.stopPropagation();
      setPendingDeleteConvId(conversationId);
    },
    [],
  );

  const handleConfirmDeleteConversation = useCallback(async () => {
    if (!pendingDeleteConvId) {
      return;
    }

    try {
      await aiService.deleteConversation(pendingDeleteConvId);
      setConversations((prev) =>
        prev.filter((conversation) => conversation.id !== pendingDeleteConvId),
      );

      if (pendingDeleteConvId === currentConvId) {
        handleNewConversation();
      }
    } catch {
      toast.error(t("chat.error_generic"));
    } finally {
      setPendingDeleteConvId(null);
    }
  }, [currentConvId, handleNewConversation, pendingDeleteConvId, t]);

  const handleStartRename = useCallback(
    (
      conversationId: string,
      currentTitle: string,
      event: MouseEvent,
    ) => {
      event.stopPropagation();
      setEditingConvId(conversationId);
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
        prev.map((conversation) =>
          conversation.id === editingConvId
            ? { ...conversation, title: editTitle.trim() }
            : conversation,
        ),
      );
    } catch {
      toast.error(t("chat.error_generic"));
    } finally {
      setEditingConvId(null);
    }
  }, [editTitle, editingConvId, t]);

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "xlsx" && extension !== "csv") {
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
        const workbook =
          extension === "csv"
            ? XLSX.read(new TextDecoder().decode(buffer), { type: "string" })
            : XLSX.read(new Uint8Array(buffer), { type: "array" });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        }) as Record<string, unknown>[];

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

  const handleSend = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput ?? input).trim();
      if ((!text && !pendingFile) || isLoading) {
        return;
      }

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

      const displayMessage: ChatMessage = {
        role: "user",
        content: displayContent,
        aiContent,
      };

      setMessages((prev) => [...prev, displayMessage]);
      setInput("");
      setIsLoading(true);

      await executeChatRequest({
        aiMessage: { role: "user", content: aiContent },
        conversationId: currentConvId,
        displayMessage: displayContent,
      });
    },
    [currentConvId, executeChatRequest, input, isLoading, pendingFile, t],
  );

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRetry = useCallback(
    async (index: number) => {
      const userMessage = messages[index - 1];
      if (!userMessage || userMessage.role !== "user") {
        return;
      }

      setMessages((prev) => prev.slice(0, index));
      setIsLoading(true);

      await executeChatRequest({
        aiMessage: {
          role: "user",
          content: userMessage.aiContent || userMessage.content,
        },
        conversationId: currentConvId,
        displayMessage: userMessage.content,
      });
    },
    [currentConvId, executeChatRequest, messages],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const dateLabels = useMemo(
    () => ({
      today: t("chat.today"),
      yesterday: t("chat.yesterday"),
      last7: t("chat.last_7_days"),
      last30: t("chat.last_30_days"),
      older: t("chat.older"),
    }),
    [t],
  );

  const conversationGroups: ChatConversationGroup[] = useMemo(
    () => groupConversations(conversations, dateLabels),
    [conversations, dateLabels],
  );

  return {
    avatarUrl,
    conversationGroups,
    conversations,
    convsLoading,
    currentConvId,
    editInputRef,
    editTitle,
    editingConvId,
    fileInputRef,
    handleCancel,
    handleConfirmDeleteConversation,
    handleConfirmRename,
    handleDeleteConversation,
    handleFileSelect,
    handleKeyDown,
    handleLoadConversation,
    handleNewConversation,
    handleRetry,
    handleSend,
    handleStartRename,
    hasUserSentMessage,
    input,
    isLoading,
    messages,
    pendingDeleteConvId,
    pendingFile,
    refreshConversations,
    scrollRef,
    setEditTitle,
    setEditingConvId,
    setInput,
    setPendingDeleteConvId,
    setPendingFile,
    setSidebarOpen,
    sidebarOpen,
    textareaRef,
    user,
  };
}
