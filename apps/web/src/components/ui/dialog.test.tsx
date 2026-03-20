import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

describe("Dialog primitives", () => {
  it("DialogHeader renders with flex flex-col layout", () => {
    const { container } = render(<DialogHeader>header</DialogHeader>);
    expect(container.firstChild).toHaveClass("flex", "flex-col");
  });

  it("DialogFooter renders with flex layout", () => {
    const { container } = render(<DialogFooter>footer</DialogFooter>);
    expect(container.firstChild).toHaveClass("flex");
  });

  it("DialogHeader merges a custom className", () => {
    const { container } = render(
      <DialogHeader className="custom-header">h</DialogHeader>,
    );
    expect(container.firstChild).toHaveClass("custom-header");
  });

  it("DialogFooter merges a custom className", () => {
    const { container } = render(
      <DialogFooter className="custom-footer">f</DialogFooter>,
    );
    expect(container.firstChild).toHaveClass("custom-footer");
  });

  it("renders content into the portal when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Portal Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(document.body).toHaveTextContent("Portal Title");
  });

  it("does not render content when closed", () => {
    render(
      <Dialog>
        <DialogContent>
          <DialogTitle>Closed Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Closed Title")).not.toBeInTheDocument();
  });

  it("DialogTitle renders with font-semibold class", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>My Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("My Title")).toHaveClass("font-semibold");
  });

  it("DialogDescription renders with text-muted-foreground class", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription>Some description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Some description")).toHaveClass(
      "text-muted-foreground",
    );
  });

  it("renders a sr-only Close button inside content", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("opens the dialog when the trigger is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Opened</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Opened")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Open dialog"));
    expect(screen.getByText("Opened")).toBeInTheDocument();
  });

  it("closes the dialog on Escape key press", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Will close</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Will close")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Will close")).not.toBeInTheDocument();
  });

  it("DialogTitle merges a custom className", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="custom-title">T</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("T")).toHaveClass("custom-title");
  });

  it("DialogDescription merges a custom className", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription className="custom-desc">D</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("D")).toHaveClass("custom-desc");
  });
});
