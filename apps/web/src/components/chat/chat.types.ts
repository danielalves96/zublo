import type { ChatConversation } from "@/types";

export interface PendingFile {
  name: string;
  rows: Record<string, unknown>[];
  headers: string[];
}

export interface ChatConversationGroup {
  label: string;
  items: ChatConversation[];
}
