import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RemindersEditor } from "./RemindersEditor";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

describe("RemindersEditor", () => {
  it("shows the empty state and adds a default reminder", async () => {
    const onChange = vi.fn();

    render(<RemindersEditor reminders={[]} onChange={onChange} />);

    expect(screen.getByText("No reminders. Add at least one to receive notifications.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith([{ days: 1, hour: 8 }]);
  });

  it("updates and removes existing reminders", async () => {
    const onChange = vi.fn();

    render(
      <RemindersEditor
        reminders={[
          { days: 3, hour: 8 },
          { days: 1, hour: 12 },
        ]}
        onChange={onChange}
      />,
    );

    const selects = screen.getAllByTestId("mock-select");
    await userEvent.selectOptions(selects[0], "7");
    await userEvent.selectOptions(selects[1], "10");
    await userEvent.click(screen.getAllByRole("button")[1]);

    expect(onChange).toHaveBeenNthCalledWith(
      1,
      [
        { days: 7, hour: 8 },
        { days: 1, hour: 12 },
      ],
    );
    expect(onChange).toHaveBeenNthCalledWith(
      2,
      [
        { days: 3, hour: 10 },
        { days: 1, hour: 12 },
      ],
    );
    expect(onChange).toHaveBeenNthCalledWith(3, [{ days: 1, hour: 12 }]);
  });
});
