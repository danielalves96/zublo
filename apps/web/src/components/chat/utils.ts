import type { ChatConversationGroup } from "@/components/chat/chat.types";
import { FILE_MARKER } from "@/components/chat/constants";
import type { ChatConversation } from "@/types";

export async function triggerExportDownload(
  format: string,
  filename: string,
  data: unknown[],
) {
  try {
    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscriptions");
      XLSX.writeFile(workbook, filename);
      return;
    }

    const blob = new Blob([JSON.stringify({ subscriptions: data }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch {
    return;
  }
}

export function extractFileChip(content: string): {
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

  const separator = `\n\n${FILE_MARKER}`;
  const index = content.indexOf(separator);
  if (index !== -1) {
    const rest = content.slice(index + separator.length);
    const end = rest.indexOf("]");

    return {
      text: content.slice(0, index),
      chip: end !== -1 ? rest.slice(0, end) : null,
    };
  }

  return { text: content, chip: null };
}

export function buildConversationTitle(displayContent: string): string {
  return (
    (displayContent || "")
      .replace(/\[planilha:[^\]]*\]/gi, "")
      .replace(/\[PLANILHA ANEXADA:[^\]]*\]/g, "")
      .trim()
      .slice(0, 80) || "New Conversation"
  );
}

export function groupConversations(
  conversations: ChatConversation[],
  labels: Record<string, string>,
): ChatConversationGroup[] {
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

  for (const conversation of conversations) {
    const date = new Date(conversation.updated);
    date.setHours(0, 0, 0, 0);

    if (date >= today) {
      buckets.today.push(conversation);
    } else if (date >= yesterday) {
      buckets.yesterday.push(conversation);
    } else if (date >= last7) {
      buckets.last7.push(conversation);
    } else if (date >= last30) {
      buckets.last30.push(conversation);
    } else {
      buckets.older.push(conversation);
    }
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
    .filter((group) => buckets[group.key].length > 0)
    .map((group) => ({
      label: group.label,
      items: buckets[group.key],
    }));
}
