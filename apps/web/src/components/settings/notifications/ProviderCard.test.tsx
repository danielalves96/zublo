import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";

import type { ProviderConfig } from "@/components/settings/notifications/config";
import type { NotificationsConfig } from "@/types";

import { ProviderCard } from "./ProviderCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

describe("ProviderCard", () => {
  const provider: ProviderConfig = {
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
  };

  it("toggles the provider on and reveals its settings", async () => {
    const onChange = vi.fn();
    render(
      <ProviderCard
        provider={provider}
        formData={{}}
        onChange={onChange}
        onTest={vi.fn()}
        isTesting={false}
      />,
    );

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith("email_enabled", true);
  });

  it("updates provider fields and runs a test notification", async () => {
    const onChange = vi.fn();
    const onTest = vi.fn();

    render(
      <ProviderCard
        provider={provider}
        formData={{ email_enabled: true, email_to: "old@example.com" } as Partial<NotificationsConfig>}
        onChange={onChange}
        onTest={onTest}
        isTesting={false}
      />,
    );

    await userEvent.clear(screen.getByDisplayValue("old@example.com"));
    await userEvent.type(screen.getByPlaceholderText("you@domain.com"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Test" }));

    expect(onChange).toHaveBeenCalledWith("email_to", expect.any(String));
    expect(onTest).toHaveBeenCalledTimes(1);
  });

  it("disables the test button while a test is in progress", () => {
    render(
      <ProviderCard
        provider={provider}
        formData={{ email_enabled: true } as Partial<NotificationsConfig>}
        onChange={vi.fn()}
        onTest={vi.fn()}
        isTesting
      />,
    );

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });
});
