import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

import { SubscriptionsPageHeader } from "./SubscriptionsPageHeader";

describe("SubscriptionsPageHeader", () => {
  it("triggers create, import, and export actions", () => {
    const onImportChange = vi.fn();
    const onExport = vi.fn();
    const onCreate = vi.fn();
    const importInputRef = {
      current: null,
    };

    const { container } = render(
      <SubscriptionsPageHeader
        importInputRef={importInputRef}
        isImporting={false}
        onImportChange={onImportChange}
        onExport={onExport}
        onCreate={onCreate}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "import" }));
    fireEvent.click(screen.getByText("export_json"));
    fireEvent.click(screen.getByText("export_xlsx"));
    fireEvent.click(screen.getByRole("button", { name: "add_subscription" }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledWith("json");
    expect(onExport).toHaveBeenCalledWith("xlsx");
    expect(onCreate).toHaveBeenCalledTimes(1);

    fireEvent.change(input, {
      target: {
        files: [
          new File(['{"subscriptions":[]}'], "import.json", {
            type: "application/json",
          }),
        ],
      },
    });

    expect(onImportChange).toHaveBeenCalledTimes(1);
  });

  it("shows the importing state", () => {
    const importInputRef = { current: null };

    render(
      <SubscriptionsPageHeader
        importInputRef={importInputRef}
        isImporting
        onImportChange={vi.fn()}
        onExport={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "importing" })).toBeDisabled();
  });
});
