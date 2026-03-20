import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

// Radix Select uses pointer capture APIs not available in JSDOM
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  // Radix Select also calls scrollIntoView when opening the dropdown
  Element.prototype.scrollIntoView = () => {};
});

describe("Select primitives", () => {
  it("renders the trigger with a placeholder", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("trigger renders with h-10 w-full classes", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="X" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveClass("h-10", "w-full");
  });

  it("trigger is disabled when the disabled prop is set", () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="X" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("trigger merges a custom className", () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue placeholder="X" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveClass("custom-trigger");
  });

  it("opens the listbox when the trigger is clicked", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
          <SelectItem value="b">Beta</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("calls onValueChange with the selected item's value", async () => {
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Alpha"));
    expect(onValueChange).toHaveBeenCalledWith("a");
  });

  it("displays the selected value in the trigger", () => {
    render(
      <Select defaultValue="b">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
          <SelectItem value="b">Beta</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("SelectLabel renders with font-semibold inside a SelectGroup", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="X" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>My Group</SelectLabel>
            <SelectItem value="a">Option A</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByText("My Group")).toHaveClass("font-semibold");
  });

  it("SelectSeparator renders with bg-muted class when content is open", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="X" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
          <SelectSeparator data-testid="sep" />
          <SelectItem value="b">B</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByTestId("sep")).toHaveClass("bg-muted");
  });
});
