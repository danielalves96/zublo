import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenu primitives", () => {
  it("renders items in the content after trigger click", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("calls the item's onSelect handler when an item is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Click me</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    await userEvent.click(screen.getByText("Click me"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("DropdownMenuLabel renders with font-semibold", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Section</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Section")).toHaveClass("font-semibold");
  });

  it("DropdownMenuSeparator renders with bg-muted class", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>A</DropdownMenuItem>
          <DropdownMenuSeparator data-testid="sep" />
          <DropdownMenuItem>B</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByTestId("sep")).toHaveClass("bg-muted");
  });

  it("DropdownMenuShortcut renders with opacity-60", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Action <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("⌘K")).toHaveClass("opacity-60");
  });

  it("DropdownMenuCheckboxItem renders with a check indicator when checked", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked onCheckedChange={() => {}}>
            Checked option
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    const item = screen.getByText("Checked option");
    expect(item).toBeInTheDocument();
    // When checked, aria-checked should be true
    expect(item.closest("[role='menuitemcheckbox']")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("DropdownMenuCheckboxItem has aria-checked false when unchecked", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => {}}>
            Unchecked option
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(
      screen
        .getByText("Unchecked option")
        .closest("[role='menuitemcheckbox']"),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("DropdownMenuRadioItem marks the selected item with aria-checked", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="b">
            <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(
      screen.getByText("Option A").closest("[role='menuitemradio']"),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText("Option B").closest("[role='menuitemradio']"),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("DropdownMenuItem applies pl-8 when inset is set", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem inset>Inset item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Inset item")).toHaveClass("pl-8");
  });

  it("DropdownMenuSubTrigger shows a sub-menu trigger with ChevronRight", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("More options")).toBeInTheDocument();
  });

  it("DropdownMenuSubTrigger applies pl-8 when inset is set", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>Inset sub trigger</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Inset sub trigger")).toHaveClass("pl-8");
  });

  it("DropdownMenuLabel applies pl-8 when inset is set", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Label</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Label")).toHaveClass("pl-8");
  });
});
