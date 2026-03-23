import { fireEvent, render, screen } from "@testing-library/react";

import { ApiKeyEndpointsReference } from "./ApiKeyEndpointsReference";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("ApiKeyEndpointsReference", () => {
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
});
