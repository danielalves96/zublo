import {
  DAY_OPTIONS,
  DEFAULT_REMINDERS,
  PROVIDERS,
} from "@/components/settings/notifications/config";

describe("notifications config", () => {
  it("defines unique providers with their field metadata", () => {
    const providerIds = PROVIDERS.map((provider) => provider.id);
    const email = PROVIDERS.find((provider) => provider.id === "email");
    const telegram = PROVIDERS.find((provider) => provider.id === "telegram");

    expect(new Set(providerIds).size).toBe(PROVIDERS.length);
    expect(email).toMatchObject({
      label: "Email",
      enabledKey: "email_enabled",
    });
    expect(telegram?.fields.map((field) => field.key)).toEqual([
      "telegram_bot_token",
      "telegram_chat_id",
    ]);

    for (const provider of PROVIDERS) {
      expect(provider.descriptionKey).toContain("provider_");
      expect(provider.colorClass).toContain("text");
      expect(provider.bgClass).toContain("bg");
      expect(provider.borderClass).toContain("border");
    }
  });

  it("exports the default reminders and selectable day offsets", () => {
    expect(DEFAULT_REMINDERS).toEqual([{ days: 3, hour: 8 }]);
    expect(DAY_OPTIONS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30]);
  });
});
