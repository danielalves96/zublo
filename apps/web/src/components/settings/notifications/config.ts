import type { ElementType } from "react";
import {
  Bell,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Radio,
  Rss,
  Send,
} from "lucide-react";
import type { NotificationsConfig, NotificationReminder } from "@/types";

export type ProviderConfig = {
  id: string;
  label: string;
  descriptionKey: string;
  icon: ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  fields: {
    key: keyof NotificationsConfig;
    labelKey: string;
    type: "text" | "number" | "password" | "email";
    placeholder?: string;
  }[];
  enabledKey: keyof NotificationsConfig;
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "email",
    label: "Email",
    descriptionKey: "provider_email_desc",
    icon: Mail,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/30",
    enabledKey: "email_enabled",
    fields: [
      {
        key: "email_to",
        labelKey: "destination_email",
        type: "email",
        placeholder: "you@domain.com",
      },
    ],
  },
  {
    id: "discord",
    label: "Discord",
    descriptionKey: "provider_discord_desc",
    icon: MessageSquare,
    colorClass: "text-[#5865F2]",
    bgClass: "bg-[#5865F2]/10",
    borderClass: "border-[#5865F2]/30",
    enabledKey: "discord_enabled",
    fields: [
      {
        key: "discord_webhook_url",
        labelKey: "webhook_url",
        type: "text",
        placeholder: "https://discord.com/api/webhooks/…",
      },
    ],
  },
  {
    id: "telegram",
    label: "Telegram",
    descriptionKey: "provider_telegram_desc",
    icon: Send,
    colorClass: "text-[#0088cc]",
    bgClass: "bg-[#0088cc]/10",
    borderClass: "border-[#0088cc]/30",
    enabledKey: "telegram_enabled",
    fields: [
      {
        key: "telegram_bot_token",
        labelKey: "bot_token",
        type: "password",
        placeholder: "123456:ABC-DEF…",
      },
      {
        key: "telegram_chat_id",
        labelKey: "chat_id",
        type: "text",
        placeholder: "123456789",
      },
    ],
  },
  {
    id: "gotify",
    label: "Gotify",
    descriptionKey: "provider_gotify_desc",
    icon: Radio,
    colorClass: "text-[#1660A9]",
    bgClass: "bg-[#1660A9]/10",
    borderClass: "border-[#1660A9]/30",
    enabledKey: "gotify_enabled",
    fields: [
      {
        key: "gotify_url",
        labelKey: "server_url",
        type: "text",
        placeholder: "https://gotify.example.com",
      },
      {
        key: "gotify_token",
        labelKey: "token",
        type: "password",
        placeholder: "AxxxxxxXxxxxxxx",
      },
    ],
  },
  {
    id: "pushover",
    label: "Pushover",
    descriptionKey: "provider_pushover_desc",
    icon: Rss,
    colorClass: "text-[#3DB6EE]",
    bgClass: "bg-[#3DB6EE]/10",
    borderClass: "border-[#3DB6EE]/30",
    enabledKey: "pushover_enabled",
    fields: [
      { key: "pushover_user_key", labelKey: "user_key", type: "password" },
      { key: "pushover_api_token", labelKey: "api_key", type: "password" },
    ],
  },
  {
    id: "ntfy",
    label: "ntfy.sh",
    descriptionKey: "provider_ntfy_desc",
    icon: Bell,
    colorClass: "text-[#31b88e]",
    bgClass: "bg-[#31b88e]/10",
    borderClass: "border-[#31b88e]/30",
    enabledKey: "ntfy_enabled",
    fields: [
      {
        key: "ntfy_url",
        labelKey: "server_url",
        type: "text",
        placeholder: "https://ntfy.sh",
      },
      {
        key: "ntfy_topic",
        labelKey: "topic",
        type: "text",
        placeholder: "mytopic",
      },
    ],
  },
  {
    id: "pushplus",
    label: "Pushplus",
    descriptionKey: "provider_pushplus_desc",
    icon: MessageCircle,
    colorClass: "text-[#ea4c89]",
    bgClass: "bg-[#ea4c89]/10",
    borderClass: "border-[#ea4c89]/30",
    enabledKey: "pushplus_enabled",
    fields: [{ key: "pushplus_token", labelKey: "token", type: "password" }],
  },
  {
    id: "mattermost",
    label: "Mattermost",
    descriptionKey: "provider_mattermost_desc",
    icon: MessageSquare,
    colorClass: "text-[#0058CC]",
    bgClass: "bg-[#0058CC]/10",
    borderClass: "border-[#0058CC]/30",
    enabledKey: "mattermost_enabled",
    fields: [
      {
        key: "mattermost_webhook_url",
        labelKey: "webhook_url",
        type: "text",
      },
    ],
  },
  {
    id: "serverchan",
    label: "ServerChan",
    descriptionKey: "provider_serverchan_desc",
    icon: Send,
    colorClass: "text-[#54b324]",
    bgClass: "bg-[#54b324]/10",
    borderClass: "border-[#54b324]/30",
    enabledKey: "serverchan_enabled",
    fields: [
      { key: "serverchan_send_key", labelKey: "send_key", type: "password" },
    ],
  },
  {
    id: "webhook",
    label: "Custom Webhook",
    descriptionKey: "provider_webhook_desc",
    icon: LinkIcon,
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    borderClass: "border-accent/30",
    enabledKey: "webhook_enabled",
    fields: [
      {
        key: "webhook_url",
        labelKey: "webhook_url",
        type: "text",
        placeholder: "https://api.example.com/webhook",
      },
    ],
  },
];

export const DEFAULT_REMINDERS: NotificationReminder[] = [{ days: 3, hour: 8 }];
export const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30];
