import { useTranslation } from "react-i18next";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesPanel } from "@/components/chat/ChatMessagesPanel";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useChatPageController } from "@/components/chat/useChatPageController";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ChatPage() {
  const { t } = useTranslation();
  const {
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
  } = useChatPageController();

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-6xl gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmDialog
        open={!!pendingDeleteConvId}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteConvId(null);
          }
        }}
        title={t("delete")}
        description={t("chat.delete_conversation_confirm")}
        onConfirm={handleConfirmDeleteConversation}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ChatSidebar
        conversationGroups={conversationGroups}
        convsLoading={convsLoading}
        currentConvId={currentConvId}
        editInputRef={editInputRef}
        editTitle={editTitle}
        editingConvId={editingConvId}
        hasConversations={conversations.length > 0}
        onClose={() => setSidebarOpen(false)}
        onConfirmRename={handleConfirmRename}
        onDeleteConversation={handleDeleteConversation}
        onEditTitleChange={setEditTitle}
        onLoadConversation={handleLoadConversation}
        onNewConversation={handleNewConversation}
        onStartRename={handleStartRename}
        onStopRename={() => setEditingConvId(null)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col space-y-3">
        <ChatHeader
          onNewConversation={handleNewConversation}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
        />

        <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border bg-card/40 shadow-xl backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none" />

          <ChatMessagesPanel
            avatarUrl={avatarUrl}
            hasUserSentMessage={hasUserSentMessage}
            isLoading={isLoading}
            messages={messages}
            onRetry={handleRetry}
            onSuggestedPrompt={(prompt) => void handleSend(prompt)}
            scrollRef={scrollRef}
            userName={user?.name}
          />

          <ChatComposer
            fileInputRef={fileInputRef}
            input={input}
            isLoading={isLoading}
            onCancel={handleCancel}
            onFileSelect={handleFileSelect}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onRemovePendingFile={() => setPendingFile(null)}
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
            pendingFile={pendingFile}
            textareaRef={textareaRef}
          />
        </Card>
      </div>
    </div>
  );
}
