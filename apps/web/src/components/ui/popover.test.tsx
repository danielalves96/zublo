import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

describe("Popover primitives", () => {
  it("does not render content before the trigger is clicked", () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );
    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();
  });

  it("renders content into the portal after trigger click", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Popover body")).toBeInTheDocument();
  });

  it("closes the popover when the trigger is clicked again", async () => {
    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverContent>Toggled content</PopoverContent>
      </Popover>,
    );
    await userEvent.click(screen.getByText("Toggle"));
    expect(screen.getByText("Toggled content")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Toggle"));
    expect(screen.queryByText("Toggled content")).not.toBeInTheDocument();
  });

  it("PopoverContent has rounded-xl and border classes", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
    await userEvent.click(screen.getByText("Open"));
    const content = screen.getByText("Content");
    expect(content).toHaveClass("rounded-xl", "border");
  });

  it("PopoverContent merges a custom className", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="custom-popover">Body</PopoverContent>
      </Popover>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Body")).toHaveClass("custom-popover");
  });

  it("renders content when open prop is set", () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Always open</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("Always open")).toBeInTheDocument();
  });

  it("PopoverAnchor renders without breaking layout", () => {
    render(
      <Popover>
        <PopoverAnchor>
          <div data-testid="anchor-child">anchor</div>
        </PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );
    expect(screen.getByTestId("anchor-child")).toBeInTheDocument();
  });
});
