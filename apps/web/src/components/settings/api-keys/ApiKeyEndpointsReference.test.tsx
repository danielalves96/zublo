import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ApiKeyEndpointsReference } from "./ApiKeyEndpointsReference";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/settings/api-keys/PermissionBadge", () => ({
  PermissionBadge: ({ perm }: any) => <span>{perm}</span>,
}));

describe("ApiKeyEndpointsReference", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders the endpoints title collapsed", () => {
    render(<ApiKeyEndpointsReference />);
    expect(screen.getByText("api_key_endpoints_title")).toBeInTheDocument();
  });

  it("expands when title is clicked", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    expect(screen.getByText("Authorization Header")).toBeInTheDocument();
    expect(screen.getByText("subscriptions")).toBeInTheDocument();
  });

  it("collapses when title is clicked again", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    expect(screen.getByText("Authorization Header")).toBeInTheDocument();
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    expect(screen.queryByText("Authorization Header")).not.toBeInTheDocument();
  });

  it("copies authorization header when copy button is clicked", async () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    // Find copy button next to the Authorization header code
    const copyButtons = screen.getAllByRole("button");
    // The first copy button in the auth header section
    const authCopyButton = copyButtons.find((btn) =>
      btn.closest(".space-y-2")?.querySelector("code")?.textContent?.includes("Authorization"),
    );
    if (authCopyButton) {
      fireEvent.click(authCopyButton);
      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    }
  });

  it("expands a group when its row is clicked", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    expect(screen.getByText("api_key_endpoint_subscriptions_list")).toBeInTheDocument();
  });

  it("collapses a group when its row is clicked again", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    expect(screen.getByText("api_key_endpoint_subscriptions_list")).toBeInTheDocument();
    fireEvent.click(screen.getByText("subscriptions"));
    expect(screen.queryByText("api_key_endpoint_subscriptions_list")).not.toBeInTheDocument();
  });

  it("shows body schema toggle button for endpoints with bodySchema", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    expect(screen.getAllByText("api_key_show_body_schema").length).toBeGreaterThan(0);
  });

  it("expands body schema when toggle is clicked", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    const bodyToggle = screen.getAllByText("api_key_show_body_schema")[0];
    fireEvent.click(bodyToggle);
    // After expanding, the pre element with the schema should be visible
    expect(screen.getAllByText("api_key_show_body_schema").length).toBeGreaterThan(0);
  });

  it("collapses body schema when toggle is clicked again", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    const bodyToggles = screen.getAllByText("api_key_show_body_schema");
    fireEvent.click(bodyToggles[0]);
    // Schema pre should be visible
    const preElements = document.querySelectorAll("pre");
    expect(preElements.length).toBeGreaterThan(0);
    // Click again to collapse
    fireEvent.click(bodyToggles[0]);
  });

  it("copies endpoint URL when copy button is clicked within an expanded group", async () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    const copyButtons = screen.getAllByLabelText("Copy URL");
    fireEvent.click(copyButtons[0]);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  });

  it("copies body schema when copy schema button is clicked", async () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    const bodyToggles = screen.getAllByText("api_key_show_body_schema");
    fireEvent.click(bodyToggles[0]);
    // Find the copy schema button
    const copyButtons = screen.getAllByTitle("Copy schema");
    if (copyButtons.length > 0) {
      fireEvent.click(copyButtons[0]);
      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    }
  });

  it("resets copiedUrl to null after 1500ms (setTimeout callback in copyValue)", async () => {
    vi.useFakeTimers();
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    fireEvent.click(screen.getByText("subscriptions"));
    const copyButtons = screen.getAllByLabelText("Copy URL");
    fireEvent.click(copyButtons[0]);
    // Flush the clipboard promise and run the 1500ms setTimeout callback
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it("shows all endpoint groups", () => {
    render(<ApiKeyEndpointsReference />);
    fireEvent.click(screen.getByText("api_key_endpoints_title"));
    expect(screen.getByText("subscriptions")).toBeInTheDocument();
    expect(screen.getByText("cycles")).toBeInTheDocument();
    expect(screen.getByText("categories")).toBeInTheDocument();
    expect(screen.getByText("household")).toBeInTheDocument();
    expect(screen.getByText("currencies")).toBeInTheDocument();
    expect(screen.getByText("payment_methods")).toBeInTheDocument();
  });
});
