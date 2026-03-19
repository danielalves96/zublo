import { useTranslation } from "react-i18next";
import { PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onNewConversation: () => void;
  onToggleSidebar: () => void;
}

export function ChatHeader({
  onNewConversation,
  onToggleSidebar,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label={t("chat.conversations_title")}
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <div>
          <h1 className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
            {t("chat.title")}
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            {t("chat.subtitle")}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onNewConversation}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t("chat.new_conversation")}</span>
      </Button>
    </div>
  );
}
