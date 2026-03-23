import { render, screen } from "@testing-library/react";

import { PaymentMethodIcon } from "./PaymentMethodIcon";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: { iconUrl: () => null },
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
});
