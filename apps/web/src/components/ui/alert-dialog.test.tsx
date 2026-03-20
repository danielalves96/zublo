import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

describe("AlertDialog primitives", () => {
  it("AlertDialogHeader renders with flex flex-col layout", () => {
    const { container } = render(
      <AlertDialogHeader>header</AlertDialogHeader>,
    );
    expect(container.firstChild).toHaveClass("flex", "flex-col");
  });

  it("AlertDialogFooter renders with flex layout", () => {
    const { container } = render(
      <AlertDialogFooter>footer</AlertDialogFooter>,
    );
    expect(container.firstChild).toHaveClass("flex");
  });

  it("AlertDialogHeader merges a custom className", () => {
    const { container } = render(
      <AlertDialogHeader className="custom-h">h</AlertDialogHeader>,
    );
    expect(container.firstChild).toHaveClass("custom-h");
  });

  it("AlertDialogFooter merges a custom className", () => {
    const { container } = render(
      <AlertDialogFooter className="custom-f">f</AlertDialogFooter>,
    );
    expect(container.firstChild).toHaveClass("custom-f");
  });

  it("renders content into the portal when open", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Alert Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(document.body).toHaveTextContent("Alert Title");
  });

  it("does not render content when closed", () => {
    render(
      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogTitle>Hidden</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("AlertDialogTitle renders with font-semibold class", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Title Text</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Title Text")).toHaveClass("font-semibold");
  });

  it("AlertDialogDescription renders with text-muted-foreground class", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogDescription>Desc text</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Desc text")).toHaveClass("text-muted-foreground");
  });

  it("AlertDialogAction renders with primary button class", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Confirm")).toHaveClass("bg-primary");
  });

  it("AlertDialogCancel renders with outline button class", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Cancel")).toHaveClass("border");
  });

  it("opens when the trigger is clicked", async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open alert</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Opened!</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.queryByText("Opened!")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Open alert"));
    expect(screen.getByText("Opened!")).toBeInTheDocument();
  });

  it("AlertDialogAction merges a custom className", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogAction className="custom-action">Go</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Go")).toHaveClass("custom-action");
  });

  it("AlertDialogCancel merges a custom className", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogCancel className="custom-cancel">Back</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Back")).toHaveClass("custom-cancel");
  });

  it("AlertDialogTitle merges a custom className", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle className="custom-title">CT</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("CT")).toHaveClass("custom-title");
  });

  it("AlertDialogDescription merges a custom className", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogDescription className="custom-desc">
            CD
          </AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("CD")).toHaveClass("custom-desc");
  });
});
