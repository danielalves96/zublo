import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes, ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

vi.mock("@radix-ui/react-avatar", () => ({
  Root: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  Image: ({
    className,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { className?: string }) => (
    <img className={className} {...props} />
  ),
  Fallback: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

describe("Avatar", () => {
  it("renders the container with rounded-full class", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback delayMs={0}>AB</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("renders fallback text immediately when delayMs is 0", async () => {
    render(
      <Avatar>
        <AvatarFallback delayMs={0}>JD</AvatarFallback>
      </Avatar>,
    );
    expect(await screen.findByText("JD")).toBeInTheDocument();
  });

  it("renders AvatarImage container without throwing and shows fallback when image cannot load", async () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
        <AvatarFallback delayMs={0}>JD</AvatarFallback>
      </Avatar>,
    );
    // In jsdom images never fire the load event, so Radix shows the fallback.
    // We verify the fallback is shown (component renders without errors).
    expect(await screen.findByText("JD")).toBeInTheDocument();
  });

  it("merges custom className on the Avatar root", () => {
    const { container } = render(
      <Avatar className="custom-avatar">
        <AvatarFallback delayMs={0}>X</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass("custom-avatar");
  });

  it("merges custom className on AvatarFallback", async () => {
    render(
      <Avatar>
        <AvatarFallback delayMs={0} className="fallback-custom">
          FB
        </AvatarFallback>
      </Avatar>,
    );
    const fallback = await screen.findByText("FB");
    expect(fallback).toHaveClass("fallback-custom");
  });
});
