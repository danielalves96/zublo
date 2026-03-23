import { render, screen } from "@testing-library/react";

import { LogoIcon, LogoWithName } from "./AppLogo";

vi.mock("@/lib/utils", () => ({ cn: (...args: string[]) => args.filter(Boolean).join(" ") }));

describe("AppLogo", () => {
  it("renders LogoIcon with correct aria-label", () => {
    render(<LogoIcon />);
    expect(screen.getByRole("img", { name: "Zublo logo" })).toBeInTheDocument();
  });

  it("renders LogoWithName with correct aria-label", () => {
    render(<LogoWithName />);
    expect(screen.getByRole("img", { name: "Zublo" })).toBeInTheDocument();
  });

  it("applies custom className to LogoIcon", () => {
    render(<LogoIcon className="w-10 h-10" />);
    const el = screen.getByRole("img", { name: "Zublo logo" });
    expect(el.className).toContain("w-10 h-10");
  });
});
