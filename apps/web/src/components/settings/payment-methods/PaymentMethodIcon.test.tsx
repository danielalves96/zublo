import { fireEvent, render, screen } from "@testing-library/react";

import { PaymentMethodIcon } from "./PaymentMethodIcon";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const { iconUrl } = vi.hoisted(() => ({
  iconUrl: vi.fn(() => null),
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: { iconUrl },
}));

describe("PaymentMethodIcon", () => {
  it("renders known icon as image for visa", () => {
    const method = { id: "1", name: "Visa", icon: null } as any;
    render(<PaymentMethodIcon method={method} />);
    expect(screen.getByAltText("Visa")).toBeInTheDocument();
  });

  it("renders initials for unknown payment method", () => {
    const method = { id: "2", name: "My Bank", icon: null } as any;
    render(<PaymentMethodIcon method={method} />);
    expect(screen.getByText("MB")).toBeInTheDocument();
  });

  it("renders uploaded icon when paymentMethodsService.iconUrl returns a URL (line 59 truthy branch)", () => {
    iconUrl.mockReturnValueOnce("https://cdn.example.com/my-card.png");
    const method = { id: "5", name: "My Custom Card", icon: "custom.png" } as any;
    render(<PaymentMethodIcon method={method} />);
    const img = screen.getByAltText("My Custom Card");
    expect(img).toHaveAttribute("src", "https://cdn.example.com/my-card.png");
  });

  it("falls back to initials when the image fails to load", () => {
    const method = { id: "3", name: "Visa", icon: null } as any;
    render(<PaymentMethodIcon method={method} />);

    const img = screen.getByAltText("Visa");
    fireEvent.error(img);

    // After error, image is gone and initials are shown
    expect(screen.queryByAltText("Visa")).not.toBeInTheDocument();
    expect(screen.getByText("V")).toBeInTheDocument();
  });
});
