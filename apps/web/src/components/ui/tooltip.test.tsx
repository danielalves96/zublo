import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

describe("Tooltip primitives", () => {
  it("does not show content before hovering the trigger", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows content when the trigger is hovered (delayDuration=0)", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await userEvent.hover(screen.getByText("Hover me"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Tip text");
  });

  it("tooltip content is not rendered when open is false", () => {
    render(
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    // When open=false the tooltip must not show its content
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("TooltipContent has rounded-md and border classes when visible", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await userEvent.hover(screen.getByText("Hover"));
    const content = await screen.findByText("Content", { selector: "div" });
    expect(content).toHaveClass("rounded-md", "border");
  });

  it("TooltipContent merges a custom className", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent className="custom-tip">Body</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await userEvent.hover(screen.getByText("Hover"));
    const content = await screen.findByText("Body", { selector: "div" });
    expect(content).toHaveClass("custom-tip");
  });

  it("shows content immediately when open is forced via defaultOpen", async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>T</TooltipTrigger>
          <TooltipContent>Forced open</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Forced open");
  });
});
