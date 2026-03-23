import { render, screen } from "@testing-library/react";

import type { ApiKeyPermission } from "@/types";

import { PermissionBadge } from "./PermissionBadge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/settings/api-keys/config", () => ({
  API_KEY_PERMISSIONS: [
    { id: "read", labelKey: "perm_read" },
    { id: "write", labelKey: "perm_write" },
  ],
  API_KEY_PERMISSION_COLORS: new Proxy({} as Record<string, { badge: string }>, {
    get: () => ({ badge: "bg-gray-100 text-gray-800" }),
  }),
}));

describe("PermissionBadge", () => {
  it("renders permission label", () => {
    render(<PermissionBadge perm={"read" as ApiKeyPermission} />);
    expect(screen.getByText("perm_read")).toBeInTheDocument();
  });

  it("falls back to perm id when not found", () => {
    render(<PermissionBadge perm={"unknown" as ApiKeyPermission} />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
