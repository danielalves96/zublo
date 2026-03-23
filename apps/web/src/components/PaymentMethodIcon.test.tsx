import { render, screen } from "@testing-library/react";

import { getPaymentIconSrc, PaymentMethodIcon } from "./PaymentMethodIcon";

const mockIconUrl = vi.hoisted(() => vi.fn(() => "http://icon.test/custom.png"));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: { iconUrl: mockIconUrl },
}));

describe("getPaymentIconSrc", () => {
  it("returns mapped path for known method name", () => {
    const result = getPaymentIconSrc({ id: "1", name: "Visa", user: "u1" });
    expect(result).toBe("/assets/payments/Visa.png");
  });

  it("returns mapped path case-insensitively", () => {
    const result = getPaymentIconSrc({ id: "1", name: "PayPal", user: "u1" });
    expect(result).toBe("/assets/payments/PayPal.png");
  });

  it("returns null for unknown method name", () => {
    const result = getPaymentIconSrc({ id: "1", name: "Unknown Card", user: "u1" });
    expect(result).toBeNull();
  });

  it("returns iconUrl when method has custom icon", () => {
    const result = getPaymentIconSrc({ id: "1", name: "Visa", icon: "custom.png", user: "u1" });
    expect(result).toBe("http://icon.test/custom.png");
    expect(mockIconUrl).toHaveBeenCalled();
  });
});

describe("PaymentMethodIcon", () => {
  it("renders img when src is available", () => {
    render(<PaymentMethodIcon method={{ id: "1", name: "Visa", user: "u1" }} />);
    const img = screen.getByRole("img", { name: "Visa" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/assets/payments/Visa.png");
  });

  it("renders initials fallback when no icon found", () => {
    render(<PaymentMethodIcon method={{ id: "1", name: "My Card", user: "u1" }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("MC")).toBeInTheDocument();
  });
});
