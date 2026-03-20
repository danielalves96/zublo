import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings, Trash2, User } from "lucide-react";

import type { SidebarTabsLayoutItem } from "./SidebarTabsLayout";
import { SidebarTabsLayout } from "./SidebarTabsLayout";

type TabValue = "profile" | "settings" | "danger";

const items: SidebarTabsLayoutItem<TabValue>[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "settings", label: "Settings", icon: Settings },
  { value: "danger", label: "Delete Account", icon: Trash2, danger: true },
];

describe("SidebarTabsLayout", () => {
  it("renders the title and all nav items", () => {
    render(
      <SidebarTabsLayout
        title="Account"
        activeValue="profile"
        items={items}
        onValueChange={() => {}}
      >
        <div />
      </SidebarTabsLayout>,
    );
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
  });

  it("renders children inside the main content area", () => {
    render(
      <SidebarTabsLayout
        title="T"
        activeValue="profile"
        items={items}
        onValueChange={() => {}}
      >
        <p>main content here</p>
      </SidebarTabsLayout>,
    );
    expect(screen.getByText("main content here")).toBeInTheDocument();
  });

  it("calls onValueChange with the clicked item value", async () => {
    const onValueChange = vi.fn();
    render(
      <SidebarTabsLayout
        title="T"
        activeValue="profile"
        items={items}
        onValueChange={onValueChange}
      >
        <div />
      </SidebarTabsLayout>,
    );
    await userEvent.click(screen.getByText("Settings"));
    expect(onValueChange).toHaveBeenCalledWith("settings");
  });

  it("applies active primary styles to the current non-danger tab", () => {
    render(
      <SidebarTabsLayout
        title="T"
        activeValue="profile"
        items={items}
        onValueChange={() => {}}
      >
        <div />
      </SidebarTabsLayout>,
    );
    const activeButton = screen.getByText("Profile").closest("button");
    expect(activeButton).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("applies destructive styles to the active danger tab", () => {
    render(
      <SidebarTabsLayout
        title="T"
        activeValue="danger"
        items={items}
        onValueChange={() => {}}
      >
        <div />
      </SidebarTabsLayout>,
    );
    const dangerButton = screen.getByText("Delete Account").closest("button");
    expect(dangerButton).toHaveClass("bg-destructive/10", "text-destructive");
  });

  it("applies muted styles to inactive tabs", () => {
    render(
      <SidebarTabsLayout
        title="T"
        activeValue="profile"
        items={items}
        onValueChange={() => {}}
      >
        <div />
      </SidebarTabsLayout>,
    );
    const inactiveButton = screen.getByText("Settings").closest("button");
    expect(inactiveButton).toHaveClass("text-muted-foreground");
  });
});
